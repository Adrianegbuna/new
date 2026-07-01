import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import Header from "@/components/layout/Header";
import Link from 'next/link'
import { getApiBaseUrl } from '@/lib/apiConfig'

interface Message {
  id: string | number
  senderId: string | number
  senderName: string
  senderEmail: string
  senderType: 'customer' | 'vendor' | 'installer'
  subject: string
  message: string
  projectType?: string
  status: 'unread' | 'read' | 'replied'
  createdAt: string
  replies?: Reply[]
}

interface Reply {
  id: string | number
  senderType: 'customer' | 'vendor' | 'installer'
  senderName: string
  message: string
  createdAt: string
}

interface CurrentUser {
  id: number
  firstName: string
  lastName: string
  email: string
  accountType: string
  token: string
}

export default function InstallerInbox() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [replyText, setReplyText] = useState('')
  const [filter, setFilter] = useState<'all' | 'unread' | 'replied'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('renewablezmart_current_user') || 'null')
    if (!user) {
      router.push('/login')
      return
    }
    if (user.accountType !== 'installer') {
      router.push('/')
      return
    }
    setCurrentUser(user)
    fetchMessages()
  }, [router])

  const fetchMessages = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('renewablezmart_current_user') || 'null')
      const apiBase = getApiBaseUrl()
      const response = await fetch(`${apiBase}/messages/inbox`, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setMessages(data)
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleReply = async () => {
    if (!replyText.trim() || !selectedMessage) return

    try {
      const user = JSON.parse(localStorage.getItem('renewablezmart_current_user') || 'null')
      const apiBase = getApiBaseUrl()
      const response = await fetch(`${apiBase}/messages/${selectedMessage.id}/reply`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: replyText })
      })
      if (response.ok) {
        const updatedMessage = await response.json()
        setSelectedMessage(updatedMessage)
        const updatedMessages = messages.map(m => m.id === selectedMessage.id ? updatedMessage : m)
        setMessages(updatedMessages)
        setReplyText('')
        alert('Reply sent!')
      }
    } catch (error) {
      console.error('Error sending reply:', error)
      alert('Failed to send reply')
    }
  }

  const handleMarkAsRead = async (messageId: string | number) => {
    try {
      const user = JSON.parse(localStorage.getItem('renewablezmart_current_user') || 'null')
      const apiBase = getApiBaseUrl()
      await fetch(`${apiBase}/messages/${messageId}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      })
      const updatedMessages = messages.map(m => 
        m.id === messageId ? { ...m, status: 'read' as const } : m
      )
      setMessages(updatedMessages)
    } catch (error) {
      console.error('Error marking message as read:', error)
    }
  }

  const filteredMessages = messages.filter(msg => {
    const matchesFilter = filter === 'all' || msg.status === filter
    const matchesSearch = searchQuery === '' || 
      msg.senderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.message.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-96">
          <div className="text-xl">Loading inbox...</div>
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Inbox - RenewableZmart Installers</title>
      </Head>
      <Header />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">💬 Your Messages</h1>
          <p className="text-black font-bold">Manage inquiries from customers and vendors</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-20">
              <h3 className="font-bold text-gray-900 mb-4">Filters</h3>
              
              <div className="space-y-2 mb-6">
                <button
                  onClick={() => setFilter('all')}
                  className={`w-full text-left px-4 py-2 rounded-lg transition ${
                    filter === 'all' 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-gray-100 text-black font-bold hover:bg-gray-200'
                  }`}
                >
                  All Messages ({messages.length})
                </button>
                <button
                  onClick={() => setFilter('unread')}
                  className={`w-full text-left px-4 py-2 rounded-lg transition ${
                    filter === 'unread' 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-gray-100 text-black font-bold hover:bg-gray-200'
                  }`}
                >
                  Unread ({messages.filter(m => m.status === 'unread').length})
                </button>
                <button
                  onClick={() => setFilter('replied')}
                  className={`w-full text-left px-4 py-2 rounded-lg transition ${
                    filter === 'replied' 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-gray-100 text-black font-bold hover:bg-gray-200'
                  }`}
                >
                  Replied ({messages.filter(m => m.status === 'replied').length})
                </button>
              </div>

              <div className="text-sm text-black font-bold bg-blue-50 p-3 rounded border border-blue-200">
                🔐 Messages are private and secure. Only you and the sender can see them.
              </div>
            </div>
          </div>

          {/* Messages List */}
          <div className="lg:col-span-3">
            {filteredMessages.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <div className="text-6xl mb-4">💬</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {searchQuery ? 'No messages found' : 'Your inbox is empty'}
                </h3>
                <p className="text-black font-bold">
                  {searchQuery 
                    ? 'Try adjusting your search terms' 
                    : 'Messages from customers and vendors will appear here'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Search */}
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="🔍 Search messages..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Message List */}
                {filteredMessages.map((message) => (
                  <div
                    key={message.id}
                    onClick={() => {
                      setSelectedMessage(message)
                      if (message.status === 'unread') {
                        handleMarkAsRead(message.id)
                      }
                    }}
                    className={`p-4 rounded-lg cursor-pointer transition ${
                      selectedMessage?.id === message.id
                        ? 'bg-emerald-50 border-2 border-emerald-600'
                        : message.status === 'unread'
                        ? 'bg-white border border-gray-400 hover:border-emerald-500'
                        : 'bg-white border border-gray-200 hover:border-emerald-400'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-gray-900">
                            {message.senderName}
                          </h3>
                          {message.status === 'unread' && (
                            <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full">
                              New
                            </span>
                          )}
                          {message.status === 'replied' && (
                            <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                              Replied
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-black font-bold mt-1">{message.projectType || 'General Inquiry'}</p>
                        <p className="text-black font-bold mt-2 line-clamp-2">{message.message}</p>
                      </div>
                      <div className="text-right text-xs text-black font-semibold ml-4">
                        {new Date(message.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Message Detail Modal */}
        {selectedMessage && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              {/* Header */}
              <div className="bg-emerald-600 text-white p-6 flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold">{selectedMessage.senderName}</h2>
                  <p className="text-sm opacity-90">{selectedMessage.senderEmail}</p>
                  <p className="text-sm font-bold text-gray-900 mt-2">
                    {selectedMessage.projectType || 'General Inquiry'} • {new Date(selectedMessage.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="text-3xl hover:opacity-75"
                >
                  ×
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="mb-6 pb-6 border-b">
                  <h3 className="font-bold text-gray-900 mb-2">Message</h3>
                  <p className="text-black font-bold whitespace-pre-wrap">{selectedMessage.message}</p>
                </div>

                {/* Replies */}
                {selectedMessage.replies && selectedMessage.replies.length > 0 && (
                  <div className="mb-6 pb-6 border-b">
                    <h3 className="font-bold text-gray-900 mb-4">Conversation</h3>
                    <div className="space-y-3">
                      {selectedMessage.replies.map((reply) => (
                        <div key={reply.id} className="bg-gray-50 p-4 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-gray-900">
                              You {reply.senderType === 'installer' ? '(Installer)' : ''}
                            </span>
                            <span className="text-xs text-black font-semibold">
                              {new Date(reply.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-black font-bold whitespace-pre-wrap">{reply.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reply Form */}
                <div>
                  <h3 className="font-bold text-gray-900 mb-3">Send Reply</h3>
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={4}
                    placeholder="Type your reply..."
                    className="w-full px-4 py-2 border rounded-lg text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500 mb-3"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => setSelectedMessage(null)}
                      className="flex-1 bg-gray-200 text-black font-bold py-2 rounded-lg hover:bg-gray-300"
                    >
                      Close
                    </button>
                    <button
                      onClick={handleReply}
                      disabled={!replyText.trim()}
                      className="flex-1 bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      📤 Send Reply
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}



