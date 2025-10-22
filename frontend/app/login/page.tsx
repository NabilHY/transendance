'use client';

import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useRequireAuth, useRequireGuest } from '@/hooks/useAuthGuard';

export default function LoginPage() {
	const { login, requires2FA, isLoggedIn, error, clearError, checkProfileAndRedirect } = useAuth();
	const { loading } = useRequireGuest();
	
	if (loading) {
		return <div>Loading...</div>;
	}
	
	const router = useRouter();
	const searchParams = useSearchParams();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [oauthError, setOauthError] = useState<string | null>(null);
	const [forgotPassword, setForgotPassword] = useState(false);

	useEffect(() => {
		if (requires2FA) router.replace('/twofa');
	}, [requires2FA, router]);
	
	useEffect(() => { 
		if (forgotPassword) router.push('/forgot-password');
	}, [forgotPassword, router]);
	
	// Handle OAuth error parameters
	useEffect(() => {
		const errorParam = searchParams.get('error');
		const verifiedParam = searchParams.get('verified');
		if (errorParam) {
			let errorMessage = 'OAuth login failed';
			switch (errorParam) {
				case 'oauth_cancelled':
					errorMessage = 'OAuth login was cancelled';
					break;
				case 'oauth_failed':
					errorMessage = 'OAuth login failed. Please try again.';
					break;
				case '2fa_setup_required':
					errorMessage = 'Please complete 2FA setup before logging in.';
					break;
				default:
					errorMessage = `OAuth error: ${errorParam}`;
			}
			setOauthError(errorMessage);
		}
		if (verifiedParam === '1') {
			setOauthError('Email verified. You can now log in.');
		}
	}, [searchParams]);

	async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		clearError();
		setSubmitting(true);
		try {
			await login(email.trim(), password);
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<main style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 420, margin: '0 auto' }}>
			<h1>Login</h1>
			<form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
				<label>
					<span>Le Email</span>
				<input type="email" value={email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} required style={{ width: '100%', padding: 8 }} />
				</label>
				<label>
					<span>Le Password</span>
				<input type="password" value={password} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)} required style={{ width: '100%', padding: 8 }} />
				</label>
				<button type="submit" disabled={submitting} style={{ padding: 10 }}>
					{submitting ? 'Signing in…' : 'Sign in'}
				</button>
				<div style={{ display: 'flex', justifyContent: 'flex-end' }}>
					<button
						type="button"
					onClick={ async () => { setForgotPassword(true); } }
						style={{ background: 'none', border: 'none', color: '#666', textDecoration: 'underline', cursor: 'pointer', padding: 0, marginTop: 4 }}
					>
					Forgot password
					</button>
				</div>
			</form>
			{(error || oauthError) && (
				<p style={{ 
					color: 'crimson', 
					marginTop: 12,
					padding: 8,
					backgroundColor: '#ffe6e6',
					border: '1px solid #ffcccc',
					borderRadius: 4
				}}>
					{error || oauthError}
				</p>
			)}
			<div style={{ marginTop: 16, textAlign: 'center' }}>
				<div style={{ marginBottom: 16, fontSize: 14, color: '#666' }}>or</div>
				<a 
					href={`${process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8005'}/api/auth/google`} 
					style={{ 
						display: 'inline-block',
						padding: '10px 20px',
						backgroundColor: '#4285f4',
						color: 'white',
						textDecoration: 'none',
						borderRadius: '4px',
						fontWeight: '500',
						border: 'none',
						cursor: 'pointer',
						width: '100%',
						textAlign: 'center'
					}}
				>
					Continue with Google
				</a>
			</div>
			<p style={{ marginTop: 16 }}>
				Don&apos;t have an account? <Link href="/register">Register</Link>
			</p>
		</main>
	);
}


