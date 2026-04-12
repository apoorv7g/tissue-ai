'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { listMessages, sendMessage, updateChat } from '@/lib/api'
import type { Message, Chat } from '@/lib/types'
import DiagramWidget from '@/components/diagram-widget'
import Composer from '@/components/composer'
import { Sun, Moon, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

const PROMPTS = [
  'How a neural network learns',
  'User signup flow',
  'Photosynthesis process',
  'CI/CD pipeline stages',
]

interface Props {
  // theme + toggle come from layout via context — we read them from the html class
}

export default function ChatPage(_: Props) {
  const { chatId } = useParams<{ chatId: string }>()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [styleOpen, setStyleOpen] = useState(false)
  const chatTitle = useRef<string>('')

  // Read theme from html element
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  useEffect(() => {
    const update = () => setTheme(document.documentElement.classList.contains('light') ? 'light' : 'dark')
    update()
    const obs = new MutationObserver(update)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.classList.toggle('light', next === 'light')
    setTheme(next)
    updateChat(chatId, { theme_mode: next }).catch(() => {})
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const items = await listMessages(chatId)
      setMessages(items)
    } finally {
      setLoading(false)
    }
  }, [chatId])

  useEffect(() => { load() }, [load])

  // Find the last message with a diagram
  const diagramMessage = [...messages].reverse().find(m => m.diagram)

  async function handleSend(content: string, diagramType: 'flowchart' | 'mindmap', apiKey: string) {
    setSending(true)
    try {
      const updated = await sendMessage(chatId, content, diagramType, apiKey)
      setMessages(updated)
    } finally {
      setSending(false)
    }
  }

  function handlePill(text: string) {
    // Composer picks this up via a data attribute trick; we use a custom event
    window.dispatchEvent(new CustomEvent('tissue:fill-composer', { detail: text }))
  }

  const diagram = diagramMessage?.diagram

  return (
    <div key={chatId} className="flex flex-col h-full overflow-hidden animate-fade-up">
      {/* Header */}
      <header className="flex items-center justify-between gap-4 px-5 h-[50px] shrink-0 bg-card border-b border-border">
        <h1 className="text-sm font-semibold text-foreground truncate">
          {messages[0] ? (messages[0].content.slice(0, 48) + (messages[0].content.length > 48 ? '…' : '')) : 'New Chat'}
        </h1>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={toggleTheme}
            title="Toggle theme"
            className="w-7 h-7 flex items-center justify-center rounded border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-all active:scale-95"
          >
            {theme === 'dark'
              ? <Sun className="w-3.5 h-3.5" />
              : <Moon className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => setStyleOpen(o => !o)}
            className={cn(
              'h-7 px-2.5 flex items-center gap-1.5 rounded border text-xs font-medium transition-all active:scale-95',
              styleOpen
                ? 'bg-[var(--primary-dim)] border-[var(--primary-ring)] text-primary'
                : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <SlidersHorizontal className="w-3 h-3" />
            Style
          </button>
        </div>
      </header>

      {/* Style drawer */}
      {styleOpen && (
        <StyleDrawer chatId={chatId} onClose={() => setStyleOpen(false)} />
      )}

      {/* Content area */}
      <div className="flex-1 min-h-0 flex flex-col">
        {loading ? (
          <div className="flex-1 dot-grid" />
        ) : diagram ? (
          <DiagramWidget
            key={diagram.version_id}
            diagramId={diagram.diagram_id}
            versionId={diagram.version_id}
            diagramType={diagram.diagram_type}
            versionNo={diagram.version_no}
            layout={diagram.layout_json}
            overrides={diagram.overrides}
            onRegenerate={load}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center dot-grid p-8">
            <div className="w-12 h-12 rounded-xl bg-[var(--primary-dim)] border border-[var(--primary-ring)] flex items-center justify-center mb-4">
              <svg className="w-5 h-5 stroke-primary" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round">
                <path d="M12 3v18"/><path d="M3 12h18"/><circle cx="12" cy="12" r="9"/>
              </svg>
            </div>
            <h2 className="font-display font-bold text-[1.1rem] tracking-tight text-foreground mb-2">What should we diagram?</h2>
            <p className="text-sm text-muted-foreground max-w-[300px] text-center leading-relaxed mb-5">
              Describe a process, concept, or workflow and an interactive diagram will be generated.
            </p>
            <div className="flex flex-wrap justify-center gap-2 max-w-md">
              {PROMPTS.map(p => (
                <button
                  key={p}
                  onClick={() => handlePill(p)}
                  className="px-3 py-1.5 rounded-full border border-border text-sm text-muted-foreground bg-card hover:border-[var(--primary-ring)] hover:bg-[var(--primary-dim)] hover:text-foreground transition-all active:scale-[0.97]"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Typing indicator */}
        {sending && (
          <div className="px-5 py-3 flex items-center gap-2 bg-background border-t border-border">
            <div className="w-5 h-5 rounded-full bg-[var(--primary-dim)] border border-[var(--primary-ring)] flex items-center justify-center font-display font-black text-primary text-[9px]">T</div>
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <span key={i} className="w-1 h-1 rounded-full bg-primary"
                  style={{ animation: `dot-bounce 1.2s ease-in-out ${i * 0.15}s infinite` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <Composer onSend={handleSend} disabled={sending} />
    </div>
  )
}

// ── Style Drawer ──────────────────────────────────────────────────
function StyleDrawer({ chatId, onClose }: { chatId: string; onClose: () => void }) {
  const [accent, setAccent] = useState('#e8a020')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    await updateChat(chatId, { accent_color: accent })
    if (accent) document.documentElement.style.setProperty('--primary', accent)
    setSaving(false)
    onClose()
  }

  return (
    <div className="shrink-0 bg-card border-b border-border px-5 py-3 flex items-end gap-4 flex-wrap animate-fade-up">
      <div>
        <label className="block text-[11px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">Accent color</label>
        <input type="color" value={accent} onChange={e => setAccent(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border border-border bg-background p-0.5" />
      </div>
      <button onClick={save} disabled={saving}
        className="h-8 px-3 rounded bg-primary text-primary-foreground text-xs font-semibold transition-all active:scale-[0.97] hover:opacity-88 disabled:opacity-50">
        {saving ? 'Saving…' : 'Apply'}
      </button>
    </div>
  )
}
