import { useEffect, useMemo, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import Header from '@/components/Header'
import { useAuthStore } from '@/store/authStore'
import { getApiBaseUrl, getBackendBaseUrl } from '@/lib/apiConfig'

type ChatMessage = {
  id?: string | number
  role: 'user' | 'assistant' | 'human'
  message: string
  createdAt?: string
}

type BrowserSpeechRecognition = {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  onstart: null | (() => void)
  onresult: null | ((event: any) => void)
  onerror: null | (() => void)
  onend: null | (() => void)
  start: () => void
  stop: () => void
}

type SpeechRecognitionCtor = new () => BrowserSpeechRecognition

declare global {
  interface Window {
    webkitSpeechRecognition?: SpeechRecognitionCtor
    SpeechRecognition?: SpeechRecognitionCtor
  }
}

const EMOJI_OPTIONS = ['😀', '😊', '👍', '🙏', '🔥', '✅', '🎉', '💬']

export default function ContactAdmin() {
  const { user, token } = useAuthStore()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState('')
  const [conversationStatus, setConversationStatus] = useState<'ai' | 'human'>('ai')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [isRecording, setIsRecording] = useState(false)

  const endRef = useRef<HTMLDivElement>(null)
  const pollRef = useRef<number | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const cameraInputRef = useRef<HTMLInputElement | null>(null)
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null)

  const canUseAuthChat = Boolean(user?.id && token)

  const historyKey = useMemo(() => {
    if (canUseAuthChat) return `user:${user?.id}`
    return sessionId ? `guest:${sessionId}` : ''
  }, [canUseAuthChat, user?.id, sessionId])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = localStorage.getItem('chat_session_id')
    if (saved) {
      setSessionId(saved)
      return
    }
    const newSessionId = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
    localStorage.setItem('chat_session_id', newSessionId)
    setSessionId(newSessionId)
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadHistory = async () => {
    if (!historyKey) return false
    try {
      const apiBase = getApiBaseUrl()
      const endpoint = canUseAuthChat
        ? `${apiBase}/chat/history?limit=100`
        : `${apiBase}/chat/guest-history?limit=100&sessionId=${encodeURIComponent(sessionId)}`
      const response = await fetch(endpoint, {
        headers: canUseAuthChat ? { Authorization: `Bearer ${token}` } : undefined
      })
      if (!response.ok) return false
      const data = await response.json()
      if (data?.status) setConversationStatus(data.status)
      const incoming = Array.isArray(data?.messages) ? data.messages : []
      if (incoming.length > 0) {
        setMessages(incoming)
        return true
      }
      setMessages([
        {
          role: 'assistant',
          message: 'Hello! Welcome to RenewableZmart support. Send your message and our team will respond here.'
        }
      ])
      return false
    } catch {
      return false
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    if (!historyKey) return
    loadHistory()
  }, [historyKey])

  useEffect(() => {
    if (!historyKey) return
    if (pollRef.current) {
      window.clearInterval(pollRef.current)
      pollRef.current = null
    }
    pollRef.current = window.setInterval(() => {
      loadHistory()
    }, 4000)
    return () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [historyKey])

  useEffect(() => {
    if (!sessionId && !user?.id) return
    const socket = io(getBackendBaseUrl(), {
      transports: ['websocket'],
      withCredentials: true
    })
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('join_chat', {
        userId: user?.id,
        sessionId
      })
    })

    socket.on('chat_message', (payload: any) => {
      const content = String(payload?.content || '').trim()
      if (!content) return
      setConversationStatus('human')
      setMessages((prev) => [...prev, { role: 'human', message: content, createdAt: new Date().toISOString() }])
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [sessionId, user?.id])

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
        recognitionRef.current = null
      }
    }
  }, [])

  const appendToComposer = (text: string) => {
    setMessage((prev) => {
      if (!prev.trim()) return text
      return `${prev} ${text}`
    })
    textareaRef.current?.focus()
  }

  const handleAttachmentPick = (e: React.ChangeEvent<HTMLInputElement>, kind: 'File' | 'Photo') => {
    const picked = e.target.files?.[0]
    if (!picked) return

    const kb = Math.max(1, Math.round(picked.size / 1024))
    appendToComposer(`[${kind}: ${picked.name} - ${kb}KB]`)
    e.target.value = ''
  }

  const toggleVoiceInput = () => {
    const SpeechCtor = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechCtor) {
      setError('Voice input is not supported on this browser.')
      return
    }

    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop()
      setIsRecording(false)
      return
    }

    const recognition = new SpeechCtor()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setError(null)
      setIsRecording(true)
    }

    recognition.onresult = (event: any) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim() || ''
      if (transcript) appendToComposer(transcript)
    }

    recognition.onerror = () => {
      setError('Unable to capture voice right now. Please try again.')
      setIsRecording(false)
    }

    recognition.onend = () => {
      setIsRecording(false)
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return
    setLoading(true)
    setError(null)
    setShowEmojiPicker(false)

    const draft = message.trim()
    setMessage('')
    setMessages((prev) => [...prev, { role: 'user', message: draft, createdAt: new Date().toISOString() }])

    try {
      const apiBase = getApiBaseUrl()
      const endpoint = canUseAuthChat ? `${apiBase}/chat/messages` : `${apiBase}/chat/guest-messages`
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (canUseAuthChat) headers.Authorization = `Bearer ${token}`

      const payload = canUseAuthChat ? { message: draft } : { message: draft, sessionId }
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const responseBody = await response.json().catch(() => ({}))
        throw new Error(responseBody?.message || 'Failed to send message')
      }

      const data = await response.json()
      if (data?.status) setConversationStatus(data.status)
      if (data?.assistantMessage) {
        setMessages((prev) => [...prev, { role: 'assistant', message: data.assistantMessage, createdAt: new Date().toISOString() }])
      }
    } catch (err: any) {
      const msg = err?.message || 'Failed to send your message. Please try again.'
      setError(msg)
      setMessages((prev) => [...prev, { role: 'assistant', message: msg, createdAt: new Date().toISOString() }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Header />
      <div className="min-h-screen relative overflow-hidden bg-[#f3f4f6]">
        <div className="h-[calc(100vh-230px)] overflow-y-auto px-3 sm:px-6 pt-4 pb-4">
          <div className="max-w-4xl mx-auto space-y-4">
            {historyLoading && messages.length === 0 ? (
              <div className="text-sm text-gray-500 font-medium">Loading chat...</div>
            ) : null}
            {messages.map((msg, idx) => {
              const isUser = msg.role === 'user'
              return (
                <div key={`${msg.id || idx}-${idx}`} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[88%] rounded-3xl px-4 py-3 text-[15px] sm:text-base leading-relaxed shadow-sm ${
                      isUser ? 'bg-blue-950 text-white rounded-br-md' : 'bg-[#e5e7eb] text-gray-900 rounded-bl-md'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.message}</p>
                    {msg.createdAt ? (
                      <p className={`mt-1 text-[11px] ${isUser ? 'text-gray-300' : 'text-gray-500'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    ) : null}
                  </div>
                </div>
              )
            })}
            <div ref={endRef} />
          </div>
        </div>

        <div
          className="fixed bottom-0 left-0 right-0 p-2 sm:p-3 bg-white/95 border-t border-gray-200"
          style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom))' }}
        >
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative">
            {showEmojiPicker && (
              <div className="absolute bottom-[84px] left-2 sm:left-4 bg-white border border-gray-200 rounded-2xl shadow-lg p-2 flex gap-1 z-20">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      appendToComposer(emoji)
                      setShowEmojiPicker(false)
                    }}
                    className="h-9 w-9 rounded-lg hover:bg-gray-100 text-lg"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => handleAttachmentPick(e, 'File')}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleAttachmentPick(e, 'Photo')}
            />

            <div className="rounded-3xl border-2 border-blue-950 p-2 bg-white shadow-lg">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Message..."
                rows={1}
                className="w-full resize-none px-3 py-2 text-lg sm:text-xl text-gray-900 placeholder:text-gray-500 focus:outline-none bg-transparent"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit(e)
                  }
                }}
              />

              <div className="flex items-center justify-between px-2 pt-2">
                <div className="flex items-center gap-2 sm:gap-3 text-gray-500">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-9 w-9 rounded-full hover:bg-gray-100 active:scale-95 transition flex items-center justify-center"
                    aria-label="Attach file"
                    title="Attach file"
                  >
                    <span className="text-xl leading-none">+</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker((v) => !v)}
                    className="h-9 w-9 rounded-full hover:bg-gray-100 active:scale-95 transition flex items-center justify-center"
                    aria-label="Add emoji"
                    title="Add emoji"
                  >
                    <span className="text-xl leading-none">😊</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="h-9 w-9 rounded-full hover:bg-gray-100 active:scale-95 transition flex items-center justify-center"
                    aria-label="Open camera"
                    title="Open camera"
                  >
                    <span className="text-lg leading-none">📷</span>
                  </button>
                  <button
                    type="button"
                    onClick={toggleVoiceInput}
                    className={`h-9 w-9 rounded-full active:scale-95 transition flex items-center justify-center ${
                      isRecording ? 'bg-rose-100 text-rose-600' : 'hover:bg-gray-100'
                    }`}
                    aria-label="Voice input"
                    title={isRecording ? 'Stop voice input' : 'Start voice input'}
                  >
                    <span className="text-lg leading-none">🎤</span>
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading || !message.trim()}
                  className="h-11 w-11 sm:h-14 sm:w-14 rounded-full bg-gray-200 text-gray-400 disabled:opacity-70 enabled:bg-emerald-500 enabled:text-white transition flex items-center justify-center text-xl sm:text-3xl"
                  aria-label="Send message"
                >
                  ↑
                </button>
              </div>
            </div>

            <div className="mt-1 px-1 flex items-center justify-between">
              {error ? <p className="text-xs font-semibold text-red-600">{error}</p> : <span />}
              <p className="text-xs font-semibold text-gray-500">
                {conversationStatus === 'human' ? 'Admin connected' : 'AI assistant active'}
              </p>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
