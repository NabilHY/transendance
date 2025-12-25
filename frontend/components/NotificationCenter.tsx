/**
 * Notification Center Component
 * Displays notifications from the notification system
 */

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Bell, X, Check } from 'lucide-react';
import styles from './NotificationCenter.module.css';

interface Notification {
    id: number;
    type: 'match_invite' | 'friend_request' | 'friend_accept' | 'tournament_invite' | 'system';
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

    // Fetch notifications
    const fetchNotifications = useCallback(async () => {
        console.log("getting notifications....");
        
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_USR_MANAG_URL}/notifications`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                setNotifications(data.notifications || []);
                
                // Count unread
                const unread = data.notifications.filter((n: Notification) => !n.is_read).length;
                setUnreadCount(unread);
            }
        } catch (err) {
            console.error('Failed to fetch notifications:', err);
        }
    }, []);

    // Mark notification as read
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

    // Dismiss notification
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

    // Setup polling and WebSocket
    useEffect(() => {
        // Initial fetch
        fetchNotifications();

        // Poll every 30 seconds
        const pollInterval = setInterval(fetchNotifications, 30000);

        // Attempt WebSocket connection for real-time updates
        let ws: WebSocket | null = null;
        
        const connectWebSocket = () => {
            try {
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                ws = new WebSocket(`${protocol}//${window.location.host}/notifications`);

                ws.onopen = () => {
                    console.log('✅ Notification WebSocket connected');
                };

                ws.onmessage = (event) => {
                    try {
                        const message = JSON.parse(event.data);
                        
                        if (message.type === 'notification') {
                            // Add new notification to the list
                            setNotifications(prev => [message.data, ...prev]);
                            setUnreadCount(prev => prev + 1);
                        }
                    } catch (err) {
                        console.error('Failed to parse WebSocket message:', err);
                    }
                };

                ws.onerror = (err) => {
                    console.error('WebSocket error:', err);
                };

                ws.onclose = () => {
                    console.log('WebSocket closed, will retry in 5 seconds');
                    setTimeout(connectWebSocket, 5000);
                };
            } catch (err) {
                console.error('Failed to connect WebSocket:', err);
                setTimeout(connectWebSocket, 5000);
            }
        };

        connectWebSocket();

        return () => {
            clearInterval(pollInterval);
            if (ws) {
                ws.close();
            }
        };
    }, [fetchNotifications]);

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
                return '#00f0ff'; // neon blue
            case 'friend_request':
                return '#b744ff'; // neon purple
            case 'tournament_invite':
                return '#00ff88'; // neon green
            default:
                return '#ff006e'; // neon pink
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
        }
    }, [isOpen, fetchNotifications]);

    return (
        <div className={styles.notificationCenter}>
            {/* Bell Icon Button */}
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

            {/* Notification Dropdown */}
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
                                                onClick={() =>
                                                    markAsRead(notification.id)
                                                }
                                                title="Mark as read"
                                            >
                                                <Check size={16} />
                                            </button>
                                        )}
                                        <button
                                            className={styles.dismissBtn}
                                            onClick={() =>
                                                dismissNotification(notification.id)
                                            }
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
