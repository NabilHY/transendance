'use client'
import { useParams } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { Conversation, getChannelName, getConversation, Message } from '@/lib/chat'
import { useAuth } from '@/context/AuthContext'
// import { User } from '@/app/settings/page'
import ChatWindow from '@/components/ChatWindow'
import Chat from '../page'
import { User } from '@/app/settings/page'
import { fetchCurrentUser } from '@/lib/fetcher'

const page = () => {

  const params = useParams() as { id: string };
  const [channelId, setChannelId] = useState<string>(params.id);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const { user } = useAuth();
  const [isSuccess, setIsSuccess] = useState<boolean>(false);


  const getMessages = async (id: string) => {
    try {
      console.log("trying to fetch from: ", `${process.env.NEXT_PUBLIC_USR_MANAG_URL}/chat/${id}/messages`);
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_USR_MANAG_URL}/chat/${id}/messages`, {
        method: "GET",
        credentials: "include",
      });
      if (!res.ok)
        throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      console.log("* messages: ", data);
      return data;
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
      return [];
    }
  };

  useEffect(() => {

    let websocket: WebSocket | null = null;

    const run = async () => {

    // ! * WARNING: this test just for testing, I must removed it later
    const res = await fetch(`${process.env.NEXT_PUBLIC_USR_MANAG_URL}/users`, {
      method: "GET",
      credentials: "include"
    });

    const currentUser = await fetchCurrentUser();

    setCurrentUser(currentUser);

    if (!currentUser) {
      console.error("No current user, cannot establish WebSocket connection.");
      return;
    }

    const connectWebSocket = () => {
      // ! WARNING: this works twice, need to fix it later
      websocket = new WebSocket(`${process.env.NEXT_PUBLIC_CHAT_URL}/ws?userId=${currentUser.id}`);

      websocket.onopen = () => {
        console.log("✅ Connected to WebSocket server");
        setWs(websocket);
      };

      websocket.onmessage = (event) => {
        console.log("📩 Message received:", event.data);
        try {
          const message: Message = JSON.parse(event.data);
          setMessages(prev => [...prev, message]);
        } catch (error) {
          console.error("❌ Error parsing message:", error);
        }
      };

      websocket.onclose = () => {
        console.log("❌ WebSocket connection closed. Reconnecting...");
        setWs(null);
        setTimeout(connectWebSocket, 3000);
      };

      websocket.onerror = (error) => {
        console.warn("⚠️ WebSocket error:", error);
        setWs(null);
      };
    };
    connectWebSocket();
  };

    run();

    setIsSuccess(true);
    return () => {
      if (websocket) {
        console.log("Cleaning up WebSocket connection");
        websocket.close();
      }
    };
  }, []);

  useEffect(() => {
    console.log("* * user", user);
    setChannelId(params.id);
    getMessages(params.id).then((data) => {
      setMessages(data);
    });
    fetchCurrentUser().then((data) => {
      setCurrentUser(data);
      console.log("current user in chat page: ", data);
    });
    getConversation(params.id).then((data) => {
      const name = data?.is_private ? getChannelName(params.id) : data.name;
      setConversation({...data, name: name});
    });
  }, [params.id]);

  useEffect(() => {
  if (conversation) {
    console.log("updated conversation:", conversation);
  }
}, [conversation]);

  return (
    <>
    {isSuccess && currentUser && conversation && (<>
      {/* <div>Channel:  {channelId}</div> */}
      <main style={{display: 'flex', height: 'calc(100dvh - 60px)', background: 'radial-gradient(circle at top, rgba(20, 40, 80, 0.6), transparent 60%), #040912', justifyContent: 'center', overflow: 'hidden'}}>
        {/* <h1>hello</h1> */}
        <ChatWindow
          messages={messages}
          setMessages={setMessages}
          conversation={conversation}
          // onSendMessage={sendMessage}
          ws={ws}
          currentUser={currentUser}
        />
      </main>
    </>)}
    </>
  )
}

export default page