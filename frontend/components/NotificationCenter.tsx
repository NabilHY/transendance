'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Bell, X, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import styles from './NotificationCenter.module.css';

import { getNotificationWsUrl } from '@/lib/api-config';

interface Notification {
    id: number;
    type: 'match_invite' | 'friend_request' | 'friend_accept' | 'tournament_invite' | 'system' | 'message';
    title: string;
    message: string;
    data: any;
    is_read: number;
    is_dismissed: number;
    sender_id: number;
    first_name?: string;
    last_name?: string;
    username?: string;
    created_at: number;
}

interface NotificationCenterProps {
    userId: number;
}

export function NotificationCenter({ userId }: NotificationCenterProps) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const fetchNotifications = useCallback(async () => {
        console.log("getting notifications....");
        
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_USR_MANAG_URL}/notifications`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                setNotifications(data.notifications || []);
                
                const unread = data.notifications.filter((n: Notification) => !n.is_read).length;
                setUnreadCount(unread);
            }
        } catch (err) {
            console.error('Failed to fetch notifications:', err);
        }
    }, []);

    const markAsRead = async (notificationId: number) => {
        try {
            await fetch(`${process.env.NEXT_PUBLIC_USR_MANAG_URL}/notifications/${notificationId}/read`, {
                method: 'PATCH',
                credentials: 'include'
            });
            
            setNotifications(prev =>
                prev.map(n =>
                    n.id === notificationId ? { ...n, is_read: 1 } : n
                )
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Failed to mark as read:', err);
        }
    };

    const handleNotificationClick = (notification: Notification) => {
        // Close dropdown first to prevent DOM manipulation errors during navigation
        setIsOpen(false);

        if (!notification.is_read) {
            markAsRead(notification.id);
        }

        console.log("hhhhhhhhhhhh ----> ", notification.sender_id, " | ", notification);

        // Use requestAnimationFrame to ensure dropdown closes before navigation
        requestAnimationFrame(() => {
            if (notification.type === 'friend_request') {
                console.log("it is a friend request");
                router.push(`/users/${notification.sender_id}`);
            } else if (notification.type === 'match_invite') {
                console.log("it is a match invite", notification.data?.conversation_id);

                if (notification.data?.gameData?.channelId) {
                    router.push(`/chat/${notification.data.gameData.channelId}`);
                }
            } else if (notification.type === 'message') {
                console.log("it is a message", notification.data?.conversation?.channelId);

                if (notification.data?.conversation?.channelId) {
                    router.push(`/chat/${notification.data.conversation.channelId}`);
                }
            }
        });
    };

    const dismissNotification = async (notificationId: number) => {
        try {
            await fetch(`${process.env.NEXT_PUBLIC_USR_MANAG_URL}/notifications/${notificationId}/dismiss`, {
                method: 'PATCH',
                credentials: 'include'
            });
            
            setNotifications(prev => prev.filter(n => n.id !== notificationId));
        } catch (err) {
            console.error('Failed to dismiss notification:', err);
        }
    };

    const markAllAsRead = async () => {
        try {
            await fetch(`${process.env.NEXT_PUBLIC_USR_MANAG_URL}/notifications/mark-all-read`, {
                method: 'PATCH',
                credentials: 'include'
            });
            
            setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
            setUnreadCount(0);
        } catch (err) {
            console.error('Failed to mark all as read:', err);
        }
    };

    useEffect(() => {
        fetchNotifications();

        const connectWebSocket = () => {
            console.log("Attempting WebSocket connection...");
            
            try {
                const wsUrl = getNotificationWsUrl();
                console.log("Connecting to notifications WebSocket:", wsUrl);
                
                // Close existing connection if any
                if (wsRef.current) {
                    wsRef.current.close();
                }
                
                wsRef.current = new WebSocket(wsUrl);

                wsRef.current.onopen = () => {
                    console.log('✅ Notification WebSocket connected (WSS/HTTPS ready)');
                };

                wsRef.current.onmessage = (event) => {
                    try {
                        const message = JSON.parse(event.data);
                        console.log("new message: ", message);
                        if (message.type === 'notification') {
                            setNotifications(prev => [message.data, ...prev]);
                            setUnreadCount(prev => prev + 1);
                        }
                    } catch (err) {
                        console.error('Failed to parse WebSocket message:', err);
                    }
                };

                wsRef.current.onerror = (err) => {
                    console.error('WebSocket error:', err);
                    // Don't immediately reconnect on error, let onclose handle it
                };

                wsRef.current.onclose = (event) => {
                    const wasClean = event.wasClean;
                    const code = event.code;
                    const reason = event.reason;
                    console.log(`WebSocket closed. Code: ${code}, Reason: ${reason || 'none'}, Clean: ${wasClean}`);
                    
                    // Only reconnect if it wasn't a clean close (user-initiated)
                    // and not an authentication error (1008)
                    if (code !== 1000 && code !== 1008) {
                        console.log('WebSocket closed unexpectedly, will retry in 5 seconds');
                        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 5000);
                    } else if (code === 1008) {
                        console.warn('WebSocket closed due to authentication error. Will not reconnect.');
                    }
                };
            } catch (err) {
                console.error('Failed to create WebSocket connection:', err);
                reconnectTimeoutRef.current = setTimeout(connectWebSocket, 5000);
            }
        };

        connectWebSocket();       


        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.close();
            }
        };
    }, []);

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'match_invite':
                return '🎮';
            case 'friend_request':
                return '👋';
            case 'friend_accept':
                return '✨';
            case 'tournament_invite':
                return '🏆';
            default:
                return '📢';
        }
    };

    const getNotificationColor = (type: string) => {
        switch (type) {
            case 'match_invite':
                return '#00f0ff';
            case 'friend_request':
                return '#b744ff';
            case 'tournament_invite':
                return '#00ff88';
            default:
                return '#ff006e';
        }
    };
    return (
        <div className={styles.notificationCenter}>
            <button
                className={styles.bellButton}
                onClick={() => setIsOpen(!isOpen)}
                title="Notifications"
            >
                <Bell size={24} />
                {unreadCount > 0 && (
                    <span className={styles.badge}>{unreadCount}</span>
                )}
            </button>

            {isOpen && (
                <div className={styles.dropdown}>
                    <div className={styles.header}>
                        <h3>Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                className={styles.markAllRead}
                                onClick={markAllAsRead}
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>

                    {notifications.length === 0 ? (
                        <div className={styles.empty}>
                            <Bell size={32} style={{ opacity: 0.5 }} />
                            <p>No notifications</p>
                        </div>
                    ) : (
                        <div className={styles.list}>
                            {notifications.map(notification => (
                                <div
                                    key={notification.id}
                                    className={`${styles.item} ${
                                        !notification.is_read ? styles.unread : ''
                                    }`}
                                    style={{
                                        borderLeftColor: getNotificationColor(
                                            notification.type
                                        )
                                    }}
                                    onClick={() => handleNotificationClick(notification)}
                                >
                                    <div className={styles.itemContent}>
                                        <div className={styles.itemHeader}>
                                            <span className={styles.icon}>
                                                {getNotificationIcon(
                                                    notification.type
                                                )}
                                            </span>
                                            <span className={styles.title}>
                                                {notification.title}
                                            </span>
                                            {!notification.is_read && (
                                                <span className={styles.unreadDot} />
                                            )}
                                        </div>
                                        <p className={styles.message}>
                                            {notification.message}
                                        </p>
                                        {notification.data?.senderName && (
                                            <small className={styles.sender}>
                                                from @
                                                {notification.data.senderUsername}
                                            </small>
                                        )}
                                    </div>

                                    <div className={styles.actions}>
                                        {!notification.is_read && (
                                            <button
                                                className={styles.actionBtn}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    markAsRead(notification.id);
                                                }}
                                                title="Mark as read"
                                            >
                                                <Check size={16} />
                                            </button>
                                        )}
                                        <button
                                            className={styles.dismissBtn}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                dismissNotification(notification.id);
                                            }}
                                            title="Dismiss"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
