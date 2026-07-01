import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { getApiBaseUrl } from '@/lib/apiConfig'
import { useAuthStore } from '@/store/authStore'

export interface Notification {
  id: string
  userId: string
  type: 'order' | 'payment' | 'job' | 'review' | 'message' | 'installment' | 'product' | 'vendor' | 'general'
  title: string
  message: string
  relatedId?: string
  read: boolean
  createdAt: Date
  actionUrl?: string
  icon?: string
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple'
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  deleteNotification: (id: string) => void
  deleteAll: () => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const { token, user, isHydrated } = useAuthStore()

  // Load notifications from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('user_notifications')
    if (saved) {
      try {
        const parsed = JSON.parse(saved).map((n: any) => ({
          ...n,
          createdAt: new Date(n.createdAt),
        }))
        setNotifications(parsed)
        updateUnreadCount(parsed)
      } catch (error) {
        console.error('Failed to load notifications:', error)
      }
    }
  }, [])

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('user_notifications', JSON.stringify(notifications))
  }, [notifications])

  // Clear notifications on logout
  useEffect(() => {
    if (!isHydrated) return
    if (token) return
    setNotifications([])
    setUnreadCount(0)
    localStorage.removeItem('user_notifications')
  }, [isHydrated, token])

  useEffect(() => {
    let isCancelled = false

    const fetchServerNotifications = async () => {
      if (!isHydrated || !token) return

      try {
        const apiBase = getApiBaseUrl()
        const response = await fetch(`${apiBase}/notifications`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          return
        }

        const payload = await response.json()
        const serverNotifications = (payload?.data || []).map((n: any) => ({
          id: n.id,
          userId: n.userId || user?.id || '',
          type: 'general' as const,
          title: n.title || 'Notification',
          message: n.message || '',
          relatedId: n.serviceRequestId || n.relatedId,
          read: Boolean(n.isRead ?? n.read),
          createdAt: new Date(n.createdAt || Date.now()),
          actionUrl: n.actionUrl,
        }))

        if (isCancelled) return

        setNotifications((prev) => {
          const localOnly = prev.filter((n) => String(n.id).startsWith('notif_'))
          const merged = [...serverNotifications, ...localOnly]
          updateUnreadCount(merged)
          return merged
        })
      } catch (error) {
        console.error('Failed to sync notifications from server:', error)
      }
    }

    fetchServerNotifications()

    const intervalId = window.setInterval(fetchServerNotifications, 30000)
    const onFocus = () => fetchServerNotifications()
    window.addEventListener('focus', onFocus)

    return () => {
      isCancelled = true
      window.clearInterval(intervalId)
      window.removeEventListener('focus', onFocus)
    }
  }, [isHydrated, token, user?.id])

  const updateUnreadCount = (notifs: Notification[]) => {
    const count = notifs.filter((n) => !n.read).length
    setUnreadCount(count)
  }

  const addNotification = (notification: Omit<Notification, 'id' | 'createdAt'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random()}`,
      createdAt: new Date(),
    }

    setNotifications((prev) => {
      const updated = [newNotification, ...prev]
      updateUnreadCount(updated)
      return updated
    })
  }

  const markAsRead = (id: string) => {
    if (token) {
      const apiBase = getApiBaseUrl()
      fetch(`${apiBase}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }).catch((error) => {
        console.warn('Failed to mark notification as read on server:', error)
      })
    }

    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      updateUnreadCount(updated)
      return updated
    })
  }

  const markAllAsRead = () => {
    if (token) {
      const apiBase = getApiBaseUrl()
      fetch(`${apiBase}/notifications/read-all`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }).catch((error) => {
        console.warn('Failed to mark all notifications as read on server:', error)
      })
    }

    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }))
      updateUnreadCount(updated)
      return updated
    })
  }

  const deleteNotification = (id: string) => {
    if (token) {
      const apiBase = getApiBaseUrl()
      fetch(`${apiBase}/notifications/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }).catch((error) => {
        console.warn('Failed to delete notification on server:', error)
      })
    }
    setNotifications((prev) => {
      const updated = prev.filter((n) => n.id !== id)
      updateUnreadCount(updated)
      return updated
    })
  }

  const deleteAll = () => {
    if (token) {
      const apiBase = getApiBaseUrl()
      fetch(`${apiBase}/notifications`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }).catch((error) => {
        console.warn('Failed to delete all notifications on server:', error)
      })
    }
    setNotifications([])
    setUnreadCount(0)
  }

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAll,
  }

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

export const useNotifications = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider')
  }
  return context
}
