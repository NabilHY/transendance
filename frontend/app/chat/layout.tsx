'use client';

import { useState, useEffect, useRef } from "react";
import ConversationsList from "../../components/ConversationList";
import ChatWindow from "../../components/ChatWindow";
import styles from "./styles.module.css";
import { fetchCurrentUser } from "@/lib/fetcher";
import { Conversation, Message, Friend } from "@/lib/chat";



const chatPort = process.env.NEXT_PUBLIC_CHAT_URL || "ws://localhost:8006";
const userMgntURL = process.env.NEXT_PUBLIC_USR_MANAG_URL || "http://localhost:4000";

const layout = ({children}: {children: React.ReactNode}) => {

  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; avatar?: string } | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [activeConversation, setActiveConversation] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {

  const run = async () => {
      // ! * WARNING: this test just for testing, I must removed it later
      const res = await fetch(`${userMgntURL}/users`, {
        method: "GET",
        credentials: "include"
      });

      const currentUser = await fetchCurrentUser();

      setCurrentUser(currentUser);

      if (!currentUser) {
        console.error("No current user, cannot establish WebSocket connection.");
        return;
      }

      setConversations(await getConversations(currentUser.id));
      setFriends(await getFriends(currentUser.id));
      const data = await res.json();
    };

    run();

    setIsSuccess(true);
  return () => {
    console.log("out");
  };
}, []);

  useEffect(() => {
    if(activeConversation === "") return;
    console.log("* conversations updated: ", conversations);
    sendMessage("", 1);
  }, [activeConversation]);

  const getFriends = async (id: string) => {
    try {
      const res = await fetch(`${userMgntURL}/me/friends`, {
        method: "GET",
        credentials: "include",
      });
      if (!res.ok)
        throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      console.log("all friends user: ", data);
      return data;
    } catch (err) {
      console.error("Failed to fetch friends:", err);
      return [];
    }
  }

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

  // const filteredConversations = conversations.filter(conv => {
  //   if(conv.name === null) return false;
  //   conv?.name.toLowerCase().includes(searchQuery.toLowerCase())

  // }
  // );

  // const activeConv = conversations.find(conv => conv.id === activeConversation);
  // const conversationMessages = messages.filter(msg => msg.channel_id === activeConversation);

  const sendMessage = async () => {
    console.log("send message tfooooooooooo");
  }

  return (
    <>
      {isSuccess === true && (
        <>
        <div className={styles.container}>
          <div className={styles.mainContent}>
            <div className={styles.chatSection}>
              <ConversationsList
                conversations={conversations}
                friends={friends}
                activeConversation={activeConversation}
                onConversationSelect={setActiveConversation}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onSendMessage={sendMessage}
              />
              <div className={styles.rightPanel}>
                { children }
                {/* {activeConv && (
                  <ChatWindow
                    conversation={activeConv}
                    messages={conversationMessages}
                    currentUserId={currentUser != null ? currentUser.id : "unknown"}
                    onSendMessage={sendMessage}
                  />
                )} */}
                {/* <QuickActions /> */}
              </div>
            </div>
          </div>
        </div>
      </>
    )}
    </>
  )
}

export default layout