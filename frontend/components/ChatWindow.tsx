"use client";

import { useState, useRef, useEffect } from "react";
import { Conversation } from "../src/pages/Chat";
import styles from "./ChatWindow.module.css";
import { User } from "@/app/settings/page";
import { getReceivers } from "@/lib/chat";
import { useRouter } from "next/navigation";
import { getReceiverId, Message } from "@/lib/chat";
import { useChatSocket } from "@/app/chat/ChatSocketContext";
import { useChatData } from "@/app/chat/ChatDataContext";

interface ChatWindowProps {
  conversation: Conversation;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  currentUser: User | null;
  // ws: WebSocket | null, 
}

export default function ChatWindow({
  conversation,
  messages,
  setMessages,
  currentUser,
  // ws,
}: ChatWindowProps) {
  const [inputValue, setInputValue] = useState("");
  // const [showGroupForm, setShowGroupForm] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [usernameToAdd, setUsernameToAdd] = useState("");
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { sendMessage } = useChatSocket();
  const { refreshConversations } = useChatData();

  const scrollToBottom = () => {
    // messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    messagesEndRef.current?.scroll({ top: messagesEndRef.current?.scrollHeight, behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
    // console.log("scrolling to bottom");
  }, [messages]);

  useEffect(() => {
    // scrollToBottom();
    // console.log("* NAME: ", conversation.name.value[0]?.toUpperCase());
    // console.log("conversation: ", conversation);
    
    // console.log("* NAME: ", conversation?.name?.charAt(0).toUpperCase());
    
    const checkBlockStatus = async () => {
      if (conversation.is_private === 1 && currentUser?.id) {
        try {
          const receiverId = await getReceiverId(conversation);
          const res = await fetch(`${process.env.NEXT_PUBLIC_USR_MANAG_URL}/users/${currentUser?.id}/friends/${receiverId}`, {
            method: "GET",
            credentials: "include",
          });
          if (res.ok) {
            const data = await res.json();
            // console.log("checking...: ", data);
            
            setIsBlocked(data.status === 'blocked' || data.status === 'blocker' || false);
          }
        } catch (err) {
          console.error("Failed to check blocked status:", err);
        }
      }
    };
    
    checkBlockStatus();
  }, [conversation, currentUser]);

  // ! handle blocked users
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if user is blocked
    if (isBlocked) {
      alert("You cannot message this user because they have blocked you or you have blocked them.");
      return;
    }
    
    try {
      let receivers: string[] = await getReceivers(conversation.id, currentUser?.id.toString() || '');

      const message: Message = {
          uuid: crypto.randomUUID(),
          channel_id: conversation.id,
          sender_id: currentUser != null ? currentUser.id.toString() : 'unknown',
          sent_at: new Date().toISOString(),
          content: inputValue,
          sender_name: currentUser != null ? currentUser.username : "unknown",
          receiver_id: receivers,
          pending: 0,
        };

      // console.log("submitting message: ", inputValue);
      if (inputValue.trim()) {
        // console.log("message: ", messages);
        sendMessage(message);
        setMessages(prev => [...prev, message]);
        setInputValue("");
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  const handleUserInfoClick = async (conversation: Conversation) => {
  
    const id = await getReceiverId(conversation);
    if (id) {
      router.push(`/users/${id}`);
    } else {
      // console.log("No receiver id found");
    }
    
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleAddUserClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowAddUserForm(true);
  };

  const handleAddUserSubmit = async (e: React.FormEvent) => {

    e.preventDefault();
    if (!usernameToAdd.trim()) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_USR_MANAG_URL}/channel/${conversation.id}/add-member`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: usernameToAdd }),
      });
      const data = await res.json();
      if(!res.ok) {
        console.error("Failed to add user to group:", data.error);
      }
    } catch (err) {
      console.error("Failed to add user to group:", err);
    }
    
    // console.log("Adding user to group:", usernameToAdd, "to channel:", conversation.id);
    setShowAddUserForm(false);
    setUsernameToAdd("");
  };

  const handleAddUserCancel = () => {
    setShowAddUserForm(false);
    setUsernameToAdd("");
  };

  const handleLeaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowLeaveConfirm(true);
  };

  const handleLeaveConfirm = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_USR_MANAG_URL}/channel/${conversation.id}/leave`, {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: conversation.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("Failed to leave group:", data.error);
      } else {
        router.push("/chat");
        await refreshConversations();
      }
    } catch (err) {
      console.error("Failed to leave group:", err);
    }
    setShowLeaveConfirm(false);
  };

  const handleLeaveCancel = () => {
    setShowLeaveConfirm(false);
  };

  return (
    <div className={styles.container}>
      {/* <h1>tfooo</h1>    */}
      <div className={styles.header}>
        <div className={styles.userInfo} onClick={() => handleUserInfoClick(conversation)}>
          <div className={styles.avatarContainer}>
            {conversation?.avatar ? (
              <img
                src={conversation.avatar}
                alt={conversation.name}
                className={styles.avatar}
              />
            ) : (
              <div className={styles.placeholderAvatar}>
                {conversation.name && conversation.name.charAt(0).toUpperCase()}
              </div>
            )}
            {conversation.status === "online" && (
              <div className={styles.onlineIndicator}></div>
            )}
          </div>

          {/* button here */}
          <div className={styles.userDetails}>
            <h3 className={styles.userName}>{conversation.name}</h3>
            <span className={styles.userStatus}>
              {"Offline"}
            </span>
          </div>
        </div>

        {conversation.is_private === 0 && (
          <div className={styles.headerActions}>
            <button type="button" className={styles.addUserBtn} onClick={handleAddUserClick}>
              Add User
            </button>
            <button type="button" className={styles.leaveBtn} onClick={handleLeaveClick}>
              Leave
            </button>
          </div>
        )}
      </div>

      {showAddUserForm && (
        <div className={styles.addUserFormOverlay}>
          <form className={styles.addUserForm} onSubmit={handleAddUserSubmit}>
            <h3 className={styles.primaryBtn}>Add User to Group</h3>
            <input
              className={styles.addUserInput}
              type="text"
              value={usernameToAdd}
              onChange={(e) => setUsernameToAdd(e.target.value)}
              placeholder="Enter username"
              autoFocus
            />
            <div className={styles.addUserActions}>
              <button type="submit" className={styles.addUserSubmitButton}>
                Add
              </button>
              <button type="button" className={styles.addUserCancelButton} onClick={handleAddUserCancel}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {showLeaveConfirm && (
        <div className={styles.leaveConfirmOverlay}>
          <div className={styles.leaveConfirmModal}>
            <h3 className={styles.leaveConfirmTitle}>Leave Group</h3>
            <p className={styles.leaveConfirmMessage}>
              Are you sure you want to leave this group? This action cannot be undone.
            </p>
            <div className={styles.leaveConfirmActions}>
              <button type="button" className={styles.leaveConfirmButton} onClick={handleLeaveConfirm}>
                Leave
              </button>
              <button type="button" className={styles.leaveCancelButton} onClick={handleLeaveCancel}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} className={styles.messagesContainer}>
      
        {messages.map((message, index) => (
          <div
            key={index}
            className={`${styles.messageWrapper} ${
              (message.sender_id === currentUser?.id.toString() || message.sender_id === currentUser?.id.toString()) ? styles.sent : styles.received
            }`}
          >
            <div className={styles.message}>
              <div className={styles.messageContent}>
                {message.content}
              </div>
              <div className={styles.messageTime}>
                {message.sender_name} • {formatTime(message.sent_at)}
              </div>
            </div>
          </div>
        ))}
        {/* <div ref={messagesEndRef} /> */}
      </div>

      <form onSubmit={handleSubmit} className={styles.inputForm}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={isBlocked ? "You cannot message this user" : "Message Alex..."}
          className={styles.messageInput}
          disabled={isBlocked}
        />
        <button type="submit" className={styles.sendButton} disabled={isBlocked}>
          Send
        </button>
      </form>
    </div>

    // </div>
  );
}