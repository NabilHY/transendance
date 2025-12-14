import { User } from "@/app/settings/page";

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

  export const sendMessage = async (
    content: string,
    getPending: number, 
    ws: WebSocket | null, 
    setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
    // setConversation: React.Dispatch<React.SetStateAction<Conversation>>,
    conversation: Conversation,
    currentUser: User | null
  ) => {

    if (!ws || (getPending == 0 && !content.trim())) return;

    // const activeConv = conversations.find(conv => conv.id === activeConversation);

    let receivers: string[] = await getReceivers(conversation.id, currentUser?.id.toString() || '');

    const message: Message = {
      uuid: crypto.randomUUID(),
      channel_id: conversation.id,
      sender_id: currentUser != null ? currentUser.id.toString() : 'unknown',
      sent_at: new Date().toISOString(),
      content: content,
      sender_name: currentUser != null ? currentUser.username : "unknown",
      receiver_id: receivers,
      pending: getPending,
    };

    console.log("message to send: ", message);

    ws.send(JSON.stringify(message));
    setMessages(prev => [...prev, message]);

    // setConversation(prev => prev
    //   ? {
    //     ...prev, 
    //     last_message_content: content, 
    //     last_message_time: "now"
    //   }
    //   : prev
    // );

};

export const getConversation = async (id: string) => {
  try {
    const conversation = await fetch(`${process.env.NEXT_PUBLIC_USR_MANAG_URL}/channel/${id}`, {
      method: "GET",
      credentials: "include",
    });
    if (!conversation.ok)
        throw new Error(`Server error: ${conversation.status}`);
    const data = await conversation.json();
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