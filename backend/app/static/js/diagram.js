/* ─── Tissue AI · Infinite-Canvas Diagram ─────────────────────────────────
   Pan: pointer-drag on background + middle-mouse anywhere
   Zoom: scroll-wheel (zooms toward cursor)
   Export: ALWAYS captures full diagram bounds, not viewport
   ──────────────────────────────────────────────────────────────────────── */
(() => {

  /* Brave/Chromium: tiny pointer jitter can “arm” node-drag before the 2nd click; keep threshold generous. */
  const NODE_DRAG_THRESHOLD_PX2 = 12 * 12;
  /** `click`(detail=2) and `dblclick` often fire together — avoid two prompts. */
  const LABEL_EDIT_DEDUP_MS = 180;

  /* ── SVG helpers ── */
  const NS = 'http://www.w3.org/2000/svg';
  function svgEl(tag, attrs = {}) {
    const el = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v != null) el.setAttribute(k, String(v));
    }
    return el;
  }

  function jsonAttr(node, key, fallback) {
    try { const r = node.dataset[key]; return r ? JSON.parse(r) : fallback; }
    catch { return fallback; }
  }

  function isHexColor(s) {
    if (typeof s !== 'string') return false;
    const t = s.trim();
    if (!t.startsWith('#')) return false;
    const h = t.slice(1);
    if (!/^[0-9a-fA-F]+$/.test(h)) return false;
    return [3, 4, 6, 8].includes(h.length);
  }

  /** Accept #hex, rgb()/hsl(), named colors — anything the browser accepts as a CSS color. */
  function normalizeCssColor(s) {
    if (typeof s !== 'string') return null;
    const t = s.trim();
    if (!t) return null;
    if (isHexColor(t)) return t;
    if (typeof CSS !== 'undefined' && typeof CSS.supports === 'function' && CSS.supports('color', t)) return t;
    return null;
  }

  function finiteNum(v) {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim() !== '') {
      const n = parseFloat(v);
      if (Number.isFinite(n)) return n;
    }
    return null;
  }

  /** Normalize label/style/position overrides: DB may store string (label only) or { label, fill, x, y, ... } */
  function applyNodeOverrides(baseNode, overrides) {
    const ov = overrides[baseNode.id];
    let label = baseNode.label;
    let fill = baseNode.fill;
    let stroke = baseNode.stroke;
    let textColor = baseNode.textColor;
    let x = baseNode.x;
    let y = baseNode.y;
    if (typeof ov === 'string') {
      label = ov;
    } else if (ov && typeof ov === 'object') {
      if (typeof ov.label === 'string' && ov.label.trim()) label = ov.label.trim();
      const nf = normalizeCssColor(ov.fill);
      const ns = normalizeCssColor(ov.stroke);
      const nt = normalizeCssColor(ov.textColor);
      if (nf) fill = nf;
      if (ns) stroke = ns;
      if (nt) textColor = nt;
      const ox = finiteNum(ov.x);
      const oy = finiteNum(ov.y);
      if (ox != null) x = ox;
      if (oy != null) y = oy;
    }
    return { ...baseNode, label, fill, stroke, textColor, x, y };
  }

  function setOverrideEntry(overrides, id, patch) {
    const cur = overrides[id];
    const merged =
      typeof cur === 'string' ? { label: cur, ...patch } :
      cur && typeof cur === 'object' ? { ...cur, ...patch } :
      { ...patch };
    ['fill', 'stroke', 'textColor'].forEach(k => {
      if (merged[k] === '' || merged[k] == null) delete merged[k];
    });
    if (merged.label != null && String(merged.label).trim() === '') delete merged.label;
    const keys = Object.keys(merged);
    if (!keys.length) {
      delete overrides[id];
      return;
    }
    if (keys.length === 1 && keys[0] === 'label' && typeof merged.label === 'string') {
      overrides[id] = merged.label;
      return;
    }
    overrides[id] = merged;
  }

  /* ── Shape geometry ── */
  const SIZES = {
    diamond: [220, 110], circle: [130, 130], ellipse: [130, 130],
    star: [150, 150], hexagon: [170, 100], pentagon: [170, 100],
    octagon: [170, 100], cylinder: [180, 90], startEnd: [180, 62],
    parallelogram: [210, 68], trapezoid: [210, 68], triangle: [160, 100],
    cloud: [200, 110],
  };
  function nodeSize(s) { const d = SIZES[s] || [210, 72]; return { w: d[0], h: d[1] }; }

  function poly(cx, cy, r, n, a0) {
    const p = [];
    for (let i = 0; i < n; i++) { const a = a0 + 2 * Math.PI * i / n; p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
    return p;
  }
  function star(cx, cy, oR, iR, pts) {
    const p = [];
    for (let i = 0; i < pts * 2; i++) { const a = Math.PI * i / pts - Math.PI / 2; const r = i % 2 === 0 ? oR : iR; p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
    return p;
  }
  function pts2d(pts) { return pts.map((p, i) => `${i ? 'L' : 'M'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ') + ' Z'; }

  function shapePath(shape, cx, cy, w, h) {
    const x = cx - w / 2, y = cy - h / 2;
    switch (shape) {
      case 'rectangle':     return `M ${x} ${y} h ${w} v ${h} h ${-w} Z`;
      case 'roundedRect':   { const r = Math.min(12, w * .12, h * .25); return `M ${x + r} ${y} h ${w - 2*r} a ${r} ${r} 0 0 1 ${r} ${r} v ${h - 2*r} a ${r} ${r} 0 0 1 ${-r} ${r} h ${-(w - 2*r)} a ${r} ${r} 0 0 1 ${-r} ${-r} v ${-(h - 2*r)} a ${r} ${r} 0 0 1 ${r} ${-r} Z`; }
      case 'startEnd':      { const r = h / 2; if (w <= h + 4) return `M ${cx-r} ${cy} a ${r} ${r} 0 1 1 ${2*r} 0 a ${r} ${r} 0 1 1 ${-2*r} 0`; return `M ${x+r} ${y} h ${w-2*r} a ${r} ${r} 0 0 1 0 ${h} h ${-(w-2*r)} a ${r} ${r} 0 0 1 0 ${-h} Z`; }
      case 'circle':        { const r = Math.min(w,h) / 2; return `M ${cx-r} ${cy} a ${r} ${r} 0 1 1 ${2*r} 0 a ${r} ${r} 0 1 1 ${-2*r} 0`; }
      case 'ellipse':       { const rx = w/2, ry = h/2; return `M ${cx-rx} ${cy} a ${rx} ${ry} 0 1 1 ${2*rx} 0 a ${rx} ${ry} 0 1 1 ${-2*rx} 0`; }
      case 'diamond':       return `M ${cx} ${y} L ${x+w} ${cy} L ${cx} ${y+h} L ${x} ${cy} Z`;
      case 'hexagon':       return pts2d(poly(cx, cy, Math.min(w,h)/2, 6, 0));
      case 'pentagon':      return pts2d(poly(cx, cy, Math.min(w,h)/2, 5, -Math.PI/2));
      case 'octagon':       return pts2d(poly(cx, cy, Math.min(w,h)/2, 8, Math.PI/8));
      case 'parallelogram': { const s = w*.2; return `M ${x+s} ${y} L ${x+w} ${y} L ${x+w-s} ${y+h} L ${x} ${y+h} Z`; }
      case 'trapezoid':     { const i = w*.18; return `M ${x+i} ${y} L ${x+w-i} ${y} L ${x+w} ${y+h} L ${x} ${y+h} Z`; }
      case 'triangle':      return `M ${cx} ${y} L ${x+w} ${y+h} L ${x} ${y+h} Z`;
      case 'star':          return pts2d(star(cx, cy, Math.min(w,h)/2, Math.min(w,h)/2*.42, 5));
      case 'cloud':         { const s = Math.min(w,h), bx = x+w*.12, by = y+h*.72; return `M ${bx} ${by} a ${s*.2} ${s*.2} 0 0 1 ${-s*.02} ${-s*.38} a ${s*.22} ${s*.22} 0 0 1 ${s*.3} ${-s*.24} a ${s*.25} ${s*.25} 0 0 1 ${s*.4} ${-s*.02} a ${s*.18} ${s*.18} 0 0 1 ${s*.28} ${s*.14} a ${s*.15} ${s*.15} 0 0 1 ${s*.06} ${s*.3} a ${s*.05} ${s*.05} 0 0 1 ${s*.02} ${s*.12} Z`; }
      default:              return `M ${x} ${y} h ${w} v ${h} h ${-w} Z`;
    }
  }

  function edgeAnchor(cx, cy, w, h, tx, ty) {
    const dx = tx - cx, dy = ty - cy;
    return Math.abs(dy) > Math.abs(dx)
      ? (dy > 0 ? { x: cx, y: cy + h/2 } : { x: cx, y: cy - h/2 })
      : (dx > 0 ? { x: cx + w/2, y: cy } : { x: cx - w/2, y: cy });
  }

  function bounds(nodes, pad = 0) {
    if (!nodes.length) return { x: -400, y: -260, w: 800, h: 520 };
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    for (const n of nodes) {
      x1 = Math.min(x1, n.x - n.w/2);
      y1 = Math.min(y1, n.y - n.h/2);
      x2 = Math.max(x2, n.x + n.w/2);
      y2 = Math.max(y2, n.y + n.h/2);
    }
    return { x: x1 - pad, y: y1 - pad, w: x2 - x1 + pad*2, h: y2 - y1 + pad*2 };
  }

  function downloadBlob(b, fn) {
    const u = URL.createObjectURL(b);
    const a = Object.assign(document.createElement('a'), { href: u, download: fn });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(u);
  }

  /* ═══════════════════════════════════════════════════════════════
     INFINITE CANVAS CONTROLLER
     ═══════════════════════════════════════════════════════════════ */

  class InfiniteCanvas {
    constructor(widget) {
      this.widget   = widget;
      this.el       = widget.querySelector('[data-diagram-canvas]');
      this.diagramId   = widget.dataset.diagramId;
      this.versionId   = widget.dataset.versionId;
      this.diagramType = widget.dataset.diagramType || 'flowchart';
      this.layout      = jsonAttr(widget, 'layout', { nodes: [], edges: [] });
      this.overrides   = jsonAttr(widget, 'overrides', {});
      this.svg       = null;

      /* Camera: panX/panY = world-coordinate offset of the viewport center.
         zoom = how many world-units fit in 1000 virtual units
         Higher zoom = more zoomed in. */
      this.panX = 0;
      this.panY = 0;
      this.zoom = 1;

      /* Drag state */
      this._drag   = false;
      this._startX = 0;
      this._startY = 0;
      this._startPanX = 0;
      this._startPanY = 0;

      /** @type {null | { id: string, pointerId: number, x0: number, y0: number, cx0: number, cy0: number, active: boolean }} */
      this._nodeDrag = null;
      this._onDocNodeMove = this._handleNodeDragMove.bind(this);
      this._onDocNodeUp = this._handleNodeDragEnd.bind(this);
      this._onDiagramClick = this._onDiagramClick.bind(this);
      this._onDiagramContextMenu = this._onDiagramContextMenu.bind(this);
      /** @type {null | { id: string, t: number }} fallback when `click.detail` never reaches 2 (some SVG + Brave builds) */
      this._labelTapCandidate = null;
      /** @type {ReturnType<typeof setTimeout> | null} */
      this._labelTapClearTimer = null;
      this._lastLabelEditAt = 0;
      this._nodeEditor = null;
      this._nodeEditorFields = null;
      this._editingNodeId = null;

      this._initToolbar();
      this._ensureNodeEditor();
      this._initPointerEvents();
      this._fitContent();
      this._render();
    }

    /* ── Computed viewBox ── */
    _viewBox() {
      const rect = this.el.getBoundingClientRect();
      const aspect = rect.width / Math.max(rect.height, 1);
      const h = 800 / this.zoom;   // virtual height
      const w = h * aspect;
      return {
        x: this.panX - w / 2,
        y: this.panY - h / 2,
        w, h,
      };
    }

    _ensureNodeEditor() {
      if (this._nodeEditor) return;

      const overlay = document.createElement('div');
      /* Do NOT put display:flex in inline styles while using [hidden] — many engines let inline display beat hidden, so the panel flashes visible. */
      overlay.hidden = true;
      overlay.setAttribute('aria-hidden', 'true');
      overlay.style.cssText = [
        'position:absolute',
        'inset:0',
        'display:none',
        'align-items:center',
        'justify-content:center',
        'padding:16px',
        'background:rgba(10,10,14,0.58)',
        'backdrop-filter:blur(3px)',
        'z-index:9999',
      ].join(';');

      const panel = document.createElement('form');
      panel.style.cssText = [
        'width:min(100%, 360px)',
        'display:flex',
        'flex-direction:column',
        'gap:12px',
        'padding:16px',
        'border:1px solid rgba(148,163,184,0.22)',
        'border-radius:16px',
        'background:#17171c',
        'box-shadow:0 20px 60px rgba(0,0,0,0.42)',
        'color:#f5f5f5',
        'font:13px/1.4 Inter,system-ui,sans-serif',
      ].join(';');

      const title = document.createElement('div');
      title.textContent = 'Edit node';
      title.style.cssText = 'font-weight:700;font-size:14px;letter-spacing:0.01em';
      panel.appendChild(title);

      const nameLabel = document.createElement('label');
      nameLabel.style.cssText = 'display:flex;flex-direction:column;gap:6px';
      nameLabel.innerHTML = '<span style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#a1a1aa">Name</span>';
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.maxLength = 120;
      nameInput.style.cssText = 'height:38px;padding:0 12px;border-radius:10px;border:1px solid #333848;background:#0f1118;color:#f5f5f5;outline:none';
      nameLabel.appendChild(nameInput);
      panel.appendChild(nameLabel);

      const colorGrid = document.createElement('div');
      colorGrid.style.cssText = 'display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px';

      const makeColorField = (labelText) => {
        const wrap = document.createElement('label');
        wrap.style.cssText = 'display:flex;flex-direction:column;gap:6px';
        wrap.innerHTML = `<span style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#a1a1aa">${labelText}</span>`;

        const row = document.createElement('div');
        row.style.cssText = 'display:flex;flex-direction:column;gap:6px';

        const input = document.createElement('input');
        input.type = 'color';
        input.value = '#000000';
        input.dataset.active = '0';
        input.style.cssText = 'width:100%;height:38px;padding:4px;border-radius:10px;border:1px solid #333848;background:#0f1118;cursor:pointer;opacity:0.55';

        const clear = document.createElement('button');
        clear.type = 'button';
        clear.textContent = 'Reset';
        clear.style.cssText = 'height:30px;padding:0 10px;border-radius:10px;border:1px solid #333848;background:#11131a;color:#d4d4d8;font-size:11px;cursor:pointer';

        row.appendChild(input);
        row.appendChild(clear);
        wrap.appendChild(row);
        colorGrid.appendChild(wrap);

        return { input, clear };
      };

      const fillField = makeColorField('Fill');
      const strokeField = makeColorField('Border');
      const textField = makeColorField('Text');
      panel.appendChild(colorGrid);

      const hint = document.createElement('div');
      hint.textContent = 'Reset removes a custom node color and falls back to the diagram default.';
      hint.style.cssText = 'font-size:11px;color:#a1a1aa';
      panel.appendChild(hint);

      const actions = document.createElement('div');
      actions.style.cssText = 'display:flex;justify-content:flex-end;gap:8px';

      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.cssText = 'height:38px;padding:0 14px;border-radius:10px;border:1px solid #333848;background:#11131a;color:#e4e4e7;cursor:pointer';

      const saveBtn = document.createElement('button');
      saveBtn.type = 'submit';
      saveBtn.textContent = 'Save';
      saveBtn.style.cssText = 'height:38px;padding:0 16px;border-radius:10px;border:1px solid #7c3aed;background:#e9d5ff;color:#111827;font-weight:700;cursor:pointer';

      actions.appendChild(cancelBtn);
      actions.appendChild(saveBtn);
      panel.appendChild(actions);
      overlay.appendChild(panel);
      this.widget.appendChild(overlay);

      const setField = (field, color) => {
        const active = isHexColor(color);
        field.input.value = active ? color : '#000000';
        field.input.dataset.active = active ? '1' : '0';
        field.input.style.opacity = active ? '1' : '0.55';
      };
      [fillField, strokeField, textField].forEach(field => {
        field.input.addEventListener('input', () => {
          field.input.dataset.active = '1';
          field.input.style.opacity = '1';
        });
        field.clear.addEventListener('click', () => {
          field.input.dataset.active = '0';
          field.input.style.opacity = '0.55';
        });
      });

      cancelBtn.addEventListener('click', () => this._closeNodeEditor());
      overlay.addEventListener('click', e => {
        if (e.target === overlay) this._closeNodeEditor();
      });
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && !overlay.hidden) this._closeNodeEditor();
      });

      panel.addEventListener('submit', async e => {
        e.preventDefault();
        const idStr = String(this._editingNodeId ?? '');
        const node = this._nodes().find(n => String(n.id) === idStr);
        const baseNode = (this.layout.nodes || []).find(n => String(n.id) === idStr);
        if (!node || !idStr) {
          this._closeNodeEditor();
          return;
        }

        const nextLabel = nameInput.value.trim();
        const patch = {};
        const curLabel = String(node.label || '').trim();
        if (nextLabel !== curLabel) patch.label = nextLabel;

        const curRaw = this.overrides[String(node.id)];
        const curObj =
          typeof curRaw === 'string' ? { label: curRaw } :
          curRaw && typeof curRaw === 'object' ? { ...curRaw } : {};

        const addColorPatch = (field, key, baseVal) => {
          const baseStr = baseVal != null ? String(baseVal) : '';
          if (field.input.dataset.active === '1') {
            const v = normalizeCssColor(field.input.value);
            if (v && v !== baseStr) patch[key] = v;
          } else if (Object.prototype.hasOwnProperty.call(curObj, key) && curObj[key] != null) {
            patch[key] = null;
          }
        };
        addColorPatch(fillField, 'fill', baseNode?.fill);
        addColorPatch(strokeField, 'stroke', baseNode?.stroke);
        addColorPatch(textField, 'textColor', baseNode?.textColor);

        if (!Object.keys(patch).length) {
          this._closeNodeEditor();
          return;
        }

        setOverrideEntry(this.overrides, String(node.id), patch);

        saveBtn.disabled = true;
        saveBtn.style.opacity = '0.65';
        try {
          await this._persistOverrides();
          this._closeNodeEditor();
          this._render();
        } catch (err) {
          window.alert(`Could not save node changes: ${err?.message || err}`);
        } finally {
          saveBtn.disabled = false;
          saveBtn.style.opacity = '1';
        }
      });

      this._nodeEditor = overlay;
      this._nodeEditorFields = { nameInput, fillField, strokeField, textField, setField };
    }

    _closeNodeEditor() {
      if (!this._nodeEditor) return;
      this._nodeEditor.hidden = true;
      this._nodeEditor.style.display = 'none';
      this._nodeEditor.setAttribute('aria-hidden', 'true');
      this._editingNodeId = null;
      this._lastLabelEditAt = 0;
    }

    _onDiagramClick(e) {
      if (e.isTrusted === false) return;
      if (!(e.target instanceof Element)) return;
      const g = e.target.closest('[data-node-id]');
      if (!g) return;
      const id = g.getAttribute('data-node-id');
      if (!id) return;
      const node = this._nodes().find(n => String(n.id) === String(id));
      if (!node) return;

      const now = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
      if (e.detail === 2) {
        e.preventDefault();
        e.stopPropagation();
        if (this._labelTapClearTimer) clearTimeout(this._labelTapClearTimer);
        this._labelTapClearTimer = null;
        this._labelTapCandidate = null;
        void this._openNodeLabelEditor(node);
        return;
      }
      if (e.detail === 1) {
        const prev = this._labelTapCandidate;
        if (prev && String(prev.id) === String(node.id) && (now - prev.t) < 480) {
          e.preventDefault();
          e.stopPropagation();
          if (this._labelTapClearTimer) clearTimeout(this._labelTapClearTimer);
          this._labelTapClearTimer = null;
          this._labelTapCandidate = null;
          void this._openNodeLabelEditor(node);
          return;
        }
        this._labelTapCandidate = { id: node.id, t: now };
        if (this._labelTapClearTimer) clearTimeout(this._labelTapClearTimer);
        this._labelTapClearTimer = setTimeout(() => {
          this._labelTapClearTimer = null;
          if (this._labelTapCandidate && String(this._labelTapCandidate.id) === String(node.id)) {
            this._labelTapCandidate = null;
          }
        }, 550);
      }
    }

    _onDiagramContextMenu(e) {
      if (e.isTrusted === false) return;
      if (!(e.target instanceof Element)) return;
      const g = e.target.closest('[data-node-id]');
      if (!g) return;
      e.preventDefault();
      e.stopPropagation();
      const id = g.getAttribute('data-node-id');
      if (!id) return;
      const node = this._nodes().find(n => String(n.id) === String(id));
      if (!node) return;
      if (this._labelTapClearTimer) clearTimeout(this._labelTapClearTimer);
      this._labelTapClearTimer = null;
      this._labelTapCandidate = null;
      void this._openNodeLabelEditor(node, { force: true });
    }

    async _openNodeLabelEditor(node, opts = {}) {
      const force = Boolean(opts && opts.force);
      const now = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
      if (!force && now - this._lastLabelEditAt < LABEL_EDIT_DEDUP_MS) return;
      this._lastLabelEditAt = now;
      this._ensureNodeEditor();
      this._editingNodeId = node.id;
      this._nodeEditorFields.nameInput.value = node.label || '';
      this._nodeEditorFields.setField(this._nodeEditorFields.fillField, node.fill);
      this._nodeEditorFields.setField(this._nodeEditorFields.strokeField, node.stroke);
      this._nodeEditorFields.setField(this._nodeEditorFields.textField, node.textColor);
      this._nodeEditor.hidden = false;
      this._nodeEditor.style.display = 'flex';
      this._nodeEditor.setAttribute('aria-hidden', 'false');
      this._nodeEditorFields.nameInput.focus();
      this._nodeEditorFields.nameInput.select();
    }

    _teardownNodeDragListeners() {
      document.removeEventListener('pointermove', this._onDocNodeMove, true);
      document.removeEventListener('pointerup', this._onDocNodeUp, true);
      document.removeEventListener('pointercancel', this._onDocNodeUp, true);
      this.el.style.cursor = '';
    }

    _handleNodeDragMove(e) {
      const nd = this._nodeDrag;
      if (!nd || e.pointerId !== nd.pointerId) return;
      const mdx = e.clientX - nd.cx0;
      const mdy = e.clientY - nd.cy0;
      if (!nd.active && (mdx * mdx + mdy * mdy) < NODE_DRAG_THRESHOLD_PX2) return;
      if (!nd.active) {
        nd.active = true;
        this.el.style.cursor = 'grabbing';
      }
      e.preventDefault();
      const rect = this.el.getBoundingClientRect();
      const vb = this._viewBox();
      const rw = Math.max(rect.width, 1);
      const rh = Math.max(rect.height, 1);
      const nx = nd.x0 + mdx * (vb.w / rw);
      const ny = nd.y0 + mdy * (vb.h / rh);
      setOverrideEntry(this.overrides, nd.id, { x: nx, y: ny });
      this._render();
    }

    async _handleNodeDragEnd(e) {
      const nd = this._nodeDrag;
      if (!nd || e.pointerId !== nd.pointerId) return;
      this._teardownNodeDragListeners();
      const moved = nd.active;
      this._nodeDrag = null;
      if (moved) {
        try {
          await this._persistOverrides();
        } catch {
          /* ignore */
        }
      }
    }

    _beginNodePointerDown(e, node) {
      if (e.button !== 0) return;
      // Do NOT preventDefault here — it suppresses click/dblclick in many browsers.
      if (this._nodeDrag) this._teardownNodeDragListeners();
      this._nodeDrag = {
        id: node.id,
        pointerId: e.pointerId,
        x0: node.x,
        y0: node.y,
        cx0: e.clientX,
        cy0: e.clientY,
        active: false,
      };
      document.addEventListener('pointermove', this._onDocNodeMove, true);
      document.addEventListener('pointerup', this._onDocNodeUp, true);
      document.addEventListener('pointercancel', this._onDocNodeUp, true);
    }

    /* ── Fit all content ── */
    _fitContent() {
      const nodes = this._nodes();
      const b = bounds(nodes, 80);
      this.panX = b.x + b.w / 2;
      this.panY = b.y + b.h / 2;

      const rect = this.el.getBoundingClientRect();
      const aspect = rect.width / Math.max(rect.height, 1);
      const zW = 800 * aspect / Math.max(b.w, 1);
      const zH = 800 / Math.max(b.h, 1);
      this.zoom = Math.max(0.05, Math.min(Math.min(zW, zH) * 0.9, 8));
    }

    /* ── Pointer events for pan & zoom ── */
    _initPointerEvents() {
      const el = this.el;

      el.addEventListener('pointerdown', e => {
        // Only drag on left-click or middle-click
        if (e.button !== 0 && e.button !== 1) return;
        // Left-click only: do not steal pointer from nodes (enables double-click edit). Middle-click pans everywhere.
        if (e.button === 0) {
          const t = e.target;
          if (t instanceof Element && t.closest?.('[data-node-id]')) return;
        }
        this._drag = true;
        this._startX = e.clientX;
        this._startY = e.clientY;
        this._startPanX = this.panX;
        this._startPanY = this.panY;
        el.setPointerCapture(e.pointerId);
        el.classList.add('dragging');
        e.preventDefault();
      });

      el.addEventListener('pointermove', e => {
        if (!this._drag) return;
        const dx = e.clientX - this._startX;
        const dy = e.clientY - this._startY;

        // Convert pixel delta → world delta
        const rect = el.getBoundingClientRect();
        const vb = this._viewBox();
        const sx = vb.w / rect.width;
        const sy = vb.h / rect.height;

        this.panX = this._startPanX - dx * sx;
        this.panY = this._startPanY - dy * sy;
        this._render();
      });

      const endDrag = () => {
        this._drag = false;
        el.classList.remove('dragging');
      };
      el.addEventListener('pointerup', endDrag);
      el.addEventListener('pointercancel', endDrag);

      // Scroll-wheel zoom (toward cursor position)
      el.addEventListener('wheel', e => {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.12 : 0.89;

        const rect = el.getBoundingClientRect();
        const vb = this._viewBox();

        // mouse in world coords
        const mx = vb.x + ((e.clientX - rect.left) / rect.width) * vb.w;
        const my = vb.y + ((e.clientY - rect.top) / rect.height) * vb.h;

        const oldZoom = this.zoom;
        this.zoom = Math.max(0.03, Math.min(this.zoom * factor, 12));

        // Keep the point under the cursor fixed
        const r = oldZoom / this.zoom;
        this.panX = mx + (this.panX - mx) * r;
        this.panY = my + (this.panY - my) * r;

        this._render();
      }, { passive: false });

      /* One delegated listener on the stable canvas shell — survives SVG rebuilds (pan/zoom) so double-click works in Brave. */
      this.el.addEventListener('click', this._onDiagramClick);
      this.el.addEventListener('contextmenu', this._onDiagramContextMenu);
    }

    /* ── Toolbar ── */
    _initToolbar() {
      this.widget.querySelectorAll('[data-diagram-action]').forEach(btn => {
        btn.addEventListener('click', () => {
          switch (btn.dataset.diagramAction) {
            case 'zoom-in':    this.zoom = Math.min(this.zoom * 1.35, 12); this._render(); break;
            case 'zoom-out':   this.zoom = Math.max(this.zoom * 0.7, 0.03); this._render(); break;
            case 'fit':        this._fitContent(); this._render(); break;
            case 'svg':        this._export('svg'); break;
            case 'png':        this._export('png'); break;
            case 'pdf':        this._export('pdf'); break;
            case 'regenerate': this._regenerate(); break;
          }
        });
      });
    }

    /* ── Effective nodes (with overrides + sizing) ── */
    _nodes() {
      return (this.layout.nodes || []).map(n => {
        const base = applyNodeOverrides(n, this.overrides);
        const sz = nodeSize(base.shape);
        return {
          ...base,
          w: base.w != null ? base.w : sz.w,
          h: base.h != null ? base.h : sz.h,
        };
      });
    }

    /* ── RENDER ── */
    _render() {
      const nodes = this._nodes();
      const edges = this.layout.edges || [];
      const map   = new Map(nodes.map(n => [n.id, n]));
      const vb    = this._viewBox();
      const vid   = this.versionId;

      const svg = svgEl('svg', {
        viewBox: `${vb.x} ${vb.y} ${vb.w} ${vb.h}`,
        width: '100%', height: '100%',
        preserveAspectRatio: 'xMidYMid meet',
        style: 'display:block;-webkit-user-select:none;user-select:none;',
      });

      const isMindmap = this.diagramType === 'mindmap';

      /* Defs */
      const defs = svgEl('defs');

      // Arrow marker — flowchart only (mindmap uses no arrowheads)
      if (!isMindmap) {
        const mk = svgEl('marker', { id: `a-${vid}`, markerWidth: 8, markerHeight: 7, refX: 7, refY: 3.5, orient: 'auto' });
        mk.appendChild(svgEl('path', { d: 'M 0 0 L 7 3.5 L 0 7 L 1.5 3.5 Z', fill: '#5a5565' }));
        defs.appendChild(mk);
      }

      // Shadow
      const flt = svgEl('filter', { id: `s-${vid}`, x: '-25%', y: '-25%', width: '150%', height: '150%', 'color-interpolation-filters': 'sRGB' });
      flt.appendChild(svgEl('feDropShadow', { dx: 0, dy: 2, stdDeviation: 6, 'flood-color': 'rgba(0,0,0,0.4)' }));
      defs.appendChild(flt);

      // Dot grid
      const dotId = `d-${vid}`;
      const pat = svgEl('pattern', { id: dotId, x: 0, y: 0, width: 24, height: 24, patternUnits: 'userSpaceOnUse' });
      pat.appendChild(svgEl('circle', { cx: 12, cy: 12, r: 0.7, fill: '#444', opacity: 0.3 }));
      defs.appendChild(pat);

      svg.appendChild(defs);

      /* Background (extends far beyond viewport for panning) */
      const P = 20000;
      const isLight = document.documentElement.classList.contains('light');
      const bgColor = isLight ? '#f5f5f5' : '#111018';
      svg.appendChild(svgEl('rect', { x: vb.x - P, y: vb.y - P, width: vb.w + P*2, height: vb.h + P*2, fill: bgColor }));
      svg.appendChild(svgEl('rect', { x: vb.x - P, y: vb.y - P, width: vb.w + P*2, height: vb.h + P*2, fill: `url(#${dotId})` }));

      /* Edges */
      const eg = svgEl('g');
      for (const e of edges) {
        const from = map.get(e.from), to = map.get(e.to);
        if (!from || !to) continue;
        const s = edgeAnchor(from.x, from.y, from.w, from.h, to.x, to.y);
        const d = edgeAnchor(to.x, to.y, to.w, to.h, from.x, from.y);
        const mx = (s.x+d.x)/2, my = (s.y+d.y)/2;

        let path;
        if (isMindmap) {
          // Smooth S-curve for mindmap, connecting node centers through control points
          const cx1 = s.x + (d.x - s.x) * 0.4;
          const cy1 = s.y;
          const cx2 = s.x + (d.x - s.x) * 0.6;
          const cy2 = d.y;
          path = `M ${s.x} ${s.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${d.x} ${d.y}`;
        } else {
          path = Math.abs(d.y-s.y) > Math.abs(d.x-s.x)
            ? `M ${s.x} ${s.y} C ${s.x} ${my}, ${d.x} ${my}, ${d.x} ${d.y}`
            : `M ${s.x} ${s.y} C ${mx} ${s.y}, ${mx} ${d.y}, ${d.x} ${d.y}`;
        }

        if (isMindmap) {
          eg.appendChild(svgEl('path', { d: path, fill: 'none', stroke: '#4338ca', 'stroke-width': 2.5, 'stroke-linecap': 'round', opacity: 0.5 }));
        } else {
          eg.appendChild(svgEl('path', { d: path, fill: 'none', stroke: '#4a4555', 'stroke-width': 1.5, 'stroke-linecap': 'round', opacity: 0.9, 'marker-end': `url(#a-${vid})` }));
        }

        if (e.label && !isMindmap) {
          eg.appendChild(svgEl('rect', { x: mx-30, y: my-9, width: 60, height: 18, rx: 8, fill: '#1a1824', stroke: '#333' }));
          const t = svgEl('text', { x: mx, y: my+3, 'text-anchor': 'middle', 'font-size': 10, 'font-family': 'Inter, system-ui, sans-serif', fill: '#888' });
          t.textContent = e.label;
          eg.appendChild(t);
        }
      }
      svg.appendChild(eg);

      /* Nodes */
      const ng = svgEl('g');
      for (const node of nodes) {
        const g = svgEl('g', {
          'data-node-id': node.id,
          style: 'cursor:grab;touch-action:none',
        });

        g.addEventListener('pointerdown', ev => this._beginNodePointerDown(ev, node));

        g.appendChild(svgEl('path', {
          d: shapePath(node.shape, node.x, node.y, node.w, node.h),
          fill: node.fill, stroke: node.stroke,
          'stroke-width': isMindmap ? 2.5 : 1.8,
          'stroke-linejoin': 'round',
          filter: `url(#s-${vid})`,
        }));

        // Icon abbrev — flowchart only
        if (!isMindmap) {
          const ic = svgEl('text', { x: node.x, y: node.y - 8, 'text-anchor': 'middle', 'font-size': 10, 'font-family': 'Inter, system-ui, sans-serif', fill: node.stroke, 'font-weight': 700 });
          ic.textContent = (node.icon || 'n').slice(0, 2).toUpperCase();
          g.appendChild(ic);
        }

        // Label
        const label = node.label || '';
        const words = label.split(/\s+/).filter(Boolean);
        const maxC = Math.max(9, Math.floor(node.w / 8));
        const lines = []; let cur = '';
        for (const w of words) {
          if (`${cur} ${w}`.trim().length > maxC && cur) { lines.push(cur.trim()); cur = w; }
          else cur = `${cur} ${w}`.trim();
        }
        if (cur) lines.push(cur);

        // Mindmap: vertically centered label; flowchart: offset up slightly for icon
        const labelY = isMindmap ? node.y : node.y + 9;
        const lineH  = isMindmap ? 16 : 18;
        const fsz    = isMindmap ? (node.mmFontSize || node.fontSize || 13) : (node.fontSize || 14);
        // Shift up for multiline centering
        const startDy = lines.length > 1 ? -(lines.length - 1) * lineH / 2 : 0;

        const txt = svgEl('text', { x: node.x, y: labelY + startDy, 'text-anchor': 'middle', 'font-size': fsz, 'font-family': `${node.fontFamily || 'Inter'}, system-ui, sans-serif`, fill: node.textColor, 'font-weight': isMindmap ? 600 : 700 });
        lines.forEach((l, i) => { const ts = svgEl('tspan', { x: node.x, dy: i === 0 ? 0 : lineH }); ts.textContent = l; txt.appendChild(ts); });
        g.appendChild(txt);

        ng.appendChild(g);
      }
      svg.appendChild(ng);

      this.el.innerHTML = '';
      this.el.appendChild(svg);
      this.svg = svg;
    }

    /* ── Persist label overrides ── */
    async _persistOverrides() {
      const res = await fetch(`/api/diagram-versions/${this.versionId}/labels`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overrides: this.overrides }),
      });
      if (!res.ok) {
        const err = await res.text().catch(() => '');
        throw new Error(err || `Save failed (${res.status})`);
      }
      this.widget.dataset.overrides = JSON.stringify(this.overrides);
    }

    /* ── Regenerate ── */
    async _regenerate() {
      const res = await fetch(`/api/diagrams/${this.diagramId}/regenerate`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) { alert('Failed to regenerate.'); return; }
      const data = await res.json();
      const diag = data.diagram || data.message?.diagram;
      if (!diag) return;

      this.versionId = diag.version_id;
      this.layout    = diag.layout_json;
      this.overrides = diag.overrides || {};
      this.widget.dataset.versionId = String(diag.version_id);
      this.widget.dataset.layout    = JSON.stringify(diag.layout_json);
      this.widget.dataset.overrides = JSON.stringify(this.overrides);

      const badge = this.widget.querySelector('.diagram-type');
      if (badge) badge.textContent = `${diag.diagram_type} · v${diag.version_no}`;

      this._fitContent();
      this._render();
    }

    /* ── EXPORT: always full diagram, never viewport ── */
    async _export(fmt) {
      const nodes = this._nodes();
      if (!nodes.length) return;

      // Full bounding box of all content
      const full = bounds(nodes, 60);

      // Clone current SVG, override viewBox to full bounds
      const clone = this.svg.cloneNode(true);
      clone.setAttribute('viewBox', `${full.x} ${full.y} ${full.w} ${full.h}`);
      clone.setAttribute('width', full.w);
      clone.setAttribute('height', full.h);

      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(clone)}`;

      if (fmt === 'svg') {
        downloadBlob(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }), 'diagram.svg');
        return;
      }

      try { await document.fonts?.ready; } catch {}

      const scale = 2;
      const img = new Image();
      const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }));
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
      URL.revokeObjectURL(url);

      const cvs = document.createElement('canvas');
      cvs.width = full.w * scale; cvs.height = full.h * scale;
      const ctx = cvs.getContext('2d');
      const bgColor = isLight ? '#f5f5f5' : '#111018';
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, cvs.width, cvs.height);
      ctx.drawImage(img, 0, 0, cvs.width, cvs.height);

      if (fmt === 'png') {
        cvs.toBlob(b => { if (b) downloadBlob(b, 'diagram.png'); }, 'image/png');
        return;
      }

      if (fmt === 'pdf' && window.jspdf?.jsPDF) {
        const pdf = new window.jspdf.jsPDF({
          orientation: full.w > full.h ? 'landscape' : 'portrait',
          unit: 'px', format: [full.w, full.h],
        });
        pdf.addImage(cvs.toDataURL('image/png'), 'PNG', 0, 0, full.w, full.h);
        pdf.save('diagram.pdf');
      }
    }
  }

  /* ── Init ── */
  function initWithin(root) {
    const scope = root?.querySelectorAll ? root : document;
    if (scope.classList?.contains('diagram-widget')) boot(scope);
    scope.querySelectorAll?.('.diagram-widget').forEach(boot);
  }
  function boot(w) {
    if (w.dataset.diagramReady === '1') return;
    w.dataset.diagramReady = '1';
    w.__ctrl = new InfiniteCanvas(w);
  }

  window.TissueDiagram = { initWithin };
})();
