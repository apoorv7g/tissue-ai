'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Script from 'next/script'
import { listChats, createChat, deleteChat, updateChat, logout } from '@/lib/api'
import type { Chat } from '@/lib/types'
import Sidebar from '@/components/sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [chats, setChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(true)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  const currentChatId = pathname.startsWith('/app/chats/')
    ? pathname.split('/app/chats/')[1]
    : null

  // Load chats + check auth
  const loadChats = useCallback(async () => {
    try {
      const items = await listChats()
      setChats(items)
    } catch (e: unknown) {
      const err = e as { status?: number }
      if (err?.status === 401) router.replace('/login')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => { loadChats() }, [loadChats])

  // Persist theme on html element
  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light')
  }, [theme])

  async function handleNewChat() {
    const chat = await createChat()
    setChats(prev => [chat, ...prev])
    router.push(`/app/chats/${chat.id}`)
  }

  async function handleDeleteChat(id: string) {
    if (!confirm('Delete this chat?')) return
    setChats(prev => prev.filter(c => c.id !== id))
    const next = chats.find(c => c.id !== id)
    if (currentChatId === id) router.push(next ? `/app/chats/${next.id}` : '/app')
    await deleteChat(id)
  }

  async function handleRenameChat(id: string, current: string) {
    const title = prompt('Rename chat', current)?.trim()
    if (!title) return
    setChats(prev => prev.map(c => c.id === id ? { ...c, title } : c))
    await updateChat(id, { title })
  }

  async function handleLogout() {
    await logout()
    router.replace('/login')
  }

  return (
    <>
      {/* Load diagram.js from the FastAPI static server (proxied) */}
      <Script src="/static/js/diagram.js" strategy="afterInteractive" />

      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar
          chats={chats}
          loading={loading}
          currentChatId={currentChatId}
          theme={theme}
          onNewChat={handleNewChat}
          onSelectChat={id => router.push(`/app/chats/${id}`)}
          onDeleteChat={handleDeleteChat}
          onRenameChat={handleRenameChat}
          onToggleTheme={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
          onLogout={handleLogout}
        />
        <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </>
  )
}
