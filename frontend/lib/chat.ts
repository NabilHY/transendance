import { User } from "@/app/settings/page";
import { exitCode } from "process";
// import { useRouter } from "next/navigation";

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
  avatar?: string;
  last_message_id: string;
  last_message_content: string;
  last_message_sender: string;
  last_message_time: string;
}

export interface Friend {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  profile_pic: string;
  is_online: number;
  status: string;
}

export const getReceivers = async (channelId: string, userId: string) => {
    try {    
      const res = await fetch(`${process.env.NEXT_PUBLIC_USR_MANAG_URL}/channel/${channelId}/members`, {
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

//   export const sendMessage = async (
//     content: string,
//     getPending: number, 
//     ws: WebSocket | null, 
//     setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
//     // setConversation: React.Dispatch<React.SetStateAction<Conversation>>,
//     conversation: Conversation,
//     currentUser: User | null
//   ) => {

//     if (!ws || (getPending == 0 && !content.trim())) return;

//     let receivers: string[] = await getReceivers(conversation.id, currentUser?.id.toString() || '');

//     const message: Message = {
//       uuid: crypto.randomUUID(),
//       channel_id: conversation.id,
//       sender_id: currentUser != null ? currentUser.id.toString() : 'unknown',
//       sent_at: new Date().toISOString(),
//       content: content,
//       sender_name: currentUser != null ? currentUser.username : "unknown",
//       receiver_id: receivers,
//       pending: getPending,
//     };

//     console.log("message to send: ", message);

//     ws.send(JSON.stringify(message));
//     setMessages(prev => [...prev, message]);
// };

export const getConversation = async (id: string) => {
  try {
    const conversation = await fetch(`${process.env.NEXT_PUBLIC_USR_MANAG_URL}/channel/${id}`, {
      method: "GET",
      credentials: "include",
    });
    if (!conversation.ok)
        throw new Error(`Server error: ${conversation.status}`);
    const data = await conversation.json();
    if(data.is_private) {
      data.name = await getChannelName(data.id);
      console.log("* DATA: ", data);
    }
    return data;
  } catch (err) {
    console.error("Failed to fetch channel info:", err);
    return [];
  }
}

export const getChannelName = async (channelId: string) => {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_USR_MANAG_URL}/channel/${channelId}/name`, {
      method: "GET",
      credentials: "include",
    });
    if(!res.ok)
      throw new Error(`Server error: ${res.status}`);
    const data = await res.json();
    console.log("data received: ", data.name);
    return data.name;
  } catch (err) {
    console.error("Failed to fetch channel name:", err);
    return "";
  }
}

export const getReceiverId = async (conversation: Conversation) => {
  console.log("clicked on user info of conversation: ", conversation);
  if(conversation.is_private) {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_USR_MANAG_URL}/channel/${conversation.id}/receiverId`, {
        method: "GET",
        credentials: "include",
      });
      if(!res.ok)
        throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      console.log("* INFO: ", data);
      return data.id;
    } catch (err) {
      console.error("Failed to fetch user info:", err);
    }
  } else {
    // groupe page I should add it later -- simo
  }
}

export const handleMessageClick = async (userId: string) => {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_USR_MANAG_URL}/chat/direct/${userId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
    });

    const data = await res.json();
    if (res.ok) {
        console.log("direct data ---> ", data);
        if(data.conversationId !== -1) {
            console.log("convers`/chat/${data.conversationId}`ation found: ", data.conversationId);
            return `/chat/${data.conversationId}`;
        } else {
            console.log("conversation found not found: ", data.conversationId);
            try {
                const createRes = await fetch(`${process.env.NEXT_PUBLIC_USR_MANAG_URL}/chat/direct`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ targetUserId: user?.id }),
                });
                const conv = await createRes.json();
                console.log("conv ID: ", conv);
                return `/chat/${conv.conversationId}`;
            } catch (err) {
                console.error("Failed to create direct conversation", err);
            }
        }
    }
  } catch (err) {
      console.error("Failed to open conversation", err);
  }
}


export const getConversations = async (id: string) => {
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