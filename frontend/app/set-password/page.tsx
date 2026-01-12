'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from '../login/LoginPage.module.css';

const API_BASE =
  process.env.NEXT_PUBLIC_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  'http://localhost:8005';

export default function SetPasswordPage() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    useEffect(() => {
        if (!token) {
            router.push('/login');
        }
    }, [token, router]);
    
    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setMessage(null);
        
        // Validate passwords match
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        
        // Validate minimum length
        if (password.length < 12) {
            setError('Password must be at least 12 characters long');
            return;
        }
        
        setSubmitting(true);
        try {
            const res = await fetch(`${API_BASE}/api/auth/set-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ token, password })
            });
            
            const data = await res.json();
            
            if (!res.ok) {
                setError(data?.error || 'Password update failed');
                return;
            }
            
            setMessage(data?.message || 'Password set successfully');
            
            // Handle redirect for OAuth users
            if (data?.redirect) {
                setTimeout(() => {
                    window.location.href = data.redirect;
                }, 2000);
            } else {
                // For password reset, redirect to login after success
                setTimeout(() => {
                    router.push('/login?reset=success');
                }, 2000);
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };
    
    if (!token) {
        return null; // Will redirect in useEffect
    }
    
    return (
        <main className={styles.page}>
            <div className={styles.container}>
                <div className={styles.grid}>
                    <section className={`${styles.card} ${styles.loginCard}`}>
                        <div className={styles.cardHeader}>
                            <h1 className={styles.title}>Set your password</h1>
                            <p className={styles.subtitle}>
                                You logged in with Google OAuth. Please set a password to secure your account.
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
                                <strong style={{ color: '#c6d4ff' }}>Why set a password?</strong><br />
                                Setting a password allows you to log in with your email and password, 
                                giving you more control over your account security. You can still use 
                                Google OAuth to sign in after setting a password.
                            </p>
                        </div>
                        
                        <form className={styles.form} onSubmit={onSubmit}>
                            <label className={styles.field}>
                                <span>Password</span>
                                <div className={styles.inputWrapper}>
                                    <input
                                        className={styles.input}
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={12}
                                        placeholder="Enter a secure password"
                                        autoComplete="new-password"
                                    />
                                </div>
                                <span className={styles.fieldHint}>Use at least 12 characters.</span>
                            </label>

                            <label className={styles.field}>
                                <span>Confirm Password</span>
                                <div className={styles.inputWrapper}>
                                    <input
                                        className={styles.input}
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        minLength={12}
                                        placeholder="Confirm your password"
                                        autoComplete="new-password"
                                    />
                                </div>
                            </label>

                            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4px' }}>
                                <button 
                                    type="submit" 
                                    disabled={submitting || !password || !confirmPassword} 
                                    className={styles.submitBtn}
                                >
                                    {submitting ? 'Setting password…' : 'Set password'}
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
