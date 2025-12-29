'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { umUpdateProfile, getCsrfToken } from '@/lib/api';
import { useRequireAuth } from '@/hooks/useAuthGuard';
import { LoadingScreen } from '@/components/LoadingScreen';
import styles from '../login/LoginPage.module.css';

export default function CompleteProfilePage() {
    const router = useRouter();
    const { profileCheckRedirect, fetchMe } = useAuth();
    const [username, setUsername] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    const { loading: authLoading, isProfileComplete } = useRequireAuth();

    useEffect(() => {
        if (!authLoading && isProfileComplete) {
            router.push('/');
        }
    }, [authLoading, isProfileComplete, router]);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setMessage(null);
        setSubmitting(true);

        try {
            // Validate required fields
            if (!username.trim() || !firstName.trim() || !lastName.trim()) {
                setError('Username, first name, and last name are required');
                setSubmitting(false);
                return;
            }

            // Validate username format (alphanumeric and underscores)
            const usernameRegex = /^[a-zA-Z0-9_]+$/;
            if (!usernameRegex.test(username.trim())) {
                setError('Username can only contain letters, numbers, and underscores');
                setSubmitting(false);
                return;
            }

            // Get CSRF token
            const csrfToken = await getCsrfToken();

            // Update profile (avatar upload is handled separately via /me/avatar endpoint)
            const result = await umUpdateProfile({
                username: username.trim(),
                first_name: firstName.trim(),
                last_name: lastName.trim(),
            }, csrfToken);

            if (result.ok) {
                setMessage('Profile completed successfully!');
                
                // Refresh profile in auth context
                await fetchMe();

                // Redirect to home or profile page and force reload
                setTimeout(() => {
                    // Use window.location.href to force a full page reload with the new data
                    window.location.href = '/profile';
                }, 1500);
            } else {
                const errorMsg = (result.data as any)?.error || 'Failed to update profile';
                setError(errorMsg);
            }
        } catch (err) {
            setError('An unexpected error occurred. Please try again.');
            console.error('Profile update error:', err);
        } finally {
            setSubmitting(false);
        }
    }

    if (authLoading) {
        return <LoadingScreen />;
    }

    return (
        <main className={styles.page}>
            <div className={styles.container}>
                <div className={styles.grid}>
                    <section className={`${styles.card} ${styles.loginCard}`}>
                        <div className={styles.cardHeader}>
                            <h1 className={styles.title}>Complete your profile</h1>
                            <p className={styles.subtitle}>
                                Add your information to personalize your account and get started
                            </p>
                        </div>
                        
                        <div style={{
                            padding: '16px',
                            borderRadius: '12px',
                            background: 'rgba(23, 144, 255, 0.1)',
                            border: '1px solid rgba(23, 144, 255, 0.2)',
                            marginBottom: '8px'
                        }}>
                            <p style={{
                                margin: 0,
                                fontSize: '13px',
                                color: '#93a0c5',
                                lineHeight: '1.6'
                            }}>
                                <strong style={{ color: '#c6d4ff' }}>Why complete your profile?</strong><br />
                                Your profile information helps other users identify you and makes your 
                                account more personal. You can update this information anytime from your 
                                profile settings.
                            </p>
                        </div>

                        <form className={styles.form} onSubmit={onSubmit}>
                            <label className={styles.field}>
                                <span>Username *</span>
                                <div className={styles.inputWrapper}>
                                    <input
                                        className={styles.input}
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="Choose a unique username"
                                        required
                                        disabled={submitting}
                                        pattern="[a-zA-Z0-9_]+"
                                        minLength={3}
                                        maxLength={30}
                                    />
                                </div>
                                <span className={styles.fieldHint}>
                                    Letters, numbers, and underscores only. 3-30 characters.
                                </span>
                            </label>

                            <label className={styles.field}>
                                <span>First Name *</span>
                                <div className={styles.inputWrapper}>
                                    <input
                                        className={styles.input}
                                        type="text"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        placeholder="Enter your first name"
                                        required
                                        disabled={submitting}
                                        maxLength={50}
                                    />
                                </div>
                            </label>

                            <label className={styles.field}>
                                <span>Last Name *</span>
                                <div className={styles.inputWrapper}>
                                    <input
                                        className={styles.input}
                                        type="text"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        placeholder="Enter your last name"
                                        required
                                        disabled={submitting}
                                        maxLength={50}
                                    />
                                </div>
                            </label>

                            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4px' }}>
                                <button 
                                    type="submit" 
                                    disabled={submitting || !username.trim() || !firstName.trim() || !lastName.trim()} 
                                    className={styles.submitBtn}
                                >
                                    {submitting ? 'Completing profile…' : 'Complete profile'}
                                </button>
                            </div>

                            {message && (
                                <p className={styles.error} style={{ 
                                    background: 'rgba(76, 175, 80, 0.1)', 
                                    borderColor: 'rgba(76, 175, 80, 0.3)', 
                                    color: '#81c784' 
                                }}>
                                    {message}
                                </p>
                            )}

                            {error && (
                                <p className={styles.error}>{error}</p>
                            )}
                        </form>
                    </section>
                </div>
            </div>
        </main>
    );
}
