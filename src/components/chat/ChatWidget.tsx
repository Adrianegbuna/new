import React, { useState, useRef, useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { io, Socket } from 'socket.io-client'
import { getApiBaseUrl, getBackendBaseUrl } from '@/lib/apiConfig'
import { OPEN_LIVE_CHAT_EVENT } from '@/lib/liveChat'

interface Message {
  id?: string | number
  role: 'user' | 'assistant' | 'human'
  message: string
  category?: string
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

const EMOJI_OPTIONS = ['😊', '😂', '😍', '👍', '🙏', '🎉', '🔥', '✅']

const getFriendlyChatError = (rawError: unknown): string => {
  const text = String(rawError || '').toLowerCase()

  if (text.includes('429') || text.includes('quota') || text.includes('billing')) {
    return 'Our chat service is temporarily unavailable due to usage limits. Please try again shortly.'
  }

  if (text.includes('network') || text.includes('failed to fetch')) {
    return 'Network issue detected. Please check your internet connection and try again.'
  }

  return 'Sorry, I ran into an error. Please try again.'
}

const linkifyMessage = (text: string) => {
  const parts: (string | JSX.Element)[] = []
  const markdownLink = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const isUrl = (value: string) => /^https?:\/\//.test(value)

  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = markdownLink.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(...text.substring(lastIndex, match.index).split(urlRegex).map((chunk, idx) => {
        if (isUrl(chunk)) {
          const key = `url-${match?.index}-${idx}`
          return (
            <a
              key={key}
              href={chunk}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-emerald-400 underline-offset-2 hover:text-emerald-600 transition"
            >
              {chunk}
            </a>
          )
        }
        return chunk
      }))
    }

    const label = match[1]
    const href = match[2]
    parts.push(
      <a
        key={`md-${match.index}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="underline decoration-emerald-400 underline-offset-2 hover:text-emerald-600 transition font-semibold"
      >
        {label}
      </a>
    )

    lastIndex = markdownLink.lastIndex
  }

  if (lastIndex < text.length) {
    parts.push(...text.substring(lastIndex).split(urlRegex).map((chunk, idx) => {
      if (isUrl(chunk)) {
        const key = `tail-${lastIndex}-${idx}`
        return (
          <a
            key={key}
            href={chunk}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-emerald-400 underline-offset-2 hover:text-emerald-600 transition"
          >
            {chunk}
          </a>
        )
      }
      return chunk
    }))
  }

  return parts
}

export default function ChatWidget() {
  const { user, token } = useAuthStore()
  const [isOpen, setIsOpen] = useState(false)
  const [isScrolling, setIsScrolling] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string>('')
  const [conversationStatus, setConversationStatus] = useState<'ai' | 'human'>('human')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [customApplianceName, setCustomApplianceName] = useState('')
  const [customApplianceWatts, setCustomApplianceWatts] = useState('')
  const [showAppliances, setShowAppliances] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const cameraInputRef = useRef<HTMLInputElement | null>(null)
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const loadedHistoryKeyRef = useRef<string>('')
  const typingTimeoutRef = useRef<number | null>(null)
  const pollIntervalRef = useRef<number | null>(null)
  const scrollTimeoutRef = useRef<number | null>(null)
  const greetingMessage =
    "Hello.\nWelcome to RenewableZmart.\nI can help you choose solar systems, batteries, and installers.\nHow can I assist you today?"

  // Initialize session ID on mount
  useEffect(() => {
    const savedSessionId = localStorage.getItem('chat_session_id')
    if (savedSessionId) {
      setSessionId(savedSessionId)
    } else {
      const newSessionId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem('chat_session_id', newSessionId)
      setSessionId(newSessionId)
    }
  }, [])

  const historyKey = user && token
    ? `user:${user.id}`
    : sessionId
      ? `guest:${sessionId}`
      : ''

  // Load chat history when open and auth/session is ready
  useEffect(() => {
    if (!isOpen || !historyKey) return

    loadHistory().then((hasMessages) => {
      loadedHistoryKeyRef.current = historyKey
      if (hasMessages) return
      if (messages.length === 0) {
        setMessages([{ role: 'assistant', message: greetingMessage }])
      }
    })
  }, [isOpen, historyKey])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!isOpen) return

    const backendBase = getBackendBaseUrl()
    const socket = io(backendBase, {
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
      const text = String(payload?.content ?? payload?.message ?? '').trim()
      if (!text) return
      setConversationStatus('human')
      setMessages(prev => [
        ...prev,
        {
          role: 'human',
          message: text
        }
      ])
    })

    return () => {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current)
      }
      if (pollIntervalRef.current) {
        window.clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
      socket.disconnect()
      socketRef.current = null
    }
  }, [isOpen, user?.id, sessionId])

  useEffect(() => {
    if (!isOpen || conversationStatus !== 'human') {
      if (pollIntervalRef.current) {
        window.clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
      return
    }

    pollIntervalRef.current = window.setInterval(() => {
      loadHistory()
    }, 10000)

    return () => {
      if (pollIntervalRef.current) {
        window.clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  }, [isOpen, conversationStatus, historyKey])
  useEffect(() => {
        const onScrollActivity = () => {
      setIsScrolling(true)
      if (scrollTimeoutRef.current) {
        window.clearTimeout(scrollTimeoutRef.current)
      }
      scrollTimeoutRef.current = window.setTimeout(() => {
        setIsScrolling(false)
      }, 220)
    }

    window.addEventListener('scroll', onScrollActivity, { passive: true })
    window.addEventListener('touchmove', onScrollActivity, { passive: true })
    window.addEventListener('wheel', onScrollActivity, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScrollActivity)
      window.removeEventListener('touchmove', onScrollActivity)
      window.removeEventListener('wheel', onScrollActivity)
      if (scrollTimeoutRef.current) {
        window.clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
        recognitionRef.current = null
      }
    }
  }, [])



  useEffect(() => {
    const handleOpenLiveChat = () => {
      setIsOpen(true)
    }

    window.addEventListener(OPEN_LIVE_CHAT_EVENT, handleOpenLiveChat)
    return () => {
      window.removeEventListener(OPEN_LIVE_CHAT_EVENT, handleOpenLiveChat)
    }
  }, [])
  const appendToComposer = (text: string) => {
    setInputValue((prev) => {
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
  const loadHistory = async () => {
    try {
      const apiBase = getApiBaseUrl()
      if (user && token) {
        const response = await fetch(`${apiBase}/chat/history?limit=15`, {
          headers: { Authorization: `Bearer ${token}` }
        })

        if (response.ok) {
          const data = await response.json()
          if (data.status) {
            setConversationStatus(data.status)
          }
          if (data.messages?.length) {
            setMessages(data.messages || [])
            return true
          }
          return false
        }
      } else if (sessionId) {
        const response = await fetch(`${apiBase}/chat/guest-history?limit=15&sessionId=${encodeURIComponent(sessionId)}`)
        if (response.ok) {
          const data = await response.json()
          if (data.status) {
            setConversationStatus(data.status)
          }
          if (data.messages?.length) {
            setMessages(data.messages || [])
            return true
          }
          return false
        }
      }
    } catch (err) {
      console.error('Failed to load chat history:', err)
    }
    return false
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target
    setInputValue(textarea.value)
    
    // Auto-expand textarea height
    textarea.style.height = 'auto'
    const newHeight = Math.min(textarea.scrollHeight, 128) // 128px = max 4 lines
    textarea.style.height = newHeight + 'px'
    
    // Enable scroll if content exceeds max height
    if (textarea.scrollHeight > 128) {
      textarea.style.overflowY = 'auto'
    } else {
      textarea.style.overflowY = 'hidden'
    }
  }

  const applyTemplate = (template: string) => {
    setInputValue(template)
  }

  const applyPropertyType = (type: string) => {
    const base = "Sizing request:\nProperty type (flat/bungalow/duplex/school/hospital/factory): "
    if (inputValue.startsWith(base)) {
      const lines = inputValue.split('\n')
      lines[0] = `Sizing request:`
      lines[1] = `Property type (flat/bungalow/duplex/school/hospital/factory): ${type}`
      setInputValue(lines.join('\n'))
      return
    }
    setInputValue(
      `Sizing request:\nProperty type (flat/bungalow/duplex/school/hospital/factory): ${type}\nRooms: \nSitting rooms: \nAppliances + wattage: \nHours used per day: \nAll at once? (yes/no): \nBudget: \nLocation: `
    )
  }

  const appendAppliance = (label: string) => {
    const base = "Sizing request:\nProperty type (flat/bungalow/duplex/school/hospital/factory): "
    let nextValue = inputValue
    if (!nextValue.trim()) {
      nextValue =
        "Sizing request:\nProperty type (flat/bungalow/duplex/school/hospital/factory): \nRooms: \nSitting rooms: \nAppliances + wattage: \nHours used per day: \nAll at once? (yes/no): \nBudget: \nLocation: "
    }
    if (!nextValue.startsWith(base)) {
      nextValue =
        "Sizing request:\nProperty type (flat/bungalow/duplex/school/hospital/factory): \nRooms: \nSitting rooms: \nAppliances + wattage: \nHours used per day: \nAll at once? (yes/no): \nBudget: \nLocation: " +
        "\n\n" +
        nextValue
    }
    const lines = nextValue.split('\n')
    const applianceLineIndex = lines.findIndex((line) =>
      line.startsWith('Appliances + wattage:')
    )
    if (applianceLineIndex === -1) {
      setInputValue(nextValue)
      return
    }
    const current = lines[applianceLineIndex].replace('Appliances + wattage:', '').trim()
    const updated = current ? `${current}, ${label}` : label
    lines[applianceLineIndex] = `Appliances + wattage: ${updated}`
    setInputValue(lines.join('\n'))
  }

  const addCustomAppliance = () => {
    if (!customApplianceName.trim()) return
    const label = customApplianceWatts.trim()
      ? `${customApplianceName.trim()} (${customApplianceWatts.trim()})`
      : customApplianceName.trim()
    appendAppliance(label)
    setCustomApplianceName('')
    setCustomApplianceWatts('')
  }

  const sendMessage = async (e: React.FormEvent, messageOverride?: string) => {
    e.preventDefault()

    const draft = messageOverride ?? inputValue
    if (!draft.trim() || isLoading) return
    setShowEmojiPicker(false)

    const userMessage = draft.trim()
    if (!messageOverride) {
      setInputValue('')
    }
    setError(null)

    // Reset textarea height
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.overflowY = 'hidden'
    }

    const tempId = `temp_${Date.now()}`
    const shouldExpectAssistant = conversationStatus === 'ai'
    // Add user message to UI immediately
    const newUserMsg: Message = {
      role: 'user',
      message: userMessage
    }
    const tempAssistantMsg: Message = {
      id: tempId,
      role: 'assistant',
      message: 'Thinking...'
    }
    setMessages(prev => shouldExpectAssistant ? [...prev, newUserMsg, tempAssistantMsg] : [...prev, newUserMsg])

    setIsLoading(true)

    try {
      const apiBase = getApiBaseUrl()
      const endpoint = user && token ? '/chat/messages' : '/chat/guest-messages'
      const headers: any = {
        'Content-Type': 'application/json'
      }
      
      if (user && token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const body = user && token 
        ? { message: userMessage }
        : { message: userMessage, sessionId }

      const response = await fetch(`${apiBase}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to send message')
      }

      const data = await response.json()

      if (data.status) {
        setConversationStatus(data.status)
      }

      if (data.assistantMessage) {
        const baseDelay = 350
        const perCharDelay = Math.min(900, Math.max(200, data.assistantMessage.length * 12))
        const delay = Math.min(1200, baseDelay + perCharDelay)
        if (typingTimeoutRef.current) {
          window.clearTimeout(typingTimeoutRef.current)
        }
        typingTimeoutRef.current = window.setTimeout(() => {
          setMessages(prev => prev.map(msg => (
            msg.id === tempId
              ? { ...msg, message: data.assistantMessage, category: data.category }
              : msg
          )))
        }, delay)
      } else if (shouldExpectAssistant) {
        setMessages(prev => prev.filter(msg => msg.id !== tempId))
      }
    } catch (err: any) {
      const friendlyError = getFriendlyChatError(err?.message || err)
      setError(friendlyError)
      console.error('Chat error:', err)
      setMessages(prev => prev.map(msg => (
        msg.id === tempId
          ? { ...msg, message: friendlyError }
          : msg
      )))
    } finally {
      setIsLoading(false)
    }
  }

  const requestHumanSupport = async () => {
    if (isLoading) return
    const fakeEvent = { preventDefault: () => {} } as React.FormEvent
    await sendMessage(fakeEvent, 'I would like to speak with a human support agent.')
  }

  const handleDeleteChat = async () => {
    if (isLoading) return
    const proceed = typeof window !== 'undefined'
      ? window.confirm('Delete this chat history? This action cannot be undone.')
      : false
    if (!proceed) return

    setError(null)
    setIsLoading(true)

    try {
      const apiBase = getApiBaseUrl()
      if (user && token) {
        const response = await fetch(`${apiBase}/chat/history`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        })
        if (!response.ok) {
          const data = await response.json().catch(() => ({}))
          throw new Error(data?.message || 'Failed to delete chat history')
        }
      } else {
        const newSessionId = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
        localStorage.setItem('chat_session_id', newSessionId)
        setSessionId(newSessionId)
      }

      loadedHistoryKeyRef.current = ''
      setConversationStatus('human')
      setMessages([{ role: 'assistant', message: greetingMessage }])
    } catch (err: any) {
      setError(getFriendlyChatError(err?.message || err))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`fixed bottom-6 right-6 w-14 h-14 rounded-full text-white shadow-[0_12px_30px_rgba(16,185,129,0.35)] hover:shadow-[0_14px_36px_rgba(15,23,42,0.45)] flex items-center justify-center text-2xl transition transform hover:scale-110 z-[2147483647] bg-gradient-to-br from-emerald-500 via-teal-500 to-blue-950 ring-2 ring-emerald-200/70 ${
            isScrolling ? 'opacity-0 pointer-events-none translate-y-2' : 'opacity-100 pointer-events-auto'
          }`}
          style={{ zIndex: 2147483647 }}
          aria-label="Open RenewableZmart chat"
          title="Open RenewableZmart chat"
        >
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="w-7 h-7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
          </svg>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-[min(360px,calc(100vw-32px))] h-[min(560px,calc(100vh-48px))] bg-white dark:bg-gray-800 rounded-2xl shadow-[0_24px_60px_rgba(15,23,42,0.25)] flex flex-col z-[2147483646] border border-emerald-100/80 dark:border-gray-700 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-emerald-700 text-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="h-8 w-8 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-[10px] font-bold">
                  {conversationStatus === 'human' ? 'HM' : 'AI'}
                </span>
                <div className="min-w-0">
                  <h3 className="font-bold tracking-tight">RenewableZmart Support</h3>
                  <p className="text-xs text-emerald-100/90">
                    {conversationStatus === 'human' ? 'A human expert is joining' : 'AI assistant - Instant responses'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="hover:bg-white/10 p-1.5 rounded-full transition flex-shrink-0"
                aria-label="Close chat"
                title="Close chat"
              >
                <svg
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <path d="M4 4l12 12M16 4L4 16" />
                </svg>
              </button>
            </div>

            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <a
                href="https://wa.me/2349022298109"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs px-3 py-1 rounded-full bg-white/15 hover:bg-white/25 transition border border-white/30"
                title="Chat on WhatsApp"
                aria-label="Chat on WhatsApp"
              >
                WhatsApp
              </a>
              <button
                onClick={requestHumanSupport}
                className="text-xs px-3 py-1 rounded-full bg-white/15 hover:bg-white/25 transition border border-white/30"
                title="Request a human support agent"
              >
                {conversationStatus === 'human' ? 'Human requested' : 'Talk to a human'}
              </button>
              <button
                onClick={handleDeleteChat}
                className="text-xs px-2.5 py-1 rounded-full bg-white/15 hover:bg-white/25 transition border border-white/30"
                title="Delete chat history"
                aria-label="Delete chat history"
              >
                Clear
              </button>
            </div>
          </div>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[radial-gradient(circle_at_20%_20%,rgba(30,64,175,0.08),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(29,78,216,0.08),transparent_40%),linear-gradient(to_bottom,rgba(248,250,252,1),rgba(239,246,255,0.8))] dark:bg-gray-900">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-700 dark:text-gray-300 text-sm font-semibold">
                  Hi! I'm your AI Shopping Assistant
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Ask me about:</p>
                <ul className="text-xs text-gray-500 dark:text-gray-500 mt-3 space-y-1">
                  <li>- New products and recommendations</li>
                  <li>- Resale and discounted equipment</li>
                  <li>- Trade-in and swap services</li>
                  <li>- Vendors and store directories</li>
                  <li>- Professional installers</li>
                  <li>- Order tracking</li>
                  <li>- Billing and payment plans</li>
                  <li>- Referral commissions</li>
                </ul>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-blue-950 text-white rounded-br-md'
                      : 'bg-white/90 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-md border border-emerald-100/70 dark:border-gray-600'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{linkifyMessage(msg.message)}</p>
                  {msg.category && msg.role === 'assistant' && (
                    <p className="text-xs opacity-70 mt-1">
                      Category: {msg.category}
                    </p>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-200 dark:bg-gray-700 rounded-lg p-3 rounded-bl-none">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100 rounded-lg p-3 text-sm">
                Error: {error}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={sendMessage}
            className="relative border-t border-emerald-100/80 dark:border-gray-700 p-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur"
          >
            {showEmojiPicker && (
              <div className="absolute bottom-[94px] left-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-2xl shadow-lg p-2 flex gap-1 z-20">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      appendToComposer(emoji)
                      setShowEmojiPicker(false)
                    }}
                    className="h-8 w-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-base"
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

            <div className="flex gap-2 items-end min-h-10">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={handleInputChange}
                placeholder="Ask me anything..."
                disabled={isLoading}
                rows={1}
                className="flex-1 min-w-0 px-3 py-2 border border-emerald-200/80 dark:border-gray-600 bg-white text-gray-900 dark:bg-gray-700 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 text-sm disabled:opacity-50 resize-none overflow-hidden max-h-32 shadow-inner"
                style={{
                  width: '100%',
                  wordWrap: 'break-word',
                  whiteSpace: 'pre-wrap',
                  overflowWrap: 'break-word',
                  wordBreak: 'break-word',
                  scrollBehavior: 'smooth'
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendMessage(e as any)
                  }
                }}
              />
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="flex-shrink-0 bg-blue-950 text-white px-3 py-2 rounded-xl hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-bold h-10"
                aria-label="Send message"
              >
                {isLoading ? (
                  '...'
                ) : (
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 2L11 13" />
                    <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                  </svg>
                )}
              </button>
            </div>

            <div className="flex items-center gap-1 mt-2 text-gray-500 dark:text-gray-300">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-8 w-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-95 transition flex items-center justify-center text-lg"
                aria-label="Attach file"
                title="Attach file"
              >
                +
              </button>
              <button
                type="button"
                onClick={() => setShowEmojiPicker((v) => !v)}
                className="h-8 w-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-95 transition flex items-center justify-center text-base"
                aria-label="Emoji"
                title="Emoji"
              >
                🙂
              </button>
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="h-8 w-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-95 transition flex items-center justify-center text-base"
                aria-label="Camera"
                title="Camera"
              >
                📷
              </button>
              <button
                type="button"
                onClick={toggleVoiceInput}
                className={`h-8 w-8 rounded-full active:scale-95 transition flex items-center justify-center text-base ${
                  isRecording ? 'bg-rose-100 text-rose-600' : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                aria-label="Voice input"
                title={isRecording ? 'Stop voice input' : 'Start voice input'}
              >
                🎤
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}









