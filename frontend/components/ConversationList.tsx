"use client";

import { useEffect } from "react";
import { Conversation } from "../src/pages/Chat";
import styles from "./ConversationsList.module.css";
// import { Friend } from "@/app/chat/layout";
import { Friend } from "@/lib/chat";


interface ConversationsListProps {
  conversations: Conversation[];
  activeConversation: string;
  onConversationSelect: (id: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSendMessage: (content: string, getPending: number) => Promise<void>;
  friends: Friend[];
}

export default function ConversationsList({
  conversations,
  activeConversation,
  onConversationSelect,
  searchQuery,
  onSearchChange,
  onSendMessage,
  friends,
}: ConversationsListProps) {

  const handleConversationSelect = async (id: string) => {
    onConversationSelect(id);
    // await onSendMessage("", 1);
    console.log("=====> selected conversation id: ", id);
  }

  useEffect(() => {
    console.log("conversations: ", conversations);
    
  }, [conversations]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Chat</h2>
        <input
          type="text"
          placeholder="Search conversations"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      <div className={styles.conversationsList}>
        {/* Friends Section */}
        {friends.length > 0 && (
          <>
            <div className={styles.sectionHeader}>Friends</div>
            {friends.map(friend => (
              <div
                key={friend.id}
                className={styles.chatUserItem}
              >
                <img
                  src={friend.profile_pic}
                  alt={friend.username}
                  className={styles.chatUserAvatar}
                />

                <div className={styles.chatUserInfo}>
                  <div className={styles.chatUserName}>
                    {friend.first_name} {friend.last_name}
                  </div>

                  <div className={styles.chatUserUsername}>
                    @{friend.username}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Conversations Section */}
        {conversations.length > 0 && (
          <>
            <div className={styles.sectionHeader}>Recent Conversations</div>
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={
                  () => {
                    handleConversationSelect(conversation.id);
                  }
                }
                className={`${styles.conversationItem} ${
                  activeConversation === conversation.id ? styles.active : ""
                }`}
              >
                <div className={styles.avatarContainer}>
                  <img
                    src={conversation.avatar}
                    alt={conversation.name}
                    className={styles.avatar}
                  />
                  {conversation?.status === "online" && (
                    <div className={styles.onlineIndicator}></div>
                  )}
                </div>

                <div className={styles.conversationContent}>
                  <div className={styles.conversationHeader}>
                    <span className={styles.name}>{conversation.name}</span>
                    <span className={styles.timestamp}>{conversation?.timestamp}</span>
                  </div>
                  <div className={styles.lastMessage}>{conversation.lastMessage}</div>
                </div>

              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}