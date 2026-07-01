import React, { useState } from 'react'
import Header from '@/components/layout/Header'
import { useNotifications } from '@/context/NotificationContext'
import { useRouter } from 'next/router'

type FilterType = 'all' | 'order' | 'payment' | 'job' | 'review' | 'message' | 'installment' | 'product' | 'vendor' | 'general'

export default function Notifications() {
  const router = useRouter()
  const { notifications, markAsRead, deleteNotification, markAllAsRead, deleteAll } = useNotifications()
  const [filter, setFilter] = useState<FilterType>('all')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const filteredNotifications = notifications.filter(
    (notif) => filter === 'all' || notif.type === filter
  )

  const unreadCount = filteredNotifications.filter((n) => !n.read).length

  const getColorClass = (type: string) => {
    switch (type) {
      case 'order':
        return 'border-l-4 border-blue-500 bg-blue-50'
      case 'payment':
        return 'border-l-4 border-green-500 bg-green-50'
      case 'job':
        return 'border-l-4 border-purple-500 bg-purple-50'
      case 'installment':
        return 'border-l-4 border-amber-500 bg-amber-50'
      case 'product':
        return 'border-l-4 border-indigo-500 bg-indigo-50'
      case 'vendor':
        return 'border-l-4 border-emerald-500 bg-emerald-50'
      case 'review':
        return 'border-l-4 border-pink-500 bg-pink-50'
      case 'message':
        return 'border-l-4 border-cyan-500 bg-cyan-50'
      default:
        return 'border-l-4 border-gray-500 bg-gray-50'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'order':
        return 'Orders'
      case 'payment':
        return 'Payments'
      case 'job':
        return 'Jobs'
      case 'installment':
        return 'Installments'
      case 'product':
        return 'Products'
      case 'vendor':
        return 'Vendor'
      case 'review':
        return 'Reviews'
      case 'message':
        return 'Messages'
      default:
        return 'General'
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
        return '🛒'
      case 'vendor':
        return '🏪'
      case 'review':
        return '⭐'
      case 'message':
        return '💬'
      default:
        return '🔔'
    }
  }

  const filterOptions: FilterType[] = ['all', 'order', 'payment', 'job', 'installment', 'product', 'vendor', 'review', 'message', 'general']

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Notifications</h1>
          <p className="text-gray-900 font-bold">Stay updated with your orders, messages, and system updates</p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <div className="text-3xl font-bold text-gray-900">{notifications.length}</div>
            <div className="text-sm text-gray-900 font-bold">Total Notifications</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <div className="text-3xl font-bold text-blue-600">{unreadCount}</div>
            <div className="text-sm text-gray-900 font-bold">Unread</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <div className="text-3xl font-bold text-green-600">{notifications.filter((n) => n.read).length}</div>
            <div className="text-sm text-gray-900 font-bold">Read</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-8 flex-wrap">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg transition font-semibold"
            >
              Mark All as Read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="bg-red-100 hover:bg-red-200 text-red-600 px-4 py-2 rounded-lg transition font-semibold"
            >
              🗑️ Clear All
            </button>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-xl">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Clear All Notifications?</h3>
              <p className="text-black mb-6">This action cannot be undone. All notifications will be permanently deleted.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 px-4 py-2 rounded-lg transition font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    deleteAll()
                    setShowDeleteConfirm(false)
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition font-semibold"
                >
                  Delete All
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filter Buttons */}
        {notifications.length > 0 && (
          <div className="mb-8 flex gap-2 flex-wrap">
            {filterOptions.map((option) => (
              <button
                key={option}
                onClick={() => setFilter(option)}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  filter === option
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'bg-white text-gray-900 font-bold border border-gray-400 hover:border-teal-600'
                }`}
              >
                {getTypeLabel(option)}
              </button>
            ))}
          </div>
        )}

        {/* Notifications List */}
        <div className="space-y-4">
          {filteredNotifications.length === 0 ? (
            <div className="bg-white rounded-lg p-12 text-center border border-gray-200 shadow-sm">
              <div className="text-6xl mb-4">🔔</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No Notifications</h3>
              <p className="text-black">
                {filter === 'all'
                  ? "You're all caught up! Check back later for updates."
                  : `No ${getTypeLabel(filter)} notifications yet.`}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                className={`bg-white rounded-lg p-6 shadow-sm transition hover:shadow-md cursor-pointer ${getColorClass(notif.type)} ${
                  !notif.read ? 'ring-2 ring-offset-2 ring-teal-500' : ''
                }`}
                onClick={() => {
                  if (!notif.read) {
                    markAsRead(notif.id)
                  }
                  if (notif.actionUrl) {
                    router.push(notif.actionUrl)
                  }
                }}
              >
                <div className="flex gap-4">
                  {/* Icon */}
                  <div className="text-4xl flex-shrink-0">{getIconEmoji(notif.type)}</div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-4 mb-2">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{notif.title}</h3>
                        <p className="text-xs text-gray-900 font-bold uppercase">
                          {getTypeLabel(notif.type)}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {!notif.read && (
                          <div className="inline-block bg-teal-600 text-white text-xs px-3 py-1 rounded-full font-semibold mb-2">
                            NEW
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="text-gray-900 font-bold mb-3">{notif.message}</p>

                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-900 font-bold">
                        {new Date(notif.createdAt).toLocaleDateString()}{' '}
                        {new Date(notif.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      {notif.read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteNotification(notif.id)
                          }}
                          className="text-gray-900 font-bold hover:text-red-500 transition text-2xl"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}




