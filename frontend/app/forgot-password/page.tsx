'use client';
// @ts-nocheck

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRequireGuest } from '@/hooks/useAuthGuard';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8005';

export default function ForgotPasswordPage() {
	const [email, setEmail] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const router = useRouter();
	
	const { loading } = useRequireGuest();
	
	if (loading) {
		return <div>Loading...</div>;
	}

	function isValidEmail(value: string): boolean {
		const trimmed = value.trim();
		if (!trimmed) return false;
		// Simple email validation
		return /.+@.+\..+/.test(trimmed);
	}

	async function onSubmit(e: any) {
		e.preventDefault();
		setError(null);
		setMessage(null);
		if (!isValidEmail(email)) {
			setError('Please enter a valid email address');
			return;
		}
		setSubmitting(true);
		try {
			// Call backend to issue a reset token email (backend may return 4xx/5xx; we still show generic success)
			await fetch(`${API_BASE}/api/auth/forgot-password`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ email: email.trim() })
			});
			setMessage('If an account exists for this email, we\'ve sent a reset link.');
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<main style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 420, margin: '0 auto' }}>
			<h1>Forgot your password?</h1>
			<p style={{ marginBottom: 24, color: '#666' }}>
				Enter your email and we\'ll send you a link to reset your password.
			</p>

			<form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
				<label>
					<span>Email</span>
					<input
						type="email"
						value={email}
						onChange={(e) => setEmail((e as any).target.value)}
						placeholder="you@example.com"
						required
						style={{ width: '100%', padding: 12, fontSize: 16 }}
					/>
				</label>
				<button
					type="submit"
					disabled={submitting || !isValidEmail(email)}
					style={{
						padding: 12,
						backgroundColor: !isValidEmail(email) ? '#ccc' : '#007bff',
						color: 'white',
						border: 'none',
						borderRadius: 4,
						cursor: submitting || !isValidEmail(email) ? 'not-allowed' : 'pointer'
					}}
				>
					{submitting ? 'Sending…' : 'Send reset link'}
				</button>
			</form>

			{message && (
				<p style={{ color: 'green', marginTop: 12, padding: 8, backgroundColor: '#e6ffed', border: '1px solid #ccffd8', borderRadius: 4 }}>
					{message}
				</p>
			)}

			{error && (
				<p style={{ color: 'crimson', marginTop: 12, padding: 8, backgroundColor: '#ffe6e6', border: '1px solid #ffcccc', borderRadius: 4 }}>
					{error}
				</p>
			)}

			<div style={{ marginTop: 24, textAlign: 'center' }}>
				<button
					onClick={() => router.replace('/login')}
					style={{ background: 'none', border: 'none', color: '#666', textDecoration: 'underline', cursor: 'pointer' }}
				>
					← Back to Login
				</button>
			</div>
		</main>
	);
}