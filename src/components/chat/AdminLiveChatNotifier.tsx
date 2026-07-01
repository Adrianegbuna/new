import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useRouter } from 'next/router'
import { apiClient } from '@/lib/api-client'
import { getApiBaseUrl } from '@/lib/apiConfig'

const ADMIN_CHAT_SEEN_EVENT = 'rz_admin_chat_seen'

type AdminConversationPreview = {
  id: string
  userId?: string | null
  sessionId?: string | null
  phone?: string | null
  displayName?: string
  status?: 'ai' | 'human'
  channel?: 'web' | 'whatsapp'
  lastMessage?: string
  timestamp?: string
}

type AdminPopupMessage = {
  id?: string | number
  role?: 'user' | 'assistant' | 'human'
  message?: string
  createdAt?: string
}

export default function AdminLiveChatNotifier() {
  const router = useRouter()
  const [popupVisible, setPopupVisible] = useState(false)
  const [activeConversation, setActiveConversation] = useState<AdminConversationPreview | null>(null)
  const [messages, setMessages] = useState<AdminPopupMessage[]>([])
  const [reply, setReply] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [pendingConversations, setPendingConversations] = useState<AdminConversationPreview[]>([])

  const socketRef = useRef<Socket | null>(null)
  const primedRef = useRef(false)
  const conversationSignatureRef = useRef<Map<string, string>>(new Map())

  const normalizeMessages = useCallback((incoming: any[]): AdminPopupMessage[] => {
    return incoming
      .map((msg: any, index: number) => ({
        id: msg?.id ? String(msg.id) : `popup-msg-${index}`,
        role: (String(msg?.role || 'user') as AdminPopupMessage['role']),
        message: String(msg?.message ?? msg?.content ?? msg?.text ?? '').trim(),
        createdAt: msg?.createdAt ? String(msg.createdAt) : undefined,
      }))
      .filter((msg) => msg.message.length > 0)
  }, [])

  const shouldHide = router.pathname === '/admin/chat'

  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      setLoading(true)
      const res = await apiClient.get(`/admin/conversations/${conversationId}/messages`)
      const rawList = Array.isArray(res?.data?.messages) ? res.data.messages : []
      const list = normalizeMessages(rawList)
      setMessages(list)
    } catch {
      setMessages([])
    } finally {
      setLoading(false)
    }
  }, [normalizeMessages])

  const openConversationPopup = useCallback(async (conversation: AdminConversationPreview) => {
    setActiveConversation(conversation)
    setPopupVisible(true)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(ADMIN_CHAT_SEEN_EVENT, {
          detail: { conversationId: conversation.id },
        })
      )
    }
    await fetchMessages(conversation.id)
  }, [fetchMessages])

  const fetchConversations = useCallback(async () => {
    try {
      const res = await apiClient.get('/admin/conversations')
      const conversations: AdminConversationPreview[] = Array.isArray(res?.data?.conversations)
        ? res.data.conversations
        : []

      if (!conversations.length) return

      const sorted = [...conversations].sort(
        (a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
      )
      setPendingConversations(sorted.slice(0, 8))

      const updatedSignature = new Map<string, string>()
      const changed: AdminConversationPreview[] = []

      for (const convo of sorted) {
        const signature = `${convo.timestamp || ''}__${convo.lastMessage || ''}`
        updatedSignature.set(convo.id, signature)
        if (!primedRef.current) continue
        const previous = conversationSignatureRef.current.get(convo.id)
        if (previous && previous !== signature) {
          changed.push(convo)
        }
      }

      conversationSignatureRef.current = updatedSignature

      if (!primedRef.current) {
        primedRef.current = true
        return
      }

      if (changed.length > 0 && !popupVisible && !shouldHide) {
        await openConversationPopup(changed[0])
      }
    } catch {
      // Silent fail: polling retries on next cycle.
    }
  }, [openConversationPopup, popupVisible, shouldHide])

  useEffect(() => {
    if (shouldHide) return
    fetchConversations()
    const interval = window.setInterval(fetchConversations, 10000)
    return () => window.clearInterval(interval)
  }, [fetchConversations, shouldHide])

  useEffect(() => {
    if (shouldHide) return

    const socket = io(getApiBaseUrl(), { transports: ['websocket'] })
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('join_admin')
    })

    socket.on('new_message', async (payload: any) => {
      const conversationId = String(payload?.conversationId || '').trim()
      const role = String(payload?.role || '').toLowerCase()
      if (!conversationId || role !== 'user') return
      const text = String(payload?.message ?? payload?.content ?? payload?.text ?? '').trim()
      if (!text) return

      if (activeConversation?.id === conversationId) {
        setMessages((prev) => [
          ...prev,
          {
            id: payload?.id ? String(payload.id) : `live-${Date.now()}`,
            role: 'user',
            message: text,
            createdAt: String(payload?.createdAt || new Date().toISOString()),
          },
        ])
      }

      try {
        const res = await apiClient.get('/admin/conversations')
        const conversations: AdminConversationPreview[] = Array.isArray(res?.data?.conversations)
          ? res.data.conversations
          : []
        const target = conversations.find((c) => c.id === conversationId)
        if (!target) return

        setPendingConversations(
          [...conversations].sort(
            (a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
          ).slice(0, 8)
        )
        if (!popupVisible) {
          await openConversationPopup(target)
        }
      } catch {
        // Poll fallback will recover.
      }
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [activeConversation?.id, openConversationPopup, popupVisible, shouldHide])

  const handleSendReply = useCallback(async () => {
    if (!activeConversation?.id || !reply.trim()) return
    const outbound = reply.trim()

    setSending(true)
    try {
      await apiClient.post(`/admin/conversations/${activeConversation.id}/reply`, {
        message: outbound,
      })
      setReply('')
      await fetchMessages(activeConversation.id)
      await fetchConversations()
    } finally {
      setSending(false)
    }
  }, [activeConversation?.id, fetchConversations, fetchMessages, reply])

  const latestMessages = useMemo(() => messages.slice(-10), [messages])

  if (shouldHide || !popupVisible || !activeConversation) return null

  return (
    <div className="fixed bottom-6 right-6 z-[2147483646] w-[min(380px,calc(100vw-28px))] rounded-2xl border border-emerald-200 bg-white shadow-[0_20px_45px_rgba(15,23,42,0.24)] overflow-hidden">
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-emerald-700 px-4 py-3 text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-bold">New Live Chat Message</p>
            <p className="text-xs text-emerald-100 truncate">
              {activeConversation.displayName || 'Customer'} • {activeConversation.channel === 'whatsapp' ? 'WhatsApp' : 'Web Chat'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPopupVisible(false)}
            className="text-white/90 hover:text-white text-lg leading-none"
            aria-label="Close chat popup"
          >
            ×
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => router.push('/admin/chat')}
            className="px-3 py-1.5 rounded-full bg-white/20 border border-white/30 text-xs font-semibold hover:bg-white/30 transition"
          >
            Open Full Inbox
          </button>
          <button
            type="button"
            onClick={fetchConversations}
            className="px-3 py-1.5 rounded-full bg-white/20 border border-white/30 text-xs font-semibold hover:bg-white/30 transition"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="max-h-64 overflow-y-auto bg-slate-50 p-3 space-y-2">
        {loading ? (
          <p className="text-sm text-slate-500">Loading messages...</p>
        ) : latestMessages.length === 0 ? (
          <p className="text-sm text-slate-500">No messages yet.</p>
        ) : (
          latestMessages.map((msg, idx) => {
            const isAdmin = msg.role === 'human'
            return (
              <div
                key={`${msg.id || idx}`}
                className={`rounded-xl px-3 py-2 text-sm ${isAdmin ? 'bg-blue-100 text-blue-950 ml-8' : 'bg-white border border-slate-200 text-slate-800 mr-8'}`}
              >
                <p className="whitespace-pre-wrap break-words">{msg.message || ''}</p>
              </div>
            )
          })
        )}
      </div>

      <div className="border-t border-slate-200 p-3 bg-white">
        <div className="mb-2 flex gap-2 overflow-x-auto quick-tabs-scroll">
          {pendingConversations.slice(0, 5).map((convo) => (
            <button
              key={convo.id}
              type="button"
              onClick={() => openConversationPopup(convo)}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${
                activeConversation.id === convo.id ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white border-slate-300 text-slate-600'
              }`}
            >
              {(convo.displayName || 'User').slice(0, 16)}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Reply to customer..."
            className="flex-1 h-10 rounded-xl border border-slate-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="button"
            onClick={handleSendReply}
            disabled={sending || !reply.trim()}
            className="h-10 px-4 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}
