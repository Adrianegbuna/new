'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { apiClient } from '@/lib/api-client';
import { getApiBaseUrl } from '@/lib/apiConfig';
import { AdminChatNotificationList, type AdminChatNotification } from './AdminChatNotificationList';
import { AdminFloatingChat, type AdminChatMessage, type AdminChatUser } from './AdminFloatingChat';

const ADMIN_CHAT_SEEN_EVENT = 'rz_admin_chat_seen';

type ConversationSummary = {
  id: string;
  userId?: string | null;
  sessionId?: string | null;
  phone: string | null;
  displayName?: string;
  status: 'ai' | 'human';
  channel: 'web' | 'whatsapp';
  lastMessage: string;
  timestamp: string;
};

export const AdminChatInbox: React.FC = () => {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);

  const [notificationList, setNotificationList] = useState<AdminChatNotification[]>([]);
  const [activeChatUser, setActiveChatUser] = useState<AdminChatUser | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const [messagesByConversation, setMessagesByConversation] = useState<Record<string, AdminChatMessage[]>>({});
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const unreadBeforeRef = useRef<Record<string, number>>({});

  const normalizeMessages = useCallback((incoming: any[]): AdminChatMessage[] => {
    return incoming
      .map((msg: any, index: number) => ({
        id: msg?.id ? String(msg.id) : `msg-${index}`,
        role: (String(msg?.role || 'user') as AdminChatMessage['role']),
        message: String(msg?.message ?? msg?.content ?? '').trim(),
        createdAt: msg?.createdAt ? String(msg.createdAt) : undefined,
      }))
      .filter((msg) => msg.message.length > 0);
  }, []);

  const mapConversationToNotification = useCallback((c: ConversationSummary): AdminChatNotification => ({
    conversationId: c.id,
    userId: c.userId || null,
    sessionId: c.sessionId || null,
    displayName: c.displayName || (c.phone ? `User ${c.phone}` : 'Web User'),
    lastMessage: c.lastMessage || '',
    lastMessageRole: c.status === 'human' ? 'human' : 'user',
    lastResponderName: null,
    createdAt: c.timestamp || new Date().toISOString(),
    unreadCount: 0,
  }), []);

  const seedConversationPreview = useCallback((item: AdminChatNotification) => {
    const previewText = String(item.lastMessage || '').trim();
    if (!previewText) return;

    setMessagesByConversation((prev) => {
      const existing = prev[item.conversationId] || [];
      if (existing.length > 0) return prev;

      return {
        ...prev,
        [item.conversationId]: [
          {
            id: `preview-${item.conversationId}`,
            role: 'user',
            message: previewText,
            createdAt: item.createdAt || new Date().toISOString(),
          },
        ],
      };
    });
  }, []);

  const upsertNotification = useCallback((item: AdminChatNotification, unreadInc: number) => {
    setNotificationList((prev) => {
      const next = [...prev];
      const index = next.findIndex((n) => n.conversationId === item.conversationId);

      if (index >= 0) {
        const existing = next[index];
        next[index] = {
          ...existing,
          ...item,
          unreadCount: Math.max(0, (existing.unreadCount || 0) + unreadInc),
        };
      } else {
        next.unshift({ ...item, unreadCount: Math.max(0, unreadInc) });
      }

      return next.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    });
  }, []);

  const playIncomingTone = useCallback(() => {
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx();
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.value = 0.0001;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      gain.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch {
      // Ignore audio notification failures.
    }
  }, []);

  const pushBrowserNotification = useCallback((title: string, body: string) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      try {
        new Notification(title, { body });
      } catch {
        // Ignore notification errors.
      }
      return;
    }
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {
        // Ignore permission prompt errors.
      });
    }
  }, []);

  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/admin/conversations');
      const incoming = Array.isArray(res.data?.conversations) ? res.data.conversations : [];
      setConversations(incoming);

      setNotificationList((prev) => {
        const prevMap = new Map(prev.map((item) => [item.conversationId, item]));
        return incoming
          .map((conv: ConversationSummary) => {
            const base = mapConversationToNotification(conv);
            const existing = prevMap.get(base.conversationId);
            return existing
              ? {
                  ...base,
                  unreadCount: existing.unreadCount || 0,
                  lastMessageRole: existing.lastMessageRole || base.lastMessageRole,
                  lastResponderName: existing.lastResponderName || null,
                }
              : base;
          })
          .sort((a: AdminChatNotification, b: AdminChatNotification) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      });

      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  }, [mapConversationToNotification]);

  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      const res = await apiClient.get(`/admin/conversations/${conversationId}/messages`);
      const rawList = Array.isArray(res.data?.messages)
        ? res.data.messages
        : Array.isArray(res.data)
          ? res.data
          : [];
      const list = normalizeMessages(rawList);
      setMessagesByConversation((prev) => {
        const existing = prev[conversationId] || [];
        // Keep preview/known messages if backend temporarily returns empty.
        if (list.length === 0 && existing.length > 0) return prev;
        return { ...prev, [conversationId]: list };
      });
    } catch {
      setMessagesByConversation((prev) => prev);
    }
  }, [normalizeMessages]);

  const fetchExpandedMessages = useCallback(async (item: AdminChatNotification) => {
    const conversationId = String(item.conversationId || '').trim();
    if (!conversationId) return;

    try {
      const convRes = await apiClient.get('/admin/conversations');
      const allConversations: ConversationSummary[] = Array.isArray(convRes?.data?.conversations)
        ? convRes.data.conversations
        : [];

      const normalizedName = String(item.displayName || '').trim().toLowerCase();
      const canUseName = normalizedName.length > 0 && !['guest user', 'web user'].includes(normalizedName);

      const relatedIds = Array.from(
        new Set(
          allConversations
            .filter((conv) => {
              if (String(conv.id || '') === conversationId) return true;
              if (item.userId && conv.userId && String(conv.userId) === String(item.userId)) return true;
              if (item.sessionId && conv.sessionId && String(conv.sessionId) === String(item.sessionId)) return true;
              if (canUseName) {
                const convName = String(conv.displayName || '').trim().toLowerCase();
                if (convName && convName === normalizedName) return true;
              }
              return false;
            })
            .map((conv) => String(conv.id || '').trim())
            .filter(Boolean)
        )
      );

      if (!relatedIds.includes(conversationId)) {
        relatedIds.push(conversationId);
      }

      const results = await Promise.all(
        relatedIds.map(async (id) => {
          try {
            const msgRes = await apiClient.get(`/admin/conversations/${id}/messages`);
            const rawList = Array.isArray(msgRes?.data?.messages)
              ? msgRes.data.messages
              : Array.isArray(msgRes?.data)
                ? msgRes.data
                : [];
            return normalizeMessages(rawList);
          } catch {
            return [];
          }
        })
      );

      const merged = results.flat();
      const dedupedMap = new Map<string, AdminChatMessage>();
      for (const msg of merged) {
        const key = String(msg.id || `${msg.role}:${msg.createdAt || ''}:${msg.message}`);
        if (!dedupedMap.has(key)) dedupedMap.set(key, msg);
      }

      const sorted = Array.from(dedupedMap.values()).sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return aTime - bTime;
      });

      setMessagesByConversation((prev) => ({
        ...prev,
        [conversationId]: sorted,
      }));
    } catch {
      await fetchMessages(conversationId);
    }
  }, [fetchMessages, normalizeMessages]);

  useEffect(() => {
    fetchConversations();
    const interval = window.setInterval(fetchConversations, 12000);
    return () => window.clearInterval(interval);
  }, [fetchConversations]);

  useEffect(() => {
    const socket = io(getApiBaseUrl(), { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_admin');
    });

    socket.on('new_message', (payload: any) => {
      const conversationId = String(payload?.conversationId || '').trim();
      if (!conversationId) return;

      const role = String(payload?.role || 'user') as 'user' | 'assistant' | 'human';
      const message = String(payload?.message ?? payload?.content ?? '').trim();
      if (!message) return;
      const createdAt = String(payload?.createdAt || new Date().toISOString());
      const userId = payload?.userId ? String(payload.userId) : null;
      const sessionId = payload?.sessionId ? String(payload.sessionId) : null;
      const responderName = payload?.adminName ? String(payload.adminName).trim() : null;
      const displayName = String(payload?.displayName || (userId ? `User ${userId.slice(0, 8)}` : 'Web User'));
      const latestMessageAt = createdAt;

      setMessagesByConversation((prev) => {
        const current = prev[conversationId] || [];
        const nextId = payload?.id ? String(payload.id) : `${conversationId}-${createdAt}-${current.length}`;
        const exists = current.some((item) => String(item.id || '') === nextId);
        if (exists) return prev;
        const entry: AdminChatMessage = {
          id: nextId,
          role,
          message,
          createdAt,
        };
        return { ...prev, [conversationId]: [...current, entry] };
      });

      setConversations((prev) => {
        const current = [...prev];
        const existingIndex = current.findIndex((c) => String(c.id) === conversationId);
        const incomingConversation: ConversationSummary = existingIndex >= 0
          ? {
              ...current[existingIndex],
              displayName: displayName || current[existingIndex].displayName,
              lastMessage: message,
              timestamp: latestMessageAt,
              status: role === 'user' ? 'human' : current[existingIndex].status,
            }
          : {
              id: conversationId,
              userId,
              sessionId,
              phone: null,
              displayName,
              status: role === 'user' ? 'human' : 'ai',
              channel: 'web',
              lastMessage: message,
              timestamp: latestMessageAt,
            };

        const without = existingIndex >= 0
          ? current.filter((c) => String(c.id) !== conversationId)
          : current;
        return [incomingConversation, ...without];
      });

      const isCurrent = isChatOpen && activeChatUser?.conversationId === conversationId;
      const shouldAlert = role === 'user' && !isCurrent;
      upsertNotification(
        {
          conversationId,
          userId,
          sessionId,
          displayName,
          lastMessage: message,
          lastMessageRole: role,
          lastResponderName: role === 'human' ? responderName : null,
          createdAt,
          unreadCount: 0,
        },
        shouldAlert ? 1 : 0
      );

      if (shouldAlert) {
        playIncomingTone();
        pushBrowserNotification(`New chat: ${displayName || 'Customer'}`, message.slice(0, 140));
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [activeChatUser?.conversationId, isChatOpen, upsertNotification]);

  useEffect(() => {
    if (!isChatOpen || !activeChatUser?.conversationId) return;
    const conversationId = activeChatUser.conversationId;

    fetchMessages(conversationId);
    const interval = window.setInterval(() => {
      fetchMessages(conversationId);
    }, 2500);

    return () => window.clearInterval(interval);
  }, [activeChatUser?.conversationId, fetchMessages, isChatOpen]);

  const handleNotificationClick = useCallback(
    async (item: AdminChatNotification) => {
      seedConversationPreview(item);
      setActiveChatUser({
        conversationId: item.conversationId,
        userId: item.userId,
        sessionId: item.sessionId || null,
        displayName: item.displayName,
      });
      setIsChatOpen(true);
      setNotificationList((prev) =>
        prev.map((n) => (n.conversationId === item.conversationId ? { ...n, unreadCount: 0 } : n))
      );
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent(ADMIN_CHAT_SEEN_EVENT, {
            detail: { conversationId: item.conversationId },
          })
        );
      }
      await fetchExpandedMessages(item);
    },
    [fetchExpandedMessages, seedConversationPreview]
  );

  const handleSendMessage = useCallback(async () => {
    if (!activeChatUser?.conversationId || !messageInput.trim()) return;

    const conversationId = activeChatUser.conversationId;
    const outbound = messageInput.trim();
    const userId = activeChatUser.userId;
    const sessionId = activeChatUser.sessionId || null;

    setSending(true);
    try {
      setMessagesByConversation((prev) => ({
        ...prev,
        [conversationId]: [
          ...(prev[conversationId] || []),
          {
            id: `temp-${Date.now()}`,
            role: 'human',
            message: outbound,
            createdAt: new Date().toISOString(),
          },
        ],
      }));

      socketRef.current?.emit('send_message', {
        userId,
        sessionId,
        conversationId,
        message: outbound,
      });

      await apiClient.post(`/admin/conversations/${conversationId}/reply`, { message: outbound });

      setMessageInput('');
      await fetchMessages(conversationId);
      await fetchConversations();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to send reply');
      await fetchMessages(conversationId);
    } finally {
      setSending(false);
    }
  }, [activeChatUser?.conversationId, activeChatUser?.sessionId, activeChatUser?.userId, fetchConversations, fetchMessages, messageInput]);

  const activeMessages = useMemo(() => {
    if (!activeChatUser?.conversationId) return [];
    return messagesByConversation[activeChatUser.conversationId] || [];
  }, [activeChatUser?.conversationId, messagesByConversation]);

  const notificationByConversation = useMemo(() => {
    return new Map(notificationList.map((item) => [item.conversationId, item]));
  }, [notificationList]);

  useEffect(() => {
    const previous = unreadBeforeRef.current;
    for (const item of notificationList) {
      const before = previous[item.conversationId] || 0;
      if (item.unreadCount > before && item.unreadCount > 0) {
        previous[item.conversationId] = item.unreadCount;
      } else {
        previous[item.conversationId] = item.unreadCount;
      }
    }
    unreadBeforeRef.current = previous;
  }, [notificationList]);

  return (
    <div className="w-full bg-gray-50 rounded-2xl border border-blue-100 shadow-sm">
      <div className="px-6 py-4 border-b border-blue-100 bg-white rounded-t-2xl flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Admin Chat Center</h2>
          <p className="text-sm text-slate-600">Multi-user live chat notifications with floating reply.</p>
        </div>
        <button
          onClick={fetchConversations}
          className="px-4 py-2 rounded-lg bg-blue-900 text-white font-semibold hover:bg-blue-950 transition"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr]">
        <div className="p-4 border-r border-blue-100 bg-white">
          {loading ? <p className="text-sm text-slate-600 mb-3">Loading...</p> : null}
          {error ? <p className="text-sm text-red-600 mb-3">{error}</p> : null}

          <AdminChatNotificationList
            notificationList={notificationList}
            activeChatUserId={activeChatUser?.conversationId || null}
            onSelect={handleNotificationClick}
          />
        </div>

        <div className="p-6 bg-white min-h-[520px]">
          <h3 className="text-lg font-bold text-slate-900 mb-2">Users</h3>
          <div className="rounded-xl border border-slate-200 bg-slate-50 max-h-[460px] overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-5 text-sm text-slate-500">No conversations yet.</div>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    const previewText = String(
                      notificationByConversation.get(c.id)?.lastMessage || c.lastMessage || ''
                    ).trim();
                    handleNotificationClick({
                      conversationId: c.id,
                      userId: c.userId || null,
                      sessionId: c.sessionId || null,
                      displayName: c.displayName || 'Web User',
                      lastMessage: previewText,
                      createdAt: c.timestamp || new Date().toISOString(),
                      unreadCount: 0,
                    });
                  }}
                  className="w-full text-left px-4 py-3 border-b border-slate-200 hover:bg-white transition"
                >
                  <p className="font-semibold text-slate-900">{c.displayName || 'Web User'}</p>
                  <p className="text-sm text-slate-600 line-clamp-1">
                    {notificationByConversation.get(c.id)?.lastMessage || c.lastMessage || 'No messages yet'}
                  </p>
                  {notificationByConversation.get(c.id)?.lastMessageRole === 'human' &&
                  notificationByConversation.get(c.id)?.lastResponderName ? (
                    <p className="text-[11px] mt-1 inline-flex items-center rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 font-semibold">
                      Responded by {notificationByConversation.get(c.id)?.lastResponderName}
                    </p>
                  ) : null}
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      <AdminFloatingChat
        isChatOpen={isChatOpen}
        activeChatUser={activeChatUser}
        messages={activeMessages}
        messageInput={messageInput}
        sending={sending}
        onClose={() => setIsChatOpen(false)}
        onMessageInputChange={setMessageInput}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
};
