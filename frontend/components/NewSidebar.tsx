'use client';

import styles from './NewSidebar.module.css';
import logo from '@/public/racket.png';
import { useAuth } from '@/context/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { NotificationCenter } from './NotificationCenter';

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
    const { isLoggedIn, logout, clearError, user } = useAuth();
    const pathname = usePathname();
    const router = useRouter();

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
                    <NotificationCenter userId={user?.id || 0} />
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
                    
                    return (
                        <div key={item.id} className={styles.navItemWrapper}>
                            <button
                                type="button"
                                onClick={() => handleNavigation(item.href)}
                                className={`${styles.navItem} ${active ? styles.active : ''}`}
                            >
                                <div className={styles.navItemContent}>
                                    <span className={styles.radioIcon}>
                                        {active && '•'}
                                    </span>
                                    <span>{item.label}</span>
                                </div>
                                <div className={styles.navItemRight}>
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
        </aside>
    );
}