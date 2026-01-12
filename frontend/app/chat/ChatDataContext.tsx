'use client';

import { createContext, useContext } from 'react';
import { Conversation } from '@/lib/chat';

type ChatDataContextType = {
  conversations: Conversation[];
  refreshConversations: () => Promise<void>;
  setConversations: (conversations: Conversation[]) => void;
};

const ChatDataContext = createContext<ChatDataContextType | null>(null);

export const useChatData = () => {
  const ctx = useContext(ChatDataContext);
  if (!ctx) {
    throw new Error('useChatData must be used inside ChatDataProvider');
  }
  return ctx;
};

export default ChatDataContext;
