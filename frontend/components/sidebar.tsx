'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Pencil, Trash2, LogOut, Loader2, User, Key, X } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { getMe } from '@/lib/api'
import type { Chat } from '@/lib/types'


interface Props {
  chats: Chat[]
  loading: boolean
  currentChatId: string | null
  theme: 'dark' | 'light'
  onNewChat: () => Promise<void>
  onSelectChat: (id: string) => void
  onDeleteChat: (id: string) => Promise<void>
  onRenameChat: (id: string, title: string) => Promise<void>
  onToggleTheme: () => void
  onLogout: () => Promise<void>
}

interface ApiKeyProps {
  onSave: (apiKey: string) => void
}

function ApiKeyPopup({ onSave }: ApiKeyProps) {
  const [apiKey, setApiKey] = useState('')
  const [email, setEmail] = useState('')

  useEffect(() => {
    getMe().then(r => setEmail(r.email)).catch(() => {})
  }, [])

  function handleSave() {
    if (apiKey.trim()) {
      onSave(apiKey.trim())
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div className="w-80 bg-card border border-border rounded-lg shadow-xl p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">Settings</span>
        </div>
        <div className="text-xs text-muted-foreground">
          {email || 'Loading...'}
        </div>
        <input
          type="password"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          placeholder="Groq API Key (gsk_...)"
          className="w-full h-10 px-3 rounded border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[var(--primary-ring)]"
        />
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 h-9 rounded bg-primary text-primary-foreground text-sm font-medium hover:opacity-88 transition-all"
          >
            OK
          </button>
        </div>
      </div>
    </motion.div>
  )
}

export default function Sidebar({
  chats, loading, currentChatId,
  onNewChat, onSelectChat, onDeleteChat, onRenameChat, onLogout,
}: Props) {
  const [creating, setCreating] = useState(false)
  const [apiKeyOpen, setApiKeyOpen] = useState(false)
  const [email, setEmail] = useState('')

  useEffect(() => {
    getMe().then(r => setEmail(r.email)).catch(() => {})
  }, [])

  async function handleNew() {
    if (creating) return
    setCreating(true)
    try { await onNewChat() } finally { setCreating(false) }
  }

  return (
    <aside className="w-64 shrink-0 flex flex-col bg-card border-r border-border overflow-hidden">
      {/* Brand */}
      <div className="px-4 pt-4 pb-3 border-b border-border flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-[var(--primary-dim)] border border-[var(--primary-ring)] flex items-center justify-center font-display font-black text-primary text-[11px] shrink-0">
            T
          </div>
          <span className="font-display font-bold text-base tracking-tight text-foreground">Tissue</span>
          <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground bg-muted border border-border rounded-full px-1.5 py-0.5">AI</span>
        </div>

        {/* New chat button */}
        <button
          onClick={handleNew}
          disabled={creating}
          className="w-full h-8 rounded bg-primary text-primary-foreground text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-all hover:opacity-88 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none"
        >
          {creating
            ? <Loader2 className="w-3 h-3 animate-spin" />
            : <Plus className="w-3 h-3" strokeWidth={2.5} />}
          New Chat
        </button>
      </div>

      {/* Chat list */}
      <nav className="flex-1 overflow-y-auto py-1.5 px-1.5">
        {loading ? (
          <div className="flex flex-col gap-1 px-1 pt-1">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 rounded shimmer" style={{ animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        ) : chats.length === 0 ? (
          <p className="text-center text-[12px] text-muted-foreground py-6 px-4">No chats yet. Create one above.</p>
        ) : (
          <>
            <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 font-mono">Chats</p>
            <AnimatePresence initial={false}>
              {chats.map(chat => (
                <ChatRow
                  key={chat.id}
                  chat={chat}
                  active={chat.id === currentChatId}
                  onSelect={() => onSelectChat(chat.id)}
                  onDelete={() => onDeleteChat(chat.id)}
                  onRename={() => onRenameChat(chat.id, chat.title)}
                />
              ))}
            </AnimatePresence>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="px-2 py-2.5 border-t border-border flex items-center gap-2">
        <button
          onClick={() => setProfileOpen(!profileOpen)}
          className="w-8 h-8 rounded-full bg-[var(--primary-dim)] border border-[var(--primary-ring)] flex items-center justify-center shrink-0 hover:opacity-80 transition-all"
        >
          <User className="w-4 h-4 text-primary" />
        </button>
        <button
          onClick={onLogout}
          className="flex-1 h-8 rounded border border-border flex items-center justify-center gap-2 text-[13px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all active:scale-[0.97]"
        >
          <LogOut className="w-3.5 h-3.5" />
          Log out
        </button>
      </div>

      {/* Profile Popup */}
      {profileOpen && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-14 left-2 right-2 bg-card border border-border rounded-lg shadow-lg p-3 flex flex-col gap-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">{email || 'Loading...'}</span>
            <button onClick={() => setProfileOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-3 h-3" />
            </button>
          </div>
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="Groq API Key (gsk_...)"
            className="w-full h-8 px-2 rounded border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[var(--primary-ring)]"
          />
        </motion.div>
      )}
    </aside>
  )
}

function ChatRow({ chat, active, onSelect, onDelete, onRename }: {
  chat: Chat; active: boolean
  onSelect: () => void; onDelete: () => void; onRename: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -6 }}
      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'group relative flex items-center rounded mb-px transition-colors',
        active ? 'bg-muted' : 'hover:bg-muted/70'
      )}
    >
      {/* Active indicator */}
      {active && (
        <motion.div
          layoutId="active-bar"
          className="absolute left-0 top-[20%] bottom-[20%] w-0.5 rounded-full bg-primary"
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        />
      )}

      <button
        onClick={onSelect}
        className="flex-1 min-w-0 text-left px-3.5 py-2.5 pl-4"
      >
        <span className={cn(
          'block text-[13px] font-medium truncate transition-colors',
          active ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
        )}>
          {chat.title}
        </span>
        <span className="block text-[11px] font-mono text-muted-foreground/50 mt-0.5">
          {formatDate(chat.updated_at)}
        </span>
      </button>

      {/* Actions (visible on hover) */}
      <div className="flex gap-px pr-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onRename} title="Rename"
          className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
          <Pencil className="w-3 h-3" />
        </button>
        <button onClick={onDelete} title="Delete"
          className="w-6 h-6 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  )
}
