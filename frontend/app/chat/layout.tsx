'use client';

import { useState, useEffect, useRef } from "react";
import ConversationsList from "../../components/ConversationList";
import styles from "./styles.module.css";
import { fetchCurrentUser } from "@/lib/fetcher";
import { Friend } from "@/lib/chat";
import ChatSocketContext from "./ChatSocketContext";

const chatURL = process.env.NEXT_PUBLIC_CHAT_URL || "ws://localhost:8006";
const userMgntURL = process.env.NEXT_PUBLIC_USR_MANAG_URL || "http://localhost:4000";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [isSuccess, setIsSuccess] = useState(false);
  const [currentUser, setCurrentUser] =
    useState<{ id: string; name: string; avatar?: string } | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const socketRef = useRef<WebSocket | null>(null);

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
        console.log("✅ WebSocket connected");
      };

      socketRef.current.onmessage = (event) => {
        console.log("📩 WS message:", event.data);
      };

      socketRef.current.onclose = () => {
        console.log("❌ WebSocket closed");
      };

      setIsSuccess(true);
    };

    init();

    return () => {
      socketRef.current?.close();
    };
  }, []);

  const getFriends = async () => {
    const res = await fetch(`${userMgntURL}/me/friends`, {
      credentials: "include",
    });
    return res.ok ? res.json() : [];
  };

  const sendMessage = (payload: any) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(payload));
    }
  };

  if (!isSuccess || !currentUser) return null;

  return (
    <ChatSocketContext.Provider
      value={{
        socket: socketRef.current,
        sendMessage,
      }}
    >
      <div className={styles.container}>
        <div className={styles.mainContent}>
          <div className={styles.chatSection}>
            <ConversationsList
              currentUser={currentUser}
              friends={friends}
              onSendMessage={sendMessage}
            />
            <div className={styles.rightPanel}>
              {children}
            </div>
          </div>
        </div>
      </div>
    </ChatSocketContext.Provider>
  );
};

export default Layout;


// 'use client';

// import { useState, useEffect, useRef } from "react";
// import ConversationsList from "../../components/ConversationList";
// import ChatWindow from "../../components/ChatWindow";
// import styles from "./styles.module.css";
// import { fetchCurrentUser } from "@/lib/fetcher";
// import { Conversation, Message, Friend } from "@/lib/chat";
// import Link from "next/link";



// const chatPort = process.env.NEXT_PUBLIC_CHAT_URL || "ws://localhost:8006";
// const userMgntURL = process.env.NEXT_PUBLIC_USR_MANAG_URL || "http://localhost:4000";

// const layout = ({children}: {children: React.ReactNode}) => {

//   const [isSuccess, setIsSuccess] = useState<boolean>(false);
//   const [currentUser, setCurrentUser] = useState<{ id: string; name: string; avatar?: string } | null>(null);
//   const [friends, setFriends] = useState<Friend[]>([]);

//   useEffect(() => {

//   const run = async () => {
//       // ! * WARNING: this test just for testing, I must removed it later
//       const res = await fetch(`${userMgntURL}/users`, {
//         method: "GET",
//         credentials: "include"
//       });

//       const currentUser = await fetchCurrentUser();

//       setCurrentUser(currentUser);

//       if (!currentUser) {
//         console.error("No current user, cannot establish WebSocket connection.");
//         return;
//       }

//       // setConversations(await getConversations(currentUser.id));
//       setFriends(await getFriends(currentUser.id));
//       const data = await res.json();
//     };

//     run();

//     setIsSuccess(true);
//   return () => {
//     console.log("out");
//   };
// }, []);

//   const getFriends = async (id: string) => {
//     try {
//       const res = await fetch(`${userMgntURL}/me/friends`, {
//         method: "GET",
//         credentials: "include",
//       });
//       if (!res.ok)
//         throw new Error(`Server error: ${res.status}`);
//       const data = await res.json();
//       console.log("all friends user: ", data);
//       return data;
//     } catch (err) {
//       console.error("Failed to fetch friends:", err);
//       return [];
//     }
//   }

//   const sendMessage = async () => {
//     console.log("send message tfooooooooooo");
//   }

//   return (
//     <>
//       {isSuccess === true && currentUser !== null && (
//         <>
//         {/* <Link href="/chat/270d54e4-a0e2-42d9-8f48-4807054e3b25" >&larr; Back to Chats</Link> */}
//         <div className={styles.container}>
//           <div className={styles.mainContent}>
//             <div className={styles.chatSection}>
//               <ConversationsList
//                 currentUser={currentUser}
//                 friends={friends}
//                 onSendMessage={sendMessage}
//               />
//               <div className={styles.rightPanel}>
//                 { children }
//               </div>
//             </div>
//           </div>
//         </div>
//       </>
//     )}
//     </>
//   )
// }

// export default layout