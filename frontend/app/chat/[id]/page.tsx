'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Conversation, getConversation, Message } from '@/lib/chat';
import ChatWindow from '@/components/ChatWindow';
import { fetchCurrentUser } from '@/lib/fetcher';
import { User } from '@/app/settings/page';
import { useChatSocket } from '../ChatSocketContext';
import { getUserMgmtBase } from '@/lib/api-config';

const getMessageKey = (msg: Partial<Message>) => {
  const anyMsg = msg as any;
  if (anyMsg?.id) return `id:${String(anyMsg.id)}`;
  if (anyMsg?.uuid) return `uuid:${String(anyMsg.uuid)}`;
  return `sig:${String(anyMsg?.sender_id ?? '')}|${String(anyMsg?.sent_at ?? '')}|${String(anyMsg?.content ?? '')}`;
};

const dedupeMessages = (items: Message[]) => {
  const seen = new Set<string>();
  const result: Message[] = [];
  for (const item of items) {
    const key = getMessageKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
};

const Page = () => {
  const { id } = useParams() as { id: string };
  const { socket } = useChatSocket();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    fetchCurrentUser().then(setCurrentUser);
    getConversation(id).then(setConversation).then(() => {
      // fetchMessages(id);
      console.log("fetched: ", conversation);
      
    });
    fetchMessages(id);
  }, [id]);

  const fetchMessages = async (id: string) => {
    const baseUrl = getUserMgmtBase();
    const res = await fetch(
      `${baseUrl}/chat/${id}/messages`,
      { credentials: "include" }
    );

    const data = await res.json();
    // console.log("messges fetched: ", data);

    setMessages(res.ok ? dedupeMessages(data) : []);
  };

  useEffect(() => {
    if (!socket) return;

    socket.onmessage = (event: any) => {
      const msg: Message = JSON.parse(event.data);

      if (String((msg as any)?.channel_id) === String(id)) {
        setMessages((prev) => {
          const incomingKey = getMessageKey(msg);
          if (prev.some((m) => getMessageKey(m) === incomingKey)) return prev;
          return [...prev, msg];
        });
      }
    };
  }, [socket, id]);

  if (!currentUser || !conversation) return null;

  return (
    <main style={{ height: '100dvh' }}>
      <ChatWindow
        messages={messages}
        setMessages={setMessages}
        conversation={conversation}
        currentUser={currentUser}
      />
    </main>
  );
};

export default Page;
