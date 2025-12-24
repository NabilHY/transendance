'use client';

import { useState } from 'react';
import styles from './NewSidebar.module.css';
import logo from '@/public/racket.png';
import { useAuth } from '@/context/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut, X } from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';

const authenticatedItems = [
    { id: "home", label: "Dashboard", href: "/" },
    { id: "profile", label: "Profile", href: "/profile" },
    { id: "chat", label: "Chat", href: "/chat" },
    { id: "game", label: "Game", href: "/game" },
    { id: "settings", label: "Settings", href: "/settings" },
];


const unauthenticatedItems = [
    { id: "login", label: "Login", href: "/login" },
    { id: "register", label: "Register", href: "/register" },
    { id: "forgot-password", label: "Forgot Password", href: "/forgot-password" },
];

export default function NewSidebar() {
    const { isLoggedIn, logout, clearError } = useAuth();
    const pathname = usePathname();
    const router = useRouter();
    const { gameInvites, pendingInvites, acceptInvite, declineInvite } = useNotifications();
    const [showInvitePanel, setShowInvitePanel] = useState(false);

    const items = isLoggedIn ? authenticatedItems : unauthenticatedItems;
    
    const getActiveItem = () => {
        return items.find((item) => pathname === item.href || pathname?.startsWith(item.href + '/'));
    }
    
    const handleNavigation = (path: string) => {
        router.push(path);
    }
    
    const activeItem = getActiveItem();

    return (
        <aside className={styles.sidebar}>
            <div className={styles.header}>
                <div className={styles.logoContainer}>
                    <Link href="/" className={styles.logoLink}>
                        <img 
                            src={logo.src} 
                            alt="Logo" 
                            width={40} 
                            height={40} 
                            className={styles.logoImage}
                        />
                    </Link>
                    <div className={styles.logoText}>
                        <span className={styles.logoTitle}>Ping Pong</span>
                        <span className={styles.logoSubtitle}>Hub</span>
                    </div>
                </div>
                <div className={styles.headerControls}>
                    <button
                        type="button"
                        className={styles.controlBtn}
                        aria-label="Collapse sidebar"
                    >
                        «
                    </button>
                    <button
                        type="button"
                        className={styles.controlBtn}
                        aria-label="Sidebar menu"
                    >
                        ⋮
                    </button>
                </div>
            </div>

            <nav className={styles.nav}>
                {items.map((item) => {
                    const active = item.id === activeItem?.id;
                    const hasPendingInvites = item.id === 'chat' && gameInvites > 0;
                    
                    return (
                        <div key={item.id} className={styles.navItemWrapper}>
                            <button
                                type="button"
                                onClick={() => {
                                    if (item.id === 'chat' && gameInvites > 0) {
                                        setShowInvitePanel(!showInvitePanel);
                                    } else {
                                        handleNavigation(item.href);
                                    }
                                }}
                                className={`${styles.navItem} ${active ? styles.active : ''}`}
                            >
                                <div className={styles.navItemContent}>
                                    <span className={styles.radioIcon}>
                                        {active && '•'}
                                    </span>
                                    <span>{item.label}</span>
                                </div>
                                <div className={styles.navItemRight}>
                                    {hasPendingInvites && (
                                        <span className={styles.badge}>{gameInvites}</span>
                                    )}
                                    <span className={styles.ellipsisIcon}>⋯</span>
                                </div>
                            </button>
                        </div>
                    );
                })}
            </nav>

            {!isLoggedIn && (
                <button
                    type="button"
                    onClick={() => handleNavigation('/login')}
                    className={styles.loginBtn}
                >
                    Login / Register
                </button>
            )}

            {isLoggedIn && (
                <button
                    type="button"
                    onClick={() => { clearError(); logout(); }}
                    className={styles.logoutBtn}
                >
                    <LogOut size={18} />
                    <span>Logout</span>
                </button>
            )}

            {showInvitePanel && isLoggedIn && (
                <div className={styles.invitePanel}>
                    <div className={styles.invitePanelHeader}>
                        <h3 className={styles.invitePanelTitle}>Game Invites</h3>
                        <button
                            type="button"
                            className={styles.invitePanelClose}
                            onClick={() => setShowInvitePanel(false)}
                            aria-label="Close invites panel"
                        >
                            <X size={16} />
                        </button>
                    </div>
                    <div className={styles.invitePanelContent}>
                        {pendingInvites.length === 0 ? (
                            <p className={styles.noInvites}>No pending invites</p>
                        ) : (
                            <div className={styles.invitesList}>
                                {pendingInvites.map((invite) => (
                                    <div key={invite.inviteId} className={styles.inviteItem}>
                                        <div className={styles.inviteInfo}>
                                            <span className={styles.inviterName}>
                                                {invite.inviterName}
                                            </span>
                                            <span className={styles.inviteAction}>
                                                invited you to a match
                                            </span>
                                        </div>
                                        <div className={styles.inviteActions}>
                                            <button
                                                type="button"
                                                className={styles.acceptBtn}
                                                onClick={() => acceptInvite(invite.inviteId)}
                                            >
                                                Accept
                                            </button>
                                            <button
                                                type="button"
                                                className={styles.declineBtn}
                                                onClick={() => declineInvite(invite.inviteId)}
                                            >
                                                Decline
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </aside>
    );
}