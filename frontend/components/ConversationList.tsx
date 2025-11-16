"use client";

import { Conversation } from "../app/chat/page";
import styles from "./ConversationsList.module.css";

interface ConversationsListProps {
  conversations: Conversation[];
  activeConversation: string;
  onConversationSelect: (id: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export default function ConversationsList({
  conversations,
  activeConversation,
  onConversationSelect,
  searchQuery,
  onSearchChange
}: ConversationsListProps) {
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
        {conversations.map((conversation) => (
          <button
            key={conversation.id}
            onClick={() => onConversationSelect(conversation.id)}
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
              {conversation.status === "online" && (
                <div className={styles.onlineIndicator}></div>
              )}
            </div>
            <div className={styles.conversationContent}>
              <div className={styles.conversationHeader}>
                <span className={styles.name}>{conversation.name}</span>
                <span className={styles.timestamp}>{conversation.timestamp}</span>
              </div>
              <div className={styles.lastMessage}>{conversation.lastMessage}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}