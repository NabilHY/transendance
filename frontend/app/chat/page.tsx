'use client';

import { useState, useEffect, useRef } from "react";
import Sidebar from "../../components/Sidebar";
import ConversationsList from "../../components/ConversationList";
import ChatWindow from "../../components/ChatWindow";
import QuickActions from "../../components/QuickActions";
import Header from "../../components/Header";
import styles from "./styles.module.css";

export interface Message {
  uuid: string;
  channel_id: string;
  sender_id: string;
  sent_at: string;
  content: string;
  sender_name?: string;
  receiver_id?: string;
}

export interface Conversation {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  status?: "online" | "offline";
  unread?: number;
  receiver_id?: string;
}

const chatPort = process.env.NEXT_PUBLIC_CHAT_PORT || "4009";
const userMgntPort = process.env.NEXT_PUBLIC_USR_MANAG_PORT || "4000";

async function fetchCurrentUser() {
  try {
    const res = await fetch(`http://localhost:${userMgntPort}/me`, {
      method: "GET",
      credentials: "include",
    });

    if (!res.ok) {
      if (res.status === 401) {
        console.warn("User not authenticated");
        return null;
      }
      throw new Error(`Server error: ${res.status}`);
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.error("Failed to fetch current user:", err);
    return null;
  }
}

const Chat = () => {
  // return <div>Chat Page</div>;
    const [ws, setWs] = useState<WebSocket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const [conversations, setConversations] = useState<Conversation[]>([
  {
    id: "ch1",
    name: "nabil",
    // avatar: "https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1",
    avatar: "https://cdn.intra.42.fr/users/1f9bef1830faef4b351858e05266fb47/nhayoun.jpg",
    // lastMessage: "Welcome to the General channel!",
    lastMessage: "rak kayn",
    timestamp: "9:00 AM",
    status: "online",
    receiver_id: "u1",
  },
  {
    id: "ch2",
    name: "Gaming Squad",
    avatar: "https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1",
    lastMessage: "Who's up for a match tonight?",
    timestamp: "10:30 AM",
    status: "offline",
  },
  {
    id: "ch3",
    name: "Bob",
    avatar: "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1",
    lastMessage: "Hey Bob, ready to play?",
    timestamp: "Yesterday",
    status: "online",
    receiver_id: "u2",
  },
  {
    id: "ch4",
    name: "Charlie",
    avatar: "https://images.unsplash.com/photo-1552410260-0fd9b577afa6?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    lastMessage: "Hey charlie,you are blocked",
    timestamp: "Yesterday",
    status: "online",
    receiver_id: "u5",
  },
  {
    id: "ch5",
    name: "mkawi",
    avatar: "https://cdn.intra.42.fr/users/288d8d0158cf03ccaea8b22d8f61eb91/abdennac.jpg",
    lastMessage: "Rak kayn",
    timestamp: "Yesterday",
    status: "online",
    receiver_id: "u6",
  },
  ]);

  const [activeConversation, setActiveConversation] = useState<string>("f4bebbee-d06c-43d5-bcd3-32e4a0196a0e");

  const [searchQuery, setSearchQuery] = useState("");

//   const currentUser = {
//   id: "u4",
//   name: "Simo al-asad",
//   avatar: "https://images.pexels.com/photos/1674752/pexels-photo-1674752.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1"
// };

let currentUser: { id: string; name: string; avatar?: string };

// currentUser = undefined as any;

useEffect(() => {

  console.log("hello from useEffect");
  

  let websocket: WebSocket | null = null;

  const run = async () => {
    const res = await fetch(`http://localhost:${userMgntPort}/users`, {
      method: "GET",
      credentials: "include"
    });


    currentUser = await fetchCurrentUser();
    if (!currentUser) {
      console.error("No current user, cannot establish WebSocket connection.");
      return;
    }

    const data = await res.json();

    console.log("users data: ", data);

    const connectWebSocket = () => {
      console.log("* CLIENT: ", currentUser);

      websocket = new WebSocket(`ws://localhost:${chatPort}/ws?userId=${currentUser.id}`);
      // websocket = new WebSocket(`ws://localhost:${chatPort}/ws`);

      websocket.onopen = () => {
        console.log("✅ Connected to WebSocket server");
        setWs(websocket);
      };

      websocket.onmessage = (event) => {
        console.log("wtf: ", event.data);
        
        try {
          // console.log("message id: ", JSON.parse(event.data));
          const message: Message = JSON.parse(event.data);

          console.log("message received: ", message);
          
          if (message.sender_id === "system") return;

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
          console.log("* ERROR: ");
          
          console.error("❌ Error parsing message:", error);
        }
      };

      websocket.onclose = () => {
        console.log("⚠️ WebSocket connection closed, retrying in 3s...");
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

  // Cleanup on unmount
  return () => {
    if (websocket) {
      websocket.close();
    }
  };
}, []);

  const sendMessage = (content: string) => {
    if (!ws || !content.trim()) return;

    const activeConv = conversations.find(conv => conv.id === activeConversation);

    const message: Message = {
      uuid: crypto.randomUUID(),
      channel_id: activeConversation,
      sender_id: currentUser.id,
      sent_at: new Date().toISOString(),
      content: content,
      sender_name: currentUser.name,
      receiver_id: activeConv?.receiver_id,
    };

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
      {currentUser != undefined && (
        <>
        <div className={styles.container}>
          <Header />
          <div className={styles.mainContent}>
            <Sidebar activeItem="chat" />
            <div className={styles.chatSection}>
              <ConversationsList
                conversations={filteredConversations}
                activeConversation={activeConversation}
                onConversationSelect={setActiveConversation}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />
              <div className={styles.rightPanel}>
                {activeConv && (
                  <ChatWindow
                    conversation={activeConv}
                    messages={conversationMessages}
                    currentUserId={currentUser.id}
                    onSendMessage={sendMessage}
                  />
                )}
                <QuickActions />
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
