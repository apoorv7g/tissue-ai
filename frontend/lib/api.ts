import type { Chat, Message } from './types'

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { credentials: 'include', ...init })
  if (r.status === 401) throw Object.assign(new Error('Unauthorized'), { status: 401 })
  if (!r.ok) {
    const body = await r.json().catch(() => ({}))
    throw new Error(body?.detail || `Request failed: ${r.status}`)
  }
  return r.json()
}

// ── Auth ──────────────────────────────────────────────────────────
export async function login(email: string, password: string) {
  const r = await fetch('/auth/login', {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email, password }).toString(),
  })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(data?.detail || 'Invalid email or password')
  return true
}

export async function signup(email: string, password: string) {
  const r = await fetch('/auth/signup', {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ email, password }).toString(),
  })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(data?.detail || 'Could not create account')
  return true
}

export async function logout() {
  await fetch('/auth/logout', { method: 'POST', credentials: 'include' })
}

// ── Chats ─────────────────────────────────────────────────────────
export async function listChats(): Promise<Chat[]> {
  const d = await req<{ items: Chat[] }>('/api/chats')
  return d.items
}

export async function createChat(title = 'New Chat'): Promise<Chat> {
  const d = await req<{ chat: Chat }>('/api/chats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `title=${encodeURIComponent(title)}`,
  })
  return d.chat
}

export async function updateChat(id: string, patch: Partial<Chat>): Promise<{ chat: Chat }> {
  return req(`/api/chats/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
}

export async function deleteChat(id: string): Promise<{ ok: boolean; next_chat_id?: string }> {
  return req(`/api/chats/${id}`, { method: 'DELETE' })
}

// ── Messages ──────────────────────────────────────────────────────
export async function listMessages(chatId: string): Promise<Message[]> {
  const d = await req<{ items: Message[] }>(`/api/chats/${chatId}/messages`)
  return d.items
}

export async function sendMessage(
  chatId: string,
  content: string,
  diagramType: 'flowchart' | 'mindmap',
  apiKey: string,
): Promise<Message[]> {
  const body = new URLSearchParams({ content, diagram_type: diagramType, api_key: apiKey })
  const d = await req<{ items: Message[] }>(`/api/chats/${chatId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  return d.items
}

export async function regenerateDiagram(diagramId: string) {
  return req(`/api/diagrams/${diagramId}/regenerate`, { method: 'POST' })
}
