import React, { useState } from 'react'
import Link from 'next/link'
import { useNotifications } from '@/context/NotificationContext'
import { useRouter } from 'next/router'

type NotificationBellProps = {
  externalUnreadCount?: number
  externalLabel?: string
  externalActionUrl?: string
}

export default function NotificationBell({
  externalUnreadCount = 0,
  externalLabel = 'Live Chat Inbox',
  externalActionUrl = '/admin/chat',
}: NotificationBellProps) {
  const router = useRouter()
  const { notifications, unreadCount, markAsRead, deleteNotification, markAllAsRead } = useNotifications()
  const [isOpen, setIsOpen] = useState(false)
  const mergedUnreadCount = Math.max(0, Number(unreadCount || 0) + Number(externalUnreadCount || 0))

  const recentNotifications = notifications.slice(0, 5)

  const getColorClass = (type: string) => {
    switch (type) {
      case 'order':
      case 'payment':
        return 'bg-blue-50 border-l-4 border-blue-500'
      case 'job':
        return 'bg-green-50 border-l-4 border-green-500'
      case 'installment':
      case 'product':
        return 'bg-purple-50 border-l-4 border-purple-500'
      case 'vendor':
        return 'bg-amber-50 border-l-4 border-amber-500'
      case 'review':
        return 'bg-pink-50 border-l-4 border-pink-500'
      case 'message':
        return 'bg-cyan-50 border-l-4 border-cyan-500'
      default:
        return 'bg-gray-50 border-l-4 border-gray-700'
    }
  }

  const getIconEmoji = (type: string) => {
    switch (type) {
      case 'order':
        return '📦'
      case 'payment':
        return '💳'
      case 'job':
        return '💼'
      case 'installment':
        return '💰'
      case 'product':
        return '📝'
      case 'vendor':
        return '✅'
      case 'review':
        return '⭐'
      case 'message':
        return '💬'
      default:
        return '🔔'
    }
  }

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setIsOpen((prev) => !prev)
        }}
        className="relative p-2 text-gray-900 font-bold dark:text-white hover:text-teal-600 transition flex items-center gap-2 select-none"
        aria-label="Notifications"
        style={{ touchAction: 'manipulation' }}
      >
        <div className="text-2xl">🔔</div>
        {mergedUnreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">
            {mergedUnreadCount > 99 ? '99+' : mergedUnreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[90vw] max-w-sm sm:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl z-50 border border-gray-200 dark:border-gray-700">
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-t-lg">
            <h3 className="text-lg font-bold">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  markAllAsRead()
                }}
                className="text-sm bg-white/20 hover:bg-white/30 px-3 py-1 rounded transition"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 && externalUnreadCount <= 0 ? (
              <div className="p-8 text-center text-black">
                <div className="text-4xl mb-2">🔔</div>
                <p>No notifications yet</p>
              </div>
            ) : (
              <div className="space-y-0">
                {externalUnreadCount > 0 && (
                  <div
                    className="p-4 border-b border-gray-100 hover:bg-gray-50 transition cursor-pointer bg-emerald-50 border-l-4 border-emerald-600 font-semibold"
                    onClick={() => {
                      setIsOpen(false)
                      router.push(externalActionUrl)
                    }}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex gap-3 flex-1">
                        <span className="text-2xl flex-shrink-0">💬</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{externalLabel}</p>
                          <p className="text-sm text-gray-800 font-semibold line-clamp-2">
                            You have {externalUnreadCount} new chat message{externalUnreadCount > 1 ? 's' : ''}.
                          </p>
                        </div>
                      </div>
                      <span className="min-w-6 h-6 px-2 rounded-full bg-red-600 text-white text-xs font-bold inline-flex items-center justify-center">
                        {externalUnreadCount > 99 ? '99+' : externalUnreadCount}
                      </span>
                    </div>
                  </div>
                )}
                {recentNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition cursor-pointer ${getColorClass(notif.type)} ${
                      !notif.read ? 'font-semibold' : 'font-semibold'
                    }`}
                    onClick={() => {
                      if (!notif.read) {
                        markAsRead(notif.id)
                      }
                      if (notif.actionUrl) {
                        setIsOpen(false)
                        router.push(notif.actionUrl)
                      }
                    }}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex gap-3 flex-1">
                        <span className="text-2xl flex-shrink-0">{getIconEmoji(notif.type)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{notif.title}</p>
                          <p className="text-sm text-gray-800 font-semibold line-clamp-2">{notif.message}</p>
                          <p className="text-xs text-gray-900 font-bold mt-1">
                            {new Date(notif.createdAt).toLocaleDateString()}{' '}
                            {new Date(notif.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteNotification(notif.id)
                        }}
                        className="text-black hover:text-red-500 transition"
                        title="Delete"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer - Link to all notifications */}
          {(notifications.length > 0 || externalUnreadCount > 0) && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 rounded-b-lg text-center">
              <Link
                href="/notifications"
                onClick={() => setIsOpen(false)}
                className="text-teal-600 hover:text-teal-700 font-semibold text-sm inline-block hover:underline"
              >
                View All Notifications →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}

