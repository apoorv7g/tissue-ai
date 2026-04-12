'use client'
import { useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'
import { cn } from '@/lib/utils'

type DiagramType = 'flowchart' | 'mindmap'

interface Props {
  onSend: (content: string, type: DiagramType) => Promise<void>
  disabled?: boolean
}

export default function Composer({ onSend, disabled }: Props) {
  const [content, setContent] = useState('')
  const [type, setType] = useState<DiagramType>('flowchart')
  const [sending, setSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Ref always holds the latest selected type — never stale in async closures
  const typeRef = useRef<DiagramType>('flowchart')

  function selectType(t: DiagramType) {
    setType(t)
    typeRef.current = t
  }

  // Auto-grow textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px'
  }, [content])

  // Listen for pill fills from the empty state
  useEffect(() => {
    function onFill(e: Event) {
      const text = (e as CustomEvent<string>).detail
      setContent(text)
      textareaRef.current?.focus()
    }
    window.addEventListener('tissue:fill-composer', onFill)
    return () => window.removeEventListener('tissue:fill-composer', onFill)
  }, [])

  async function submit() {
    const trimmed = content.trim()
    if (!trimmed || sending || disabled) return
    const currentType = typeRef.current   // read from ref — always fresh
    setSending(true)
    setContent('')
    try {
      await onSend(trimmed, currentType)
    } finally {
      setSending(false)
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      submit()
    }
  }

  const busy = sending || disabled

  return (
    <div className="shrink-0 px-5 pb-4 pt-3 bg-card border-t border-border">
      <div className="max-w-3xl mx-auto">
        <div className={cn(
          'rounded-[var(--radius-lg)] border bg-background transition-all overflow-hidden',
          !busy && 'focus-within:border-[var(--primary-ring)] focus-within:shadow-[var(--primary-glow)]'
        )}>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={busy}
            placeholder="Describe a process, concept, or paste text…"
            rows={1}
            className="w-full bg-transparent border-none outline-none resize-none px-4 pt-3 pb-2 text-sm text-foreground placeholder:text-muted-foreground leading-relaxed min-h-[40px] max-h-[200px] overflow-y-auto disabled:opacity-60"
          />

          <div className="flex items-center gap-1 px-3 pb-2.5 border-t border-border/60">
            {/* Type pills — clicking updates both state (UI) and ref (submit uses ref) */}
            {(['flowchart', 'mindmap'] as DiagramType[]).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => selectType(t)}
                className={cn(
                  'px-3 py-1 rounded-full text-[12px] font-medium border transition-all capitalize select-none',
                  type === t
                    ? 'bg-[var(--primary-dim)] border-[var(--primary-ring)] text-primary font-semibold'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                {t}
              </button>
            ))}

            <div className="flex-1" />

            {/* Send */}
            <button
              onClick={submit}
              disabled={!content.trim() || busy}
              className="w-7 h-7 rounded-full bg-primary flex items-center justify-center transition-all hover:opacity-88 hover:scale-105 active:scale-90 disabled:opacity-40 disabled:pointer-events-none"
            >
              {busy
                ? <span className="w-3 h-3 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full" style={{ animation: 'spin 0.65s linear infinite' }} />
                : <Send className="w-3 h-3 text-primary-foreground" strokeWidth={2.5} />}
            </button>
          </div>
        </div>

        <p className="mt-1.5 text-center text-[11px] font-mono text-muted-foreground/40">
          <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[10px]">Enter</kbd> new line
          &nbsp;·&nbsp;
          <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[10px]">Ctrl</kbd>+<kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[10px]">Enter</kbd> send
        </p>
      </div>
    </div>
  )
}
