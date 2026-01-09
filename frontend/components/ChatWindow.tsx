"use client";

import { useState, useRef, useEffect } from "react";
import { Conversation } from "@/lib/chat";
import styles from "./ChatWindow.module.css";
import listStyles from "./ConversationsList.module.css";
import { User } from "@/app/settings/page";
import { getReceivers } from "@/lib/chat";
import { useRouter } from "next/navigation";
import { getReceiverId, Message } from "@/lib/chat";
import { useChatSocket } from "@/app/chat/ChatSocketContext";
import { useChatData } from "@/app/chat/ChatDataContext";
import { getUserMgmtBase } from "@/lib/api-config";

interface ChatWindowProps {
  conversation: Conversation;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  currentUser: User | null;
}

export default function ChatWindow({
  conversation,
  messages,
  setMessages,
  currentUser,
}: ChatWindowProps) {
  const [inputValue, setInputValue] = useState("");
  const [groupName, setGroupName] = useState("");
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [usernameToAdd, setUsernameToAdd] = useState("");
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const processedInvitesRef = useRef<Set<string>>(new Set());
  const lastMessageCountRef = useRef<number>(0);
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
          const res = await fetch(`${getUserMgmtBase()}/users/${currentUser?.id}/friends/${receiverId}`, {
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
    console.log("ChatWindow: ", conversation);
  }, [conversation, currentUser]);

  // ! handle blocked users
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      const res = await fetch(`${getUserMgmtBase()}/channel/${conversation.id}/add-member`, {
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

  const handleInviteToGame = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser || isBlocked) return;
    try {
      const receiverId = await getReceiverId(conversation);
      if (!receiverId) return;

      const response = await fetch(`${getUserMgmtBase()}/notifications/match-invite`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipientId: typeof receiverId === 'string' ? parseInt(receiverId) : receiverId,
          senderId: currentUser.id,
          matchType: 'matchmaking',
          gameData: {
            channelId: conversation.id,
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send match invite notification');
      }

      const inviteId = crypto.randomUUID();
      const content = JSON.stringify({
        type: "game_invite",
        inviteId,
        inviterId: currentUser.id.toString(),
        receiverId: receiverId.toString(),
      });

      const message: Message = {
        uuid: crypto.randomUUID(),
        channel_id: conversation.id,
        sender_id: currentUser.id.toString(),
        sent_at: new Date().toISOString(),
        content,
        sender_name: currentUser.username,
        receiver_id: [receiverId.toString()],
        pending: 0,
      };

      sendMessage(message);
      setMessages(prev => [...prev, message]);
    } catch (err) {
      console.error("Failed to send game invite:", err);
    }
  };

  const parseInvite = (content: string): any | null => {
    try {
      const data = JSON.parse(content);
      return data && typeof data === 'object' ? data : null;
    } catch {
      return null;
    }
  };

  const handleAcceptInvite = (inviteId: string, inviterId: string, receiverId: string) => {
    if (!currentUser) return;
    const response = JSON.stringify({
      type: "game_invite_response",
      inviteId,
      inviterId,
      receiverId,
      response: "accepted",
    });
    const message: Message = {
      uuid: crypto.randomUUID(),
      channel_id: conversation.id,
      sender_id: currentUser.id.toString(),
      sent_at: new Date().toISOString(),
      content: response,
      sender_name: currentUser.username,
      receiver_id: [inviterId],
      pending: 0,
    };
    sendMessage(message);
    setMessages(prev => [...prev, message]);
    const opponentId_num = typeof inviterId === 'string' ? parseInt(inviterId) : inviterId;
    router.push(`/game?mode=direct&opponentId=${opponentId_num}&inviteId=${inviteId}`);
  };

  const handleDeclineInvite = (inviteId: string, inviterId: string, receiverId: string) => {
    if (!currentUser) return;
    const response = JSON.stringify({
      type: "game_invite_response",
      inviteId,
      inviterId,
      receiverId,
      response: "declined",
    });
    const message: Message = {
      uuid: crypto.randomUUID(),
      channel_id: conversation.id,
      sender_id: currentUser.id.toString(),
      sent_at: new Date().toISOString(),
      content: response,
      sender_name: currentUser.username,
      receiver_id: [inviterId],
      pending: 0,
    };
    sendMessage(message);
    setMessages(prev => [...prev, message]);
  };

  useEffect(() => {
    if (!currentUser) return;
    if (messages.length <= lastMessageCountRef.current) return;
    const last = messages[messages.length - 1];
    const data = parseInvite(last.content);
    lastMessageCountRef.current = messages.length;
    if (!data || data.type !== 'game_invite_response' || data.response !== 'accepted') return;
    
    const messageTime = new Date(last.sent_at).getTime();
    const currentTime = new Date().getTime();
    const timeDiff = currentTime - messageTime;
    if (timeDiff > 5000) return;
    
    const { inviteId, inviterId, receiverId } = data;
    if (processedInvitesRef.current.has(inviteId)) return;
    if (currentUser.id.toString() === inviterId) {
      processedInvitesRef.current.add(inviteId);
      const opponentId = typeof receiverId === 'string' ? parseInt(receiverId) : receiverId;
      router.push(`/game?mode=direct&opponentId=${opponentId}&inviteId=${inviteId}`);
    }
  }, [messages, currentUser, router]);

  const handleLeaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowLeaveConfirm(true);
  };

  const handleLeaveConfirm = async () => {
    try {
      const res = await fetch(`${getUserMgmtBase()}/channel/${conversation.id}/leave`, {
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
            {conversation?.is_online && (
              <div className={styles.onlineIndicator}></div>
            )}
          </div>

          <div className={styles.userDetails}>
            <h3 className={styles.userName}>{conversation.name}</h3>
            <span className={styles.userStatus}>
              {conversation?.is_online ? "Online" : "Offline"}
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

        {conversation.is_private === 1 && (
          <div className={styles.headerActions}>
            <button
              type="button"
              className={listStyles.primaryBtn}
              onClick={handleInviteToGame}
              disabled={isBlocked}
            >
              Invite to Match
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
      
        {messages.map((message, index) => {
          const data = parseInvite(message.content);
          const isGameInviteMessage = data?.type === 'game_invite' || data?.type === 'game_invite_response';
          
          const hasResponse = (inviteId: string) => {
            return messages.some(msg => {
              const msgData = parseInvite(msg.content);
              return msgData?.type === 'game_invite_response' && msgData?.inviteId === inviteId;
            });
          };
          
          return (
          <div
            key={index}
            className={`${styles.messageWrapper} ${
              (message.sender_id === currentUser?.id.toString() || message.sender_id === currentUser?.id.toString()) ? styles.sent : styles.received
            } ${isGameInviteMessage ? styles.gameInviteMessage : ''}`}
          >
            <div className={`${styles.message} ${isGameInviteMessage ? styles.gameInviteContent : ''}`}>
              <div className={styles.messageContent}>
                {(() => {
                  if (data?.type === 'game_invite') {
                    const isReceiver = currentUser?.id.toString() === data.receiverId;
                    const responded = hasResponse(data.inviteId);
                    return (
                      <div>
                        <div>
                          {isReceiver ? '* Game invitation: You have been invited to a match.' : `* Game invitation: You invited ${conversation.name} to a match.`}
                        </div>
                        {isReceiver && !responded && (
                          <div className={styles.inviteActions}>
                            <button
                              className={styles.acceptBtn}
                              onClick={() => handleAcceptInvite(data.inviteId, data.inviterId, data.receiverId)}
                            >
                              Accept
                            </button>
                            <button
                              className={styles.declineBtn}
                              onClick={() => handleDeclineInvite(data.inviteId, data.inviterId, data.receiverId)}
                            >
                              Decline
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  }
                  if (data?.type === 'game_invite_response') {
                    return <div>/Invitation was {data.response === 'accepted' ? 'accepted ✓' : 'declined ✗'}</div>;
                  }
                  return message.content;
                })()}
              </div>
              <div className={styles.messageTime}>
                {message.sender_name} • {formatTime(message.sent_at)}
              </div>
            </div>
          </div>
        );
        })}
        {/* <div ref={messagesEndRef} /> */}
      </div>

      <form onSubmit={handleSubmit} className={styles.inputForm}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={isBlocked ? "You cannot message this user" : `Message ${currentUser?.username}...`}
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