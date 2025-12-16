"use client";

import { useEffect, useState } from "react";
import { Conversation } from "@/lib/chat";
import styles from "./ConversationsList.module.css";
import { Friend, getChannelName } from "@/lib/chat";
import { useRouter } from "next/navigation";
import { handleMessageClick } from "@/lib/chat";

interface ConversationsListProps {
  currentUser: {id: string; name: string; avatar?: string } | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSendMessage: (content: string, getPending: number) => Promise<void>;
  friends: Friend[];
}

export default function ConversationsList({
  currentUser,
  searchQuery,
  onSearchChange,
  onSendMessage,
  friends,
}: ConversationsListProps) {

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [haveNames, setHaveNames] = useState(false);
  const router = useRouter();

  const getConversations = async (id: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_USR_MANAG_URL}/conversations/${id}`, {
        method: "GET",
        credentials: "include",
      });
      if (!res.ok)
        throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      return data;
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
      return [];
    }
  }


  useEffect(() => {
    const run = async () => {
      setConversations(await getConversations(currentUser.id));
    }

    run();

    return () => {
      console.log("out");
    };

  }, []);

  useEffect(() => {

    const fetchPrivateChannelsNames = () => {
      let counter = 0;
      conversations.forEach(async (conv) => {
        if(conv && conv.is_private) {
          conv.name = await getChannelName(conv.id);
          if(conv.name !== null)
            counter++;
        }
        if(counter === conversations.length)
          setHaveNames(true);
      })
    }

    fetchPrivateChannelsNames();
    console.log("should be executed once");
    console.log("conversations: ", conversations);

    

    return () => {};

  }, [conversations])

  const startFriendConv = async (friendId: string) => {
    const chatURL = await handleMessageClick(friendId);
    if(chatURL)
      router.push(chatURL);
  }

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
                onClick={() => startFriendConv(friend.id)}
              >

                {friend.profile_pic ? (
                  <img
                    src={friend.profile_pic}
                    alt={friend.username}
                    className={styles.chatUserAvatar}
                  />
                ): (
                  <div className={styles.placeholderAvatar}>{friend.first_name && friend.first_name[0]?.toUpperCase()}</div>
                )}

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
        {conversations.length > 0 && haveNames === true && (          
          <>
            <div className={styles.sectionHeader}>Recent Conversations</div>
            {conversations.map(conv => (
              
              <div
                key={conv.id}
                className={styles.chatUserItem}
                onClick={() => {
                  // console.log("clicked conv: ", conv);
                  router.push(`/chat/${conv.id}`);
                }}
              >
                {conv.avatar ? (
                  <img
                    src={conv.avatar}
                    alt={conv.name}
                    className={styles.chatUserAvatar}
                  />
                ): (
                  <div className={styles.placeholderAvatar}>{conv.name && conv.name[0]?.toUpperCase()}</div>
                )}

                <div className={styles.chatUserInfo}>
                  <div className={styles.chatUserName}>
                    {conv.name}
                  </div>

                  <div className={styles.chatUserUsername}>
                    @{conv.name}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}