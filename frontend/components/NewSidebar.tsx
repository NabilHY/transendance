'use client';

import { useState } from 'react';
import styles from './NewSidebar.module.css';
import logo from '@/public/racket.png';
import { useAuth } from '@/context/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronDown, ChevronUp, LogOut } from 'lucide-react';

const authenticatedItems = [
    { id: "home", label: "Dashboard", href: "/" },
    { id: "profile", label: "Profile", href: "/profile" },
    { id: "chat", label: "Chat", href: "/chat" },
    { id: "game", label: "Game", href: "/game" },
    { id: "settings", label: "Settings", href: "/settings", hasDropdown: true },
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
    const [settingsDropdownOpen, setSettingsDropdownOpen] = useState(false);

    const items = isLoggedIn ? authenticatedItems : unauthenticatedItems;
    
    const getActiveItem = () => {
        return items.find((item) => pathname === item.href || pathname?.startsWith(item.href + '/'));
    }
    
    const handleNavigation = (path: string) => {
        router.push(path);
    }
    
    const handleSettingsClick = () => {
        setSettingsDropdownOpen(!settingsDropdownOpen);
    };

    const handlePasswordSecurityClick = () => {
        router.push('/settings/security-settings');
        setSettingsDropdownOpen(false);
    };

    const handleProfileSettingsClick = () => {
        router.push('/settings/profile-settings');
        setSettingsDropdownOpen(false);
    };
    
    const activeItem = getActiveItem();
    const isSettingsActive = pathname === '/settings' || pathname?.startsWith('/settings/');

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
                    const active = item.id === activeItem?.id || (item.id === 'settings' && isSettingsActive);
                    const isSettings = item.id === 'settings' && (item as { hasDropdown?: boolean }).hasDropdown === true;
                    
                    return (
                        <div key={item.id} className={styles.navItemWrapper}>
                            <button
                                type="button"
                                onClick={isSettings ? handleSettingsClick : () => handleNavigation(item.href)}
                                className={`${styles.navItem} ${active ? styles.active : ''}`}
                            >
                                <div className={styles.navItemContent}>
                                    <span className={styles.radioIcon}>
                                        {active && '•'}
                                    </span>
                                    <span>{item.label}</span>
                                </div>
                                <div className={styles.navItemRight}>
                                    {isSettings && (
                                        <span className={styles.chevronIcon}>
                                            {settingsDropdownOpen ? (
                                                <ChevronUp size={16} />
                                            ) : (
                                                <ChevronDown size={16} />
                                            )}
                                        </span>
                                    )}
                                    {!isSettings && (
                                        <span className={styles.ellipsisIcon}>⋯</span>
                                    )}
                                </div>
                            </button>
                            
                            {isSettings && (
                                <div 
                                    className={`${styles.dropdown} ${settingsDropdownOpen ? styles.dropdownOpen : ''}`}
                                >
                                    <button
                                        type="button"
                                        onClick={handleProfileSettingsClick}
                                        className={`${styles.dropdownItem} ${pathname === '/settings/profile-settings' ? styles.dropdownItemActive : ''}`}
                                    >
                                        <span className={styles.dropdownItemContent}>
                                            <span className={styles.dropdownRadioIcon}>
                                                {pathname === '/settings/profile-settings' && '•'}
                                            </span>
                                            <span>Profile Settings</span>
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handlePasswordSecurityClick}
                                        className={`${styles.dropdownItem} ${pathname === '/settings/security-settings' ? styles.dropdownItemActive : ''}`}
                                    >
                                        <span className={styles.dropdownItemContent}>
                                            <span className={styles.dropdownRadioIcon}>
                                                {pathname === '/settings/security-settings' && '•'}
                                            </span>
                                            <span>Password and Security</span>
                                        </span>
                                    </button>
                                </div>
                            )}
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