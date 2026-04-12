'use client'
import { useEffect, useRef, useState } from 'react'
import { ZoomIn, ZoomOut, Maximize2, FileImage, FileText, RefreshCw } from 'lucide-react'
import { regenerateDiagram } from '@/lib/api'
import { cn } from '@/lib/utils'

declare global {
  interface Window {
    TissueDiagram?: {
      initWithin: (el: Element) => void
    }
    jspdf?: { jsPDF: unknown }
  }
}

interface Props {
  diagramId: string
  versionId: string
  diagramType: string
  versionNo: number
  layout: unknown
  overrides: Record<string, string | Record<string, string | number | undefined>>
  onRegenerate: () => void
}

export default function DiagramWidget({ diagramId, versionId, diagramType, versionNo, layout, overrides, onRegenerate }: Props) {
  const widgetRef = useRef<HTMLDivElement>(null)
  const [regenerating, setregenerating] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const el = widgetRef.current
    if (!el || !layout) return

    // Wait for diagram.js to load
    let attempts = 0
    const maxAttempts = 20
    const interval = setInterval(() => {
      attempts++
      if (window.TissueDiagram) {
        clearInterval(interval)
        window.TissueDiagram.initWithin(el)
        setReady(true)
      } else if (attempts >= maxAttempts) {
        clearInterval(interval)
        console.warn('diagram.js not loaded')
      }
    }, 150)

    return () => clearInterval(interval)
  }, [layout, versionId])

  function action(name: string) {
    const canvas = widgetRef.current?.querySelector('[data-diagram-canvas]')
    if (!canvas) return
    const btn = canvas.closest('.diagram-widget')?.querySelector(`[data-diagram-action="${name}"]`) as HTMLElement
    btn?.click()
    // Fallback: dispatch event
    canvas.dispatchEvent(new CustomEvent('diagram:action', { detail: name, bubbles: true }))
  }

  async function handleRegenerate() {
    if (regenerating) return
    setregenerating(true)
    try {
      await regenerateDiagram(diagramId)
      onRegenerate()
    } finally {
      setregenerating(false)
    }
  }

  return (
    <div
      ref={widgetRef}
      className="relative flex-1 min-h-0 flex flex-col overflow-hidden border-t border-border diagram-widget animate-fade-up"
      data-diagram-id={diagramId}
      data-version-id={versionId}
      data-diagram-type={diagramType}
      data-layout={JSON.stringify(layout)}
      data-overrides={JSON.stringify(overrides)}
    >
      {/* Toolbar */}
      <div className="shrink-0 flex items-center justify-between gap-2 px-3.5 py-1.5 bg-card border-b border-border h-10">
        <span className="font-mono text-[10px] font-medium uppercase tracking-wider text-primary bg-[var(--primary-dim)] border border-[var(--primary-ring)] px-2 py-0.5 rounded-full">
          {diagramType} · v{versionNo}
        </span>

        <div className="flex items-center gap-0.5">
          <ToolBtn icon={<ZoomIn className="w-3.5 h-3.5" />} title="Zoom in"    action="zoom-in"    onClick={() => action('zoom-in')} />
          <ToolBtn icon={<ZoomOut className="w-3.5 h-3.5" />} title="Zoom out"  action="zoom-out"   onClick={() => action('zoom-out')} />
          <ToolBtn icon={<Maximize2 className="w-3.5 h-3.5" />} title="Fit"     action="fit"        onClick={() => action('fit')} />
          <div className="w-px h-4 bg-border mx-1" />
          <ToolBtn icon={<FileText className="w-3.5 h-3.5" />} title="SVG"      action="svg"        onClick={() => action('svg')} />
          <ToolBtn icon={<FileImage className="w-3.5 h-3.5" />} title="PNG"     action="png"        onClick={() => action('png')} />
          <div className="w-px h-4 bg-border mx-1" />
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            title="Regenerate"
            data-diagram-action="regenerate"
            className="w-7 h-7 flex items-center justify-center rounded border border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground transition-all active:scale-90 disabled:opacity-50"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', regenerating && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        className={cn('flex-1 min-h-0 w-full relative overflow-hidden cursor-grab active:cursor-grabbing dot-grid transition-opacity duration-300', ready ? 'opacity-100' : 'opacity-0')}
        data-diagram-canvas
      />

      {/* Help bar */}
      <div className="shrink-0 flex items-center gap-2 px-3.5 py-1 bg-card border-t border-border font-mono text-[10px] text-muted-foreground/60">
        Drag empty canvas to pan · Drag a node to move it · Scroll to zoom ·
        <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[9px] text-foreground/60">Double-click</kbd>
        or
        <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[9px] text-foreground/60">Right-click</kbd>
        a node to edit name and colors
      </div>
    </div>
  )
}

function ToolBtn({ icon, title, action, onClick }: { icon: React.ReactNode; title: string; action: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={title}
      data-diagram-action={action}
      className="w-7 h-7 flex items-center justify-center rounded border border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground transition-all active:scale-90"
    >
      {icon}
    </button>
  )
}
