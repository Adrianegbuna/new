'use client';

import React, { useEffect, useMemo, useRef } from 'react';

export type AdminChatUser = {
  conversationId: string;
  userId: string | null;
  sessionId?: string | null;
  displayName: string;
};

export type AdminChatMessage = {
  id?: string;
  role: 'user' | 'assistant' | 'human';
  message: string;
  createdAt?: string;
};

type Props = {
  isChatOpen: boolean;
  activeChatUser: AdminChatUser | null;
  messages: AdminChatMessage[];
  messageInput: string;
  sending: boolean;
  onClose: () => void;
  onMessageInputChange: (value: string) => void;
  onSendMessage: () => void;
};

export function AdminFloatingChat({
  isChatOpen,
  activeChatUser,
  messages,
  messageInput,
  sending,
  onClose,
  onMessageInputChange,
  onSendMessage,
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isChatOpen) return;
    const node = scrollerRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, isChatOpen]);

  const title = useMemo(() => activeChatUser?.displayName || 'Chat', [activeChatUser]);

  if (!isChatOpen || !activeChatUser) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[120] w-[360px] sm:w-[420px] max-w-[calc(100vw-24px)] rounded-2xl border border-blue-200 bg-white shadow-2xl overflow-hidden">
      <div className="px-4 py-3 bg-blue-950 text-white flex items-center justify-between">
        <div>
          <p className="text-xs opacity-80">Active chat</p>
          <p className="text-sm font-bold truncate">{title}</p>
        </div>
        <button type="button" onClick={onClose} className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20">
          ✕
        </button>
      </div>

      <div ref={scrollerRef} className="h-[360px] overflow-y-auto px-3 py-3 space-y-2 bg-slate-50">
        {messages.length === 0 ? (
          <p className="text-sm text-slate-500">No messages yet.</p>
        ) : (
          messages.map((m, index) => {
            const mine = m.role === 'human';
            return (
              <div key={m.id || `${m.createdAt || 'm'}-${index}`} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                    mine ? 'bg-blue-900 text-white' : 'bg-white border border-slate-200 text-slate-900'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.message}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-blue-100 p-3 bg-white">
        <div className="flex gap-2">
          <input
            value={messageInput}
            onChange={(e) => onMessageInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSendMessage();
              }
            }}
            placeholder="Type a message..."
            className="flex-1 h-11 rounded-xl border border-slate-300 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={onSendMessage}
            disabled={sending || !messageInput.trim()}
            className="h-11 px-4 rounded-xl bg-blue-900 text-white font-semibold disabled:opacity-50"
          >
            {sending ? '...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}

