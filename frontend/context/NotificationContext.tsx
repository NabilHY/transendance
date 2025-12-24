"use client";

import { createContext, useContext, useMemo, useState, useCallback, useEffect, useRef, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { getChatWsUrl } from "@/lib/api-config";

export interface GameInvite {
  inviteId: string;
  inviterId: string;
  inviterName: string;
  receiverId: string;
  channelId: string;
}

interface NotificationContextValue {
  gameInvites: number;
  inviteIds: Set<string>;
  pendingInvites: GameInvite[];
  addInvite: (invite: GameInvite) => void;
  removeInvite: (inviteId: string) => void;
  clearInvites: () => void;
  setSendMessageHandler: (handler: (message: any) => void) => void;
  acceptInvite: (inviteId: string) => void;
  declineInvite: (inviteId: string) => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user, isLoggedIn } = useAuth();
  const [inviteIds, setInviteIds] = useState<Set<string>>(new Set());
  const [pendingInvites, setPendingInvites] = useState<GameInvite[]>([]);
  const [sendMessageHandler, setSendMessageHandlerState] = useState<((message: any) => void) | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const pendingMessagesRef = useRef<any[]>([]);

  const setSendMessageHandler = useCallback((handler: (message: any) => void) => {
    setSendMessageHandlerState(() => handler);
  }, []);

  const addInvite = useCallback((invite: GameInvite) => {
    setInviteIds(prev => {
      if (prev.has(invite.inviteId)) return prev;
      const next = new Set(prev);
      next.add(invite.inviteId);
      return next;
    });
    setPendingInvites(prev => {
      if (prev.some(i => i.inviteId === invite.inviteId)) return prev;
      return [...prev, invite];
    });
  }, []);

  const removeInvite = useCallback((inviteId: string) => {
    setInviteIds(prev => {
      if (!prev.has(inviteId)) return prev;
      const next = new Set(prev);
      next.delete(inviteId);
      return next;
    });
    setPendingInvites(prev => prev.filter(i => i.inviteId !== inviteId));
  }, []);

  const clearInvites = useCallback(() => {
    setInviteIds(new Set());
    setPendingInvites([]);
  }, []);

  // Establish a lightweight global WebSocket to receive invites even outside /chat
  useEffect(() => {
    // Only connect when logged in and we have a user id
    if (!isLoggedIn || !user?.id) return;

    try {
      const wsUrl = getChatWsUrl(user.id);
      // Avoid creating multiple sockets
      if (socketRef.current) return;

      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        // Flush any queued messages
        if (socket.readyState === WebSocket.OPEN && pendingMessagesRef.current.length > 0) {
          pendingMessagesRef.current.forEach((msg) => socket.send(JSON.stringify(msg)));
          pendingMessagesRef.current = [];
        }
      };

      socket.onmessage = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data);
          // Expecting { content: string, sender_name?: string, channel_id: string }
          const data = typeof msg?.content === "string" ? JSON.parse(msg.content) : null;
          if (!data || typeof data !== "object") return;

          if (data.type === "game_invite") {
            const receiverId = String(data.receiverId);
            const myId = String(user.id);
            if (receiverId === myId) {
              const inviteId = String(data.inviteId);
              // De-dup using inviteIds Set
              setInviteIds((prev) => {
                if (prev.has(inviteId)) return prev;
                const next = new Set(prev);
                next.add(inviteId);
                return next;
              });
              setPendingInvites((prev) => {
                if (prev.some((i) => i.inviteId === inviteId)) return prev;
                const inviterName = msg?.sender_name || "";
                return [
                  ...prev,
                  {
                    inviteId,
                    inviterId: String(data.inviterId),
                    inviterName,
                    receiverId: receiverId,
                    channelId: String(msg.channel_id || ""),
                  },
                ];
              });
            }
          }
        } catch (_e) {
          // ignore malformed messages
        }
      };

      socket.onerror = () => {
        // Silent error; invitations will still appear when on /chat
      };

      socket.onclose = () => {
        socketRef.current = null;
      };

      return () => {
        try { socket.close(); } catch (_e) {}
        socketRef.current = null;
      };
    } catch (_e) {
      // ignore
    }
  }, [isLoggedIn, user?.id]);

  const sendViaSocket = useCallback((message: any) => {
    const socket = socketRef.current;
    const payload = JSON.stringify(message);
    if (!socket) {
      // No socket; queue and attempt later
      pendingMessagesRef.current.push(message);
      return;
    }
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(payload);
      return;
    }
    if (socket.readyState === WebSocket.CONNECTING) {
      pendingMessagesRef.current.push(message);
      return;
    }
    // CLOSED: drop silently
  }, []);

  const acceptInvite = useCallback((inviteId: string) => {
    const invite = pendingInvites.find(i => i.inviteId === inviteId);
    if (!invite || !sendMessageHandler) return;

    const response = JSON.stringify({
      type: "game_invite_response",
      inviteId,
      inviterId: invite.inviterId,
      receiverId: invite.receiverId,
      response: "accepted",
    });

    const msgPayload = {
      uuid: crypto.randomUUID(),
      channel_id: invite.channelId,
      sender_id: invite.receiverId,
      sent_at: new Date().toISOString(),
      content: response,
      sender_name: "",
      receiver_id: [invite.inviterId],
      pending: 0,
    };

    // Prefer chat's handler if registered; otherwise, fall back to global socket
    if (sendMessageHandler) {
      sendMessageHandler(msgPayload);
    } else {
      sendViaSocket(msgPayload);
    }

    removeInvite(inviteId);
  }, [pendingInvites, sendMessageHandler, removeInvite, sendViaSocket]);

  const declineInvite = useCallback((inviteId: string) => {
    const invite = pendingInvites.find(i => i.inviteId === inviteId);
    if (!invite || !sendMessageHandler) return;

    const response = JSON.stringify({
      type: "game_invite_response",
      inviteId,
      inviterId: invite.inviterId,
      receiverId: invite.receiverId,
      response: "declined",
    });

    const msgPayload = {
      uuid: crypto.randomUUID(),
      channel_id: invite.channelId,
      sender_id: invite.receiverId,
      sent_at: new Date().toISOString(),
      content: response,
      sender_name: "",
      receiver_id: [invite.inviterId],
      pending: 0,
    };

    if (sendMessageHandler) {
      sendMessageHandler(msgPayload);
    } else {
      sendViaSocket(msgPayload);
    }

    removeInvite(inviteId);
  }, [pendingInvites, sendMessageHandler, removeInvite, sendViaSocket]);

  const value = useMemo(
    () => ({
      gameInvites: inviteIds.size,
      inviteIds,
      pendingInvites,
      addInvite,
      removeInvite,
      clearInvites,
      setSendMessageHandler,
      acceptInvite,
      declineInvite,
    }),
    [inviteIds, pendingInvites, addInvite, removeInvite, clearInvites, setSendMessageHandler, acceptInvite, declineInvite]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
