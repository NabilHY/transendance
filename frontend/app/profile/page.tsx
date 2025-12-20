'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useUser } from '@/context/UserContext';
import { useAuth } from '@/context/AuthContext';
import { useRequireAuth } from '@/hooks/useAuthGuard';
import { User, Settings, Users, Home, LogOut, RefreshCw, Circle } from 'lucide-react';
import styles from '../login/LoginPage.module.css';
import { getAvatarUrl, getInitials, type UserWithAvatar } from '@/lib/avatar';

export default function ProfilePage() {
    const { profile, loading, error, updateOnlineStatus, clearError } = useUser();
    const { loading: authLoading, isProfileComplete } = useRequireAuth();
    const { logout } = useAuth();
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [avatarError, setAvatarError] = useState(false);

    useEffect(() => {
        if (!profile) return;
        let cancelled = false;
        const userData: UserWithAvatar = {
            id: profile.id,
            profile_pic: profile.profile_pic,
            avatar_updated_at: (profile as any).avatar_updated_at,
            username: profile.username,
            first_name: profile.first_name,
            last_name: profile.last_name,
        };
        getAvatarUrl(userData, { isCurrentUser: true }).then(url => {
            if (!cancelled) {
                setAvatarUrl(url);
            }
        }).catch(() => {
            if (!cancelled) {
                setAvatarError(true);
            }
        });
        return () => { cancelled = true; };
    }, [profile?.id, profile?.profile_pic, (profile as any)?.avatar_updated_at]);
    
    if (authLoading || loading) {
        return (
            <main className={styles.page}>
                <div className={styles.container}>
                    <div style={{ color: '#8c96b6', fontSize: '15px' }}>Loading...</div>
                </div>
            </main>
        );
    }

    const handleStatusToggle = async () => {
        if (!profile) return;
        setIsUpdatingStatus(true);
        try {
            await updateOnlineStatus(profile.is_online === 0);
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const handleRefresh = () => {
        window.location.reload();
    };

    return (
        <main className={styles.page}>
            <div className={styles.container} style={{ maxWidth: '800px' }}>
                {/* Navigation Header */}
                <div style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '24px',
                    padding: '16px 24px',
                    background: '#0b111f',
                    border: '1px solid #1b253f',
                    borderRadius: '16px'
                }}>
                    <h1 style={{
                        margin: 0,
                        fontSize: '24px',
                        fontWeight: 700,
                        color: '#e4ecff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                    }}>
                        <User size={24} />
                        My Profile
                    </h1>
                    <nav style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <Link 
                            href="/" 
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 12px',
                                background: 'rgba(255, 255, 255, 0.04)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: '8px',
                                color: '#93a0c5',
                                textDecoration: 'none',
                                fontSize: '14px',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                            }}
                        >
                            <Home size={16} />
                            Dashboard
                        </Link>
                        <Link 
                            href="/users"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 12px',
                                background: 'rgba(255, 255, 255, 0.04)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: '8px',
                                color: '#93a0c5',
                                textDecoration: 'none',
                                fontSize: '14px',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                            }}
                        >
                            <Users size={16} />
                            Users
                        </Link>
                        <Link 
                            href="/settings"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 12px',
                                background: 'rgba(255, 255, 255, 0.04)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                borderRadius: '8px',
                                color: '#93a0c5',
                                textDecoration: 'none',
                                fontSize: '14px',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                            }}
                        >
                            <Settings size={16} />
                            Settings
                        </Link>
                        <button 
                            onClick={logout}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 12px',
                                background: 'rgba(255, 77, 77, 0.1)',
                                border: '1px solid rgba(255, 77, 77, 0.2)',
                                borderRadius: '8px',
                                color: '#ff9595',
                                fontSize: '14px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 77, 77, 0.15)';
                                e.currentTarget.style.borderColor = 'rgba(255, 77, 77, 0.3)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 77, 77, 0.1)';
                                e.currentTarget.style.borderColor = 'rgba(255, 77, 77, 0.2)';
                            }}
                        >
                            <LogOut size={16} />
                            Logout
                        </button>
                    </nav>
                </div>

                {error && (
                    <div style={{
                        width: '100%',
                        padding: '16px',
                        marginBottom: '24px',
                        background: 'rgba(255, 77, 77, 0.1)',
                        border: '1px solid rgba(255, 77, 77, 0.3)',
                        borderRadius: '12px',
                        color: '#ff9595',
                        fontSize: '14px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <span>{error}</span>
                        <button 
                            onClick={clearError}
                            style={{
                                background: 'rgba(255, 77, 77, 0.2)',
                                border: '1px solid rgba(255, 77, 77, 0.3)',
                                borderRadius: '6px',
                                padding: '4px 8px',
                                color: '#ff9595',
                                fontSize: '12px',
                                cursor: 'pointer'
                            }}
                        >
                            Dismiss
                        </button>
                    </div>
                )}

                {profile ? (
                    <div className={styles.grid} style={{ width: '100%' }}>
                        <section className={styles.card} style={{ width: '100%' }}>
                            <div className={styles.cardHeader} style={{ textAlign: 'left', marginBottom: '24px' }}>
                                <h2 className={styles.title} style={{ fontSize: '24px', marginBottom: '8px' }}>
                                    Profile Information
                                </h2>
                                <p className={styles.subtitle} style={{ textAlign: 'left' }}>
                                    View and manage your account details
                                </p>
                            </div>

                            {/* Profile Picture */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'center',
                                marginBottom: '32px'
                            }}>
                                {avatarUrl && !avatarError ? (
                                    <img 
                                        src={avatarUrl} 
                                        alt="Profile"
                                        onError={() => setAvatarError(true)}
                                        style={{
                                            width: '120px',
                                            height: '120px',
                                            borderRadius: '16px',
                                            border: '2px solid #1b253f',
                                            objectFit: 'cover'
                                        }}
                                    />
                                ) : (
                                    <div style={{
                                        width: '120px',
                                        height: '120px',
                                        borderRadius: '16px',
                                        border: '2px solid #1b253f',
                                        background: '#1b253f',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '48px',
                                        fontWeight: 'bold',
                                        color: '#6b7593'
                                    }}>
                                        {profile ? getInitials({
                                            id: profile.id,
                                            username: profile.username,
                                            first_name: profile.first_name,
                                            last_name: profile.last_name,
                                        }) : '?'}
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'grid', gap: '20px' }}>
                                <div className={styles.field}>
                                    <span style={{ fontSize: '12px', color: '#6b7593', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        User ID
                                    </span>
                                    <div style={{
                                        padding: '12px 16px',
                                        background: '#050b16',
                                        border: '1px solid #1e2b45',
                                        borderRadius: '12px',
                                        color: '#e4ecff',
                                        fontSize: '15px'
                                    }}>
                                        {profile.id}
                                    </div>
                                </div>

                                <div className={styles.field}>
                                    <span style={{ fontSize: '12px', color: '#6b7593', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Username
                                    </span>
                                    <div style={{
                                        padding: '12px 16px',
                                        background: '#050b16',
                                        border: '1px solid #1e2b45',
                                        borderRadius: '12px',
                                        color: '#e4ecff',
                                        fontSize: '15px',
                                        fontWeight: 600
                                    }}>
                                        @{profile.username}
                                    </div>
                                </div>

                                <div className={styles.field}>
                                    <span style={{ fontSize: '12px', color: '#6b7593', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        First Name
                                    </span>
                                    <div style={{
                                        padding: '12px 16px',
                                        background: '#050b16',
                                        border: '1px solid #1e2b45',
                                        borderRadius: '12px',
                                        color: '#e4ecff',
                                        fontSize: '15px'
                                    }}>
                                        {profile.first_name || <span style={{ color: '#6b7593' }}>Not set</span>}
                                    </div>
                                </div>

                                <div className={styles.field}>
                                    <span style={{ fontSize: '12px', color: '#6b7593', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Last Name
                                    </span>
                                    <div style={{
                                        padding: '12px 16px',
                                        background: '#050b16',
                                        border: '1px solid #1e2b45',
                                        borderRadius: '12px',
                                        color: '#e4ecff',
                                        fontSize: '15px'
                                    }}>
                                        {profile.last_name || <span style={{ color: '#6b7593' }}>Not set</span>}
                                    </div>
                                </div>

                                <div className={styles.field}>
                                    <span style={{ fontSize: '12px', color: '#6b7593', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Online Status
                                    </span>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '12px 16px',
                                        background: '#050b16',
                                        border: '1px solid #1e2b45',
                                        borderRadius: '12px'
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            flex: 1
                                        }}>
                                            <Circle 
                                                size={12} 
                                                fill={profile.is_online ? '#51cf66' : '#6b7593'}
                                                color={profile.is_online ? '#51cf66' : '#6b7593'}
                                            />
                                            <span style={{
                                                color: profile.is_online ? '#51cf66' : '#6b7593',
                                                fontWeight: 600,
                                                fontSize: '15px'
                                            }}>
                                                {profile.is_online ? 'Online' : 'Offline'}
                                            </span>
                                        </div>
                                        <button 
                                            onClick={handleStatusToggle}
                                            disabled={isUpdatingStatus}
                                            className={styles.submitBtn}
                                            style={{
                                                padding: '8px 16px',
                                                fontSize: '13px',
                                                background: profile.is_online 
                                                    ? 'linear-gradient(135deg, #ff6b6b, #ff8787)' 
                                                    : 'linear-gradient(135deg, #51cf66, #69db7c)',
                                                opacity: isUpdatingStatus ? 0.6 : 1,
                                                cursor: isUpdatingStatus ? 'not-allowed' : 'pointer'
                                            }}
                                        >
                                            {isUpdatingStatus ? 'Updating...' : 
                                             (profile.is_online ? 'Go Offline' : 'Go Online')}
                                        </button>
                                    </div>
                                </div>

                                {profile.profile_pic && (
                                    <div className={styles.field}>
                                        <span style={{ fontSize: '12px', color: '#6b7593', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            Avatar Object Key
                                        </span>
                                        <div style={{
                                            padding: '12px 16px',
                                            background: '#050b16',
                                            border: '1px solid #1e2b45',
                                            borderRadius: '12px',
                                            color: '#93a0c5',
                                            fontSize: '13px',
                                            wordBreak: 'break-all'
                                        }}>
                                            {profile.profile_pic}
                                        </div>
                                        <span style={{ fontSize: '11px', color: '#6b7593', marginTop: '4px', display: 'block' }}>
                                            This is an object key, not a URL. Use the avatar upload feature to change it.
                                        </span>
                                    </div>
                                )}

                                <div className={styles.field}>
                                    <span style={{ fontSize: '12px', color: '#6b7593', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Member Since
                                    </span>
                                    <div style={{
                                        padding: '12px 16px',
                                        background: '#050b16',
                                        border: '1px solid #1e2b45',
                                        borderRadius: '12px',
                                        color: '#e4ecff',
                                        fontSize: '15px'
                                    }}>
                                        {new Date(profile.created_at).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div style={{
                                marginTop: '32px',
                                paddingTop: '24px',
                                borderTop: '1px solid #1b253f'
                            }}>
                                <h3 style={{
                                    margin: '0 0 16px 0',
                                    fontSize: '16px',
                                    fontWeight: 600,
                                    color: '#e4ecff'
                                }}>
                                    Quick Actions
                                </h3>
                                <div style={{
                                    display: 'flex',
                                    gap: '12px',
                                    flexWrap: 'wrap'
                                }}>
                                    <Link 
                                        href="/users"
                                        className={styles.submitBtn}
                                        style={{
                                            textDecoration: 'none',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '12px 20px',
                                            fontSize: '14px'
                                        }}
                                    >
                                        <Users size={16} />
                                        Browse Users
                                    </Link>
                                    <Link 
                                        href="/settings"
                                        className={styles.submitBtn}
                                        style={{
                                            textDecoration: 'none',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '12px 20px',
                                            fontSize: '14px'
                                        }}
                                    >
                                        <Settings size={16} />
                                        Edit Profile
                                    </Link>
                                    <button 
                                        onClick={handleRefresh}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '12px 20px',
                                            fontSize: '14px',
                                            background: 'rgba(255, 255, 255, 0.04)',
                                            border: '1px solid rgba(255, 255, 255, 0.08)',
                                            borderRadius: '12px',
                                            color: '#93a0c5',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                                        }}
                                    >
                                        <RefreshCw size={16} />
                                        Refresh
                                    </button>
                                </div>
                            </div>
                        </section>
                    </div>
                ) : (
                    <div className={styles.grid} style={{ width: '100%' }}>
                        <section className={styles.card} style={{ width: '100%' }}>
                            <div style={{
                                padding: '24px',
                                textAlign: 'center',
                                color: '#8c96b6'
                            }}>
                                <h3 style={{
                                    margin: '0 0 12px 0',
                                    fontSize: '18px',
                                    color: '#e4ecff'
                                }}>
                                    No Profile Found
                                </h3>
                                <p style={{
                                    margin: '0 0 20px 0',
                                    fontSize: '14px',
                                    lineHeight: '1.6'
                                }}>
                                    A profile will be created automatically when you first interact with the user management system.
                                </p>
                                <Link 
                                    href="/users"
                                    className={styles.submitBtn}
                                    style={{
                                        textDecoration: 'none',
                                        display: 'inline-block'
                                    }}
                                >
                                    Visit Users Page
                                </Link>
                            </div>
                        </section>
                    </div>
                )}
            </div>
        </main>
    );
}
