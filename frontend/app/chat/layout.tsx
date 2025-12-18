'use client';

import { useState, useEffect, useRef } from "react";
import ConversationsList from "../../components/ConversationList";
import styles from "./styles.module.css";
import { fetchCurrentUser } from "@/lib/fetcher";
import { Friend } from "@/lib/chat";
import ChatSocketContext from "./ChatSocketContext";
import { Conversation, Message, getReceivers } from "@/lib/chat";
import { User } from "../settings/page";
import { getConversations, getChannelName } from "@/lib/chat";
import ChatDataContext from "./ChatDataContext";

const chatURL = process.env.NEXT_PUBLIC_CHAT_URL || "ws://localhost:8006";
const userMgntURL = process.env.NEXT_PUBLIC_USR_MANAG_URL || "http://localhost:4000";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [isSuccess, setIsSuccess] = useState(false);
  const [currentUser, setCurrentUser] =
    useState<{ id: string; name: string; avatar?: string } | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  // const [updated, setUpdated] = useState<boolean>(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    const init = async () => {
      const user = await fetchCurrentUser();
      if (!user) return;

      setCurrentUser(user);
      setFriends(await getFriends());

      socketRef.current = new WebSocket(
        `${chatURL}/ws?userId=${user.id}`
      );

      socketRef.current.onopen = () => {
        console.log("CHAT: WebSocket connected");
      };

      socketRef.current.onmessage = (event) => {
        console.log("CHAT: 📩 WS message:", event.data);
      };

      socketRef.current.onclose = () => {
        console.log("CHAT: ❌ WebSocket closed");
      };

      setIsSuccess(true);
    };

    init();

    return () => {
      socketRef.current?.close();
    };
  }, []);

  useEffect(() => {
  if (currentUser) {
    fetchConversations();
  }
}, [currentUser]);

  const getFriends = async () => {
    const res = await fetch(`${userMgntURL}/me/friends`, {
      credentials: "include",
    });
    return res.ok ? res.json() : [];
  };

  const sendMessage = async (message: Message) => {
      console.log("message to send: ", message);
      socketRef.current?.send(JSON.stringify(message));
      // setMessages(prev => [...prev, message]);
  };

  const normalizeConversations = async (convs: Conversation[]) => {
  return Promise.all(
    convs.map(async (conv) => {
      if (conv.is_private && !conv.name) {
        const name = await getChannelName(conv.id);
        return {
          ...conv,
          name: name || "Private Chat",
        };
      }
      return {
        ...conv,
        name: conv.name || "Unnamed Channel",
      };
    })
  );
};


  const fetchConversations = async () => {
    if (!currentUser) return;

    const data = await getConversations(currentUser.id);
    const normalized = await normalizeConversations(data);
    setConversations(normalized);
  };

  if (!isSuccess || !currentUser) return null;

  return (
    <ChatSocketContext.Provider
      value={{
        socket: socketRef.current,
        sendMessage,
      }}
    >
      <ChatDataContext.Provider 
      value={{ conversations, refreshConversations: fetchConversations, setConversations }}>
        <div className={styles.container}>
          <div className={styles.mainContent}>
            <div className={styles.chatSection}>
              <ConversationsList
                currentUser={currentUser}
                friends={friends}
                // onSendMessage={sendMessage}
              />
              <div className={styles.rightPanel}>
                {children}
              </div>
            </div>
          </div>
      </div>
      </ChatDataContext.Provider>

    </ChatSocketContext.Provider>
  );
};

export default Layout;
