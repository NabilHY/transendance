'use client';

import { useState, useEffect, useRef } from "react";
import ConversationsList from "../../components/ConversationList";
import styles from "./styles.module.css";
import { fetchCurrentUser } from "@/lib/fetcher";
import { Friend } from "@/lib/chat";
import ChatSocketContext from "./ChatSocketContext";
import { Conversation, Message, getReceiverStatus, getConversations, getChannelName } from "@/lib/chat";
import { User } from "../settings/page";
// import { getConversations, getChannelName } from "@/lib/chat";
import ChatDataContext from "./ChatDataContext";
import { getChatWsUrl, getUserMgmtBase } from "@/lib/api-config";
import { getAvatarUrl, type UserWithAvatar } from "@/lib/avatar";
// import { getReceiverStatus } from "@/lib/chat";
import { ChatLoadingScreen } from "./ChatLoadingScreen";
const Layout = ({ children }: { children: React.ReactNode }) => {
  const [isSuccess, setIsSuccess] = useState(false);
  const [currentUser, setCurrentUser] =
    useState<{ id: string; name: string; avatar?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const pendingMessagesRef = useRef<Message[]>([]);
  // const [updated, setUpdated] = useState<boolean>(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setInitError(null);
      setIsSuccess(false);

      const user = await fetchCurrentUser();
      if (!user) {
        setInitError(
          "Can't load your user session. Make sure you're logged in and the user-management API URL is configured."
        );
        setLoading(false);
        return;
      }

      setCurrentUser(user);

      try {
        await getFriends().then((friends) => {
          setFriends(friends);
          console.log("friends loaded: ", friends);
        });
        // setFriends(friends).then(() => {
        //   console.log("friends loaded: ", friends);
        // });

        const wsUrl = getChatWsUrl(user.id);
        console.log("CHAT: Connecting to WebSocket:", wsUrl);
        socketRef.current = new WebSocket(wsUrl);

        socketRef.current.onopen = () => {
          console.log("CHAT: WebSocket connected");
          // Flush any messages queued while the socket was still connecting.
          const socket = socketRef.current;
          if (socket && socket.readyState === WebSocket.OPEN) {
            pendingMessagesRef.current.forEach((msg) =>
              socket.send(JSON.stringify(msg))
            );
            pendingMessagesRef.current = [];
          }
          setIsSuccess(true);
        };

        socketRef.current.onmessage = (event) => {
          console.log("CHAT: 📩 WS message:", event.data);
        };

        socketRef.current.onerror = () => {
          setInitError("Chat socket error. Is the chat backend running/reachable?");
          setIsSuccess(false);
        };

        socketRef.current.onclose = () => {
          console.log("CHAT: ❌ WebSocket closed");
        };

      } catch (e: any) {
        setInitError(e?.message || "Chat initialization failed.");
      } finally {
        setLoading(false);
      }
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
    const baseUrl = getUserMgmtBase();
    // const res = await fetch(`${process.env.NEXT_PUBLIC_USR_MANAG_URL}/me/friends`, {
    const res = await fetch(`${baseUrl}/me/friends`, {
      credentials: "include",
    });
    return res.ok ? res.json() : [];
  };

  const sendMessage = async (message: Message) => {
      console.log("message to send: ", message);
      const socket = socketRef.current;

      if (!socket) {
        console.warn("CHAT: No socket available to send message");
        return;
      }

      const payload = JSON.stringify(message);

      if (socket.readyState === WebSocket.OPEN) {
        socket.send(payload);
        return;
      }

      if (socket.readyState === WebSocket.CONNECTING) {
        // Queue the message and let the onopen handler flush.
        pendingMessagesRef.current.push(message);
        return;
      }

      console.warn("CHAT: Socket not open; readyState:", socket.readyState);
      // setMessages(prev => [...prev, message]);
  };

  const normalizeConversations = async (convs: Conversation[]) => {
  return Promise.all(
    convs.map(async (conv) => {
      if (conv.is_private && !conv.name) {
        const name = await getChannelName(conv.id);
        const status = await getReceiverStatus(conv.id);
        console.log("receiver status ===> ", status);
        // Try to compute peer avatar URL (if backend provided peer object key + timestamp)
        let avatar: string | null | undefined = conv.avatar;
        if (conv.peer_user_id && conv.peer_profile_pic) {
          const peerUser: UserWithAvatar = {
            id: Number(conv.peer_user_id),
            profile_pic: conv.peer_profile_pic,
            avatar_updated_at: conv.peer_avatar_updated_at ?? 0,
            username: conv.peer_username ?? undefined,
            first_name: conv.peer_first_name ?? undefined,
            last_name: conv.peer_last_name ?? undefined,
          };
          avatar = await getAvatarUrl(peerUser, { fallback: null });
        }

        return {
          ...conv,
          name: name || "Private Chat",
          is_online: status.status === "online" ? true : false,
          avatar: avatar ?? conv.avatar,
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
    const normalized = await normalizeConversations(data).then((res) => {
      console.log("normal ===> ", res);
      // send meeage
      res.forEach((conv) => {
        const message: Message = {
          uuid: crypto.randomUUID(),
          channel_id: conv.id,
          sender_id: currentUser != null ? currentUser.id.toString() : 'unknown',
          sent_at: new Date().toISOString(),
          content: "",
          sender_name: "",
          receiver_id: undefined,
          pending: 1,
          };
        sendMessage(message);
      });
      return res;
    });
    setConversations(normalized);
  };

  if (loading) {
    return <ChatLoadingScreen />;
  }

  if (initError) {
    return (
      <main className={styles.errorContainer}>
        <div className={styles.errorCard}>
          <h2 className={styles.errorTitle}>Chat unavailable</h2>
          <p className={styles.errorMessage}>{initError}</p>
          <p className={styles.errorHint}>
            Chat services are unavailable. Try refreshing the page.
          </p>
        </div>
      </main>
    );
  }

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
