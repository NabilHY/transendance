'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Conversation, getConversation, Message } from '@/lib/chat';
import ChatWindow from '@/components/ChatWindow';
import { fetchCurrentUser } from '@/lib/fetcher';
import { User } from '@/app/settings/page';
import { useChatSocket } from '../ChatSocketContext';

const Page = () => {
  const { id } = useParams() as { id: string };
  const { socket } = useChatSocket();

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    fetchCurrentUser().then(setCurrentUser);
    getConversation(id).then(setConversation);
    fetchMessages(id);
  }, [id]);

  const fetchMessages = async (id: string) => {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_USR_MANAG_URL}/chat/${id}/messages`,
      { credentials: "include" }
    );

    const data = await res.json();
    // console.log("messges fetched: ", data);
    
    setMessages(res.ok ? data : []);
  };

  useEffect(() => {
    if (!socket) return;

    socket.onmessage = (event: any) => {
      const msg: Message = JSON.parse(event.data);

      if (msg.channel_id === id) {
        setMessages(prev => [...prev, msg]);
      }
    };
  }, [socket, id]);

  if (!currentUser || !conversation) return null;

  return (
    <main style={{ height: 'calc(100dvh - 60px)' }}>
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
