'use client';

import Link from 'next/link';
import { useState } from 'react';
import { getCsrfToken, register as apiRegister } from '@/lib/api';

export default function RegisterPage() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [submitting, setSubmitting] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault();
		setMessage(null);
		setError(null);
		setSubmitting(true);
		try {
			const csrf = await getCsrfToken();
			const res = await apiRegister({ email: email.trim(), password }, csrf);
			if (!res.ok) {
				const d: any = res.data || {};
				let msg = d.error || d.message || `Registration failed (HTTP ${res.status})`;
				if (Array.isArray(d.details) && d.details.length > 0) {
					msg += `\n- ` + d.details.join('\n- ');
				}
				setError(msg);
				return;
			}
			setMessage('Registration successful. Check email for verification.');
			setEmail('');
			setPassword('');
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<main style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 420, margin: '0 auto' }}>
			<h1>Register</h1>
			<form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
				<label>
					<span>Email</span>
					<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%', padding: 8 }} />
				</label>
				<label>
					<span>Password (min 12 chars)</span>
					<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={12} required style={{ width: '100%', padding: 8 }} />
				</label>
				<button type="submit" disabled={submitting} style={{ padding: 10 }}>
					{submitting ? 'Creating…' : 'Create account'}
				</button>
			</form>
			{message && <p style={{ color: 'seagreen', marginTop: 12 }}>{message}</p>}
			{error && <p style={{ color: 'crimson', marginTop: 12 }}>{error}</p>}
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
				Already have an account? <Link href="/login">Login</Link>
			</p>
		</main>
	);
}


