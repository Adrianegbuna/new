'use client';

import React from 'react';

export type AdminChatNotification = {
  conversationId: string;
  userId: string | null;
  sessionId?: string | null;
  displayName: string;
  lastMessage: string;
  lastMessageRole?: 'user' | 'assistant' | 'human';
  lastResponderName?: string | null;
  createdAt: string;
  unreadCount: number;
};

type Props = {
  notificationList: AdminChatNotification[];
  activeChatUserId: string | null;
  onSelect: (item: AdminChatNotification) => void;
};

export function AdminChatNotificationList({ notificationList, activeChatUserId, onSelect }: Props) {
  return (
    <div className="w-full rounded-2xl border border-blue-100 bg-white shadow-sm">
      <div className="px-4 py-3 border-b border-blue-100">
        <h3 className="text-base font-bold text-slate-900">Chat Notifications</h3>
      </div>
      <div className="max-h-[360px] overflow-y-auto">
        {notificationList.length === 0 ? (
          <div className="px-4 py-8 text-sm text-slate-500">No new chat messages.</div>
        ) : (
          notificationList.map((item) => {
            const isActive = activeChatUserId === item.conversationId;
            return (
              <button
                key={item.conversationId}
                type="button"
                onClick={() => onSelect(item)}
                className={`w-full px-4 py-3 text-left border-b border-blue-50 hover:bg-blue-50 transition ${
                  isActive ? 'bg-blue-50' : 'bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold text-slate-900">{item.displayName}</p>
                  {item.unreadCount > 0 && (
                    <span className="min-w-6 h-6 px-2 rounded-full bg-blue-900 text-white text-xs font-bold inline-flex items-center justify-center">
                      {item.unreadCount}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-700 mt-1 line-clamp-2">{item.lastMessage || 'New message'}</p>
                {item.lastMessageRole === 'human' && item.lastResponderName ? (
                  <p className="text-[11px] mt-1 inline-flex items-center rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 font-semibold">
                    Responded by {item.lastResponderName}
                  </p>
                ) : null}
                <p className="text-xs text-slate-500 mt-1">{new Date(item.createdAt).toLocaleString()}</p>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
