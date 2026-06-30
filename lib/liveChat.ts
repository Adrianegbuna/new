export const OPEN_LIVE_CHAT_EVENT = 'rz:open-live-chat';

export function openLiveChatPopup() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(OPEN_LIVE_CHAT_EVENT));
}
