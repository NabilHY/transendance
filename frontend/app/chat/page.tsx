'use client';

import { useState, useEffect, useRef } from "react";
import ConversationsList from "../../components/ConversationList";
import ChatWindow from "../../components/ChatWindow";
import styles from "./styles.module.css";
import { fetchCurrentUser } from "@/lib/fetcher";

export interface Message {
  uuid: string;
  channel_id: string;
  sender_id: string;
  sent_at: string;
  content: string;
  sender_name?: string;
  receiver_id?: string[];
  pending?: number;
}

export interface Conversation {
  id: string;
  name: string;
  is_private: number;
  description: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  last_message_id: string;
  last_message_content: string;
  last_message_sender: string;
  last_message_time: string;
}

// Determine chat WebSocket base URL
const chatPort = process.env.NEXT_PUBLIC_WS_URL
  ? `${process.env.NEXT_PUBLIC_WS_URL}/api/chat`
  : `${typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss' : 'ws'}://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:8006`;
const userMgntURL = process.env.NEXT_PUBLIC_USR_MANAG_URL || "http://localhost:4000";

const getConversations = async (id: string) => {
  try {
    const res = await fetch(`${userMgntURL}/conversations/${id}`, {
      method: "GET",
      credentials: "include",
    });
    if (!res.ok)
      throw new Error(`Server error: ${res.status}`);
    const data = await res.json();
    // console.log("* Conversation: ", data);
    return data;
  } catch (err) {
    console.error("Failed to fetch conversations:", err);
    return [];
  }
}

const getReceivers = async (channelId: string, userId: number) => {
  try {    
    const res = await fetch(`${userMgntURL}/channel/${channelId}/members`, {
      method: "GET",
      credentials: "include",
    });
    if (!res.ok)
      throw new Error(`Server error: ${res.status}`);
    const data = await res.json();
    
    const filteredReceivers = data.filter((id: string) => id !== userId.toString());

    // console.log("getting receivers: ", filteredReceivers, " | userId: ", userId);
    return filteredReceivers;
  } catch (err) {
    console.error("Failed to fetch receivers:", err);
    return [];
  }
}

const Chat = () => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<{ id: string | number; name: string; avatar?: string } | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

useEffect(() => {

  // console.log("hello from useEffect");
  

  let websocket: WebSocket | null = null;

  const run = async () => {

    // ! * WARNING: this test just for testing, I must removed it later
    const res = await fetch(`${userMgntURL}/users`, {
      method: "GET",
      credentials: "include"
    });

    const currentUser = await fetchCurrentUser();
    // console.log("* CLIENT user: ", currentUser);

    setCurrentUser(currentUser);

    if (!currentUser) {
      console.error("No current user, cannot establish WebSocket connection.");
      return;
    }

    // setConversations(await getConversations(currentUser.id));
    setConversations(await getConversations(currentUser.id));
    // console.log("* CLIENT: conversations ---> ", conversations);

    const data = await res.json();

    // console.log("users data: ", data);

    const connectWebSocket = () => {
      // console.log("* CLIENT: current user ---> ", currentUser);

      // ! WARNING: this works twice, need to fix it later

      websocket = new WebSocket(`${chatPort}/ws?userId=${currentUser.id}`);

      websocket.onopen = () => {
        console.log("✅ Connected to WebSocket server");
        setWs(websocket);
      };

      websocket.onmessage = (event) => {
        try {
          const message: Message = JSON.parse(event.data);
          // console.log("message received: ", message);
          setMessages(prev => [...prev, message]);
          setConversations(prev =>
            prev.map(conv =>
              conv.id === message.channel_id
                ? {
                    ...conv,
                    lastMessage: message.content,
                    timestamp: new Date(message.sent_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",

                    }),
                  }
                : conv
            )
          );
        } catch (error) {
          // console.log("* ERRO R: ");
          console.error("❌ Error parsing message:", error);
        }
      };

      websocket.onclose = () => {
        // console.log("⚠️ WebSocket connection closed, retrying in 3s...");
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
  // console.log("currentId before success: ", currentUser != null ? currentUser.id : "no user");
  // Cleanup on unmount
  return () => {
    if (websocket) {
      websocket.close();
    }
  };
}, []);

useEffect(() => {
  if(activeConversation === "") return;
  console.log("* conversations updated: ", conversations);
  sendMessage("", 1);
}, [activeConversation]);

  const sendMessage = async (content: string, getPending: number) => {

    if (!ws || (getPending == 0 && !content.trim())) return;

    const activeConv = conversations.find(conv => conv.id === activeConversation);
    if (!activeConv) return;
    if (!currentUser) return;

    const currentUserIdNum =
      typeof currentUser.id === "number" ? currentUser.id : Number(currentUser.id);
    if (!Number.isFinite(currentUserIdNum)) return;

    let receivers: string[] = await getReceivers(activeConv.id, currentUserIdNum);

    const message: Message = {
      uuid: crypto.randomUUID(),
      channel_id: activeConversation,
      sender_id: String(currentUser.id),
      sent_at: new Date().toISOString(),
      content: content,
      sender_name: currentUser.name,
      receiver_id: receivers,
      pending: getPending,
    };

    console.log("message to send: ", message);

    ws.send(JSON.stringify(message));
    setMessages(prev => [...prev, message]);
    
    setConversations(prev => prev.map(conv => 
      conv.id === activeConversation 
        ? { ...conv, lastMessage: content, timestamp: "now" }
        : conv
    ));

  };

  const filteredConversations = conversations.filter(conv =>
    conv.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeConv = conversations.find(conv => conv.id === activeConversation);
  const conversationMessages = messages.filter(msg => msg.channel_id === activeConversation);

  return (
    <>
      {isSuccess === true && (
        <>
        <div className={styles.container}>
          {/* <Header /> */}
          <div className={styles.mainContent}>
            {/* <Sidebar activeItem="chat" /> */}
            <div className={styles.chatSection}>
              <ConversationsList
                conversations={filteredConversations}
                activeConversation={activeConversation}
                onConversationSelect={setActiveConversation}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onSendMessage={sendMessage}
              />
              <div className={styles.rightPanel}>
                {activeConv && (
                  <ChatWindow
                    conversation={activeConv}
                    messages={conversationMessages}
                    currentUserId={currentUser != null ? String(currentUser.id) : "unknown"}
                    onSendMessage={sendMessage}
                  />
                )}
                {/* <QuickActions /> */}
              </div>
            </div>
          </div>
        </div>
      </>
    )}
    </>
    
  );
}

export default Chat;
