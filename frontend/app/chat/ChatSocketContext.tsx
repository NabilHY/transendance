'use client';

import { createContext, useContext } from 'react';

export type ChatSocketContextType = {
  socket: WebSocket | null;
  sendMessage: (payload: any) => void;
};

const ChatSocketContext = createContext<ChatSocketContextType | null>(null);

export const useChatSocket = () => {
  const ctx = useContext(ChatSocketContext);
  if (!ctx) {
    throw new Error('useChatSocket must be used inside ChatSocketProvider');
  }
  return ctx;
};

export default ChatSocketContext;
