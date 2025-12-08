'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Shield, ArrowLeft } from 'lucide-react';
import styles from '../login/LoginPage.module.css';

export default function TwoFAPage() {
	const { login2fa, isLoggedIn, requires2FA, error, clearError, checkOAuth2FA, cancelTwoFA } = useAuth();
	const router = useRouter();
	const searchParams = useSearchParams();
	const [token, setToken] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [isOAuth, setIsOAuth] = useState(false);

	// Check if this is an OAuth 2FA flow
	useEffect(() => {
		const oauthParam = searchParams.get('oauth');
		const isOAuthParam = oauthParam === 'true';
		const hasPre2faToken = checkOAuth2FA();
		
		setIsOAuth(isOAuthParam || hasPre2faToken);
	}, [searchParams, checkOAuth2FA]);

	// Redirect if already logged in (no 2FA needed)
	useEffect(() => {
		if (isLoggedIn && !requires2FA) {
			router.replace('/');
		}
	}, [isLoggedIn, requires2FA, router]);

	// Redirect if no 2FA required and not from OAuth
	useEffect(() => {
		// Only redirect if we're sure there's no OAuth flow and no 2FA requirement
		// Add a small delay to allow AuthContext to initialize
		const timer = setTimeout(() => {
			console.log('🔍 [TwoFA Debug] Redirect check - requires2FA:', requires2FA, 'isOAuth:', isOAuth);
			if (!requires2FA && !isOAuth) {
				console.log('🔍 [TwoFA Debug] Redirecting to login - no 2FA required and not OAuth');
				router.replace('/login');
			}
		}, 100); // Small delay to allow AuthContext to initialize

		return () => clearTimeout(timer);
	}, [requires2FA, isOAuth, router]);

	async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		if (!token.trim()) return;
		
		clearError();
		setSubmitting(true);
		try {
			await login2fa(token.trim());
			// login2fa will handle setting isLoggedIn and clearing requires2FA
			// The useEffect above will redirect to home page
		} finally {
			setSubmitting(false);
		}
	}

	// Don't render anything if we should redirect
	if (isLoggedIn && !requires2FA) {
		return null;
	}

	if (!requires2FA && !isOAuth) {
		return null;
	}

	return (
		<main className={styles.page}>
			<div className={styles.container}>
				<div className={styles.grid}>
					<section className={`${styles.card} ${styles.loginCard}`}>
						<div className={styles.cardHeader}>
							<div style={{
								width: '64px',
								height: '64px',
								margin: '0 auto 16px',
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(245, 158, 11, 0.1))',
								border: '1px solid rgba(245, 158, 11, 0.3)',
								borderRadius: '16px'
							}}>
								<Shield size={32} color="#f59e0b" />
							</div>
							<h1 className={styles.title}>Two-Factor Authentication</h1>
							<p className={styles.subtitle}>
								{isOAuth 
									? 'Complete your OAuth login by entering your 6-digit authenticator code.'
									: 'Enter your 6-digit authenticator code to complete login.'
								}
							</p>
						</div>

						<form className={styles.form} onSubmit={onSubmit}>
							<label className={styles.field}>
								<span>Authentication Code</span>
								<div className={styles.inputWrapper}>
									<input
										className={styles.input}
										type="text"
										value={token}
										onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
										placeholder="000000"
										maxLength={6}
										inputMode="numeric"
										required
										style={{
											textAlign: 'center',
											fontSize: '24px',
											letterSpacing: '0.3em',
											fontWeight: '600',
											fontFamily: 'monospace'
										}}
									/>
								</div>
								<span className={styles.fieldHint}>
									Enter the 6-digit code from your authenticator app
								</span>
							</label>

							<div className={styles.formActions} style={{ justifyContent: 'flex-end' }}>
								<button
									type="submit"
									disabled={submitting || token.length !== 6}
									className={styles.submitBtn}
								>
									{submitting ? 'Verifying...' : 'Verify & Continue'}
								</button>
							</div>

							{error && (
								<div className={styles.error}>
									{error}
								</div>
							)}

							<div style={{
								marginTop: '16px',
								paddingTop: '20px',
								borderTop: '1px solid #1b253f',
								textAlign: 'center'
							}}>
								<button
									type="button"
									onClick={() => {
										try {
											cancelTwoFA();
										} catch (_e) {
											// Ignore errors
										}
										router.replace('/login');
									}}
									className={styles.forgotBtn}
									style={{
										display: 'inline-flex',
										alignItems: 'center',
										gap: '6px',
										textDecoration: 'none'
									}}
								>
									<ArrowLeft size={14} />
									Back to Login
								</button>
							</div>
						</form>
					</section>
				</div>
			</div>
		</main>
	);
}
