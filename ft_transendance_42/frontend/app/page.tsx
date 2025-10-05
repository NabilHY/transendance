"use client";
// @ts-nocheck

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { twofaDisable, twofaSetupStart, twofaSetupVerify, twofaStatus } from '@/lib/api';

export default function HomePage() {
	const { isLoggedIn, user, fetchMe, logout, error, clearError, ensureCsrf, requires2FA, checkOAuth2FA } = useAuth();
	const router = useRouter();
	const [qr, setQr] = useState<string | null>(null);
	const [setupToken, setSetupToken] = useState('');
	const [disablePassword, setDisablePassword] = useState('');
	const [msg, setMsg] = useState<string | null>(null);
	const [err, setErr] = useState<string | null>(null);
	const [twofaEnabled, setTwofaEnabled] = useState<boolean | null>(null);

	useEffect(() => {
		console.log('🔄 [OAuth Debug] Main page useEffect triggered');
		// Check for OAuth 2FA flow first
		if (checkOAuth2FA()) {
			console.log('🔄 [OAuth Debug] Redirecting to /twofa for OAuth 2FA');
			router.push('/twofa?oauth=true');
			return;
		}

		// Attempt to load user on mount (in case refresh just happened)
		fetchMe();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Redirect to 2FA page if required
	useEffect(() => {
		if (requires2FA) {
			router.push('/twofa');
		}
	}, [requires2FA, router]);

	// Fetch 2FA status whenever login state changes
	useEffect(() => {
		(async () => {
			if (!isLoggedIn) { setTwofaEnabled(null); return; }
			try {
				const csrf = await ensureCsrf();
				const res = await twofaStatus(csrf);
				if (res.ok) {
					setTwofaEnabled((res.data as any)?.enabled ?? false);
				}
			} catch { /* ignore */ }
		})();
	}, [isLoggedIn, ensureCsrf]);

	return (
		<main style={{ padding: 24, fontFamily: 'sans-serif', maxWidth: 720, margin: '0 auto' }}>
			<header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
				<h1>Dashboard</h1>
				<nav style={{ display: 'flex', gap: 12 }}>
					{!isLoggedIn && <Link href="/login">Login</Link>}
					<Link href="/register">Register</Link>
					{isLoggedIn && (
						<button onClick={() => { clearError(); logout(); }} style={{ padding: 8 }}>
							Logout
						</button>
					)}
				</nav>
			</header>

			<section style={{ marginTop: 24 }}>
				{isLoggedIn ? (
					<div>
						<p>Welcome!</p>
						<pre style={{ background: '#f6f6f6', padding: 12 }}>
							{JSON.stringify({ user }, null, 2)}
						</pre>

						<div style={{ marginTop: 24, padding: 12, border: '1px solid #ddd' }}>
							<h3>Two-Factor Authentication</h3>
							<div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
								{twofaEnabled === false && (
									<button
										onClick={async () => {
											setErr(null); setMsg(null); setQr(null);
											const csrf = await ensureCsrf();
											const res = await twofaSetupStart(csrf);
											if (!res.ok) { setErr((res.data as any)?.error || 'Failed to start 2FA setup'); return; }
											setQr((res.data as any)?.qrCode || null);
										}}
									>
										Start 2FA Setup
									</button>
								)}

								{qr && twofaEnabled === false && (
									<div style={{ display: 'grid', gap: 8 }}>
										<img src={qr} alt="2FA QR" style={{ width: 220, height: 220 }} />
										<label>
											Enter 6-digit code
											<input value={setupToken} onChange={(e) => setSetupToken((e as any).target.value)} maxLength={6} inputMode="numeric" style={{ padding: 8 }} />
										</label>
										<button onClick={async () => {
											setErr(null); setMsg(null);
											const csrf = await ensureCsrf();
											const res = await twofaSetupVerify({ token: setupToken.trim() }, csrf);
											if (!res.ok) { setErr((res.data as any)?.error || 'Failed to verify 2FA'); return; }
											setMsg('2FA enabled'); setQr(null); setSetupToken('');
											await fetchMe();
											setTwofaEnabled(true);
										}}>Verify & Enable</button>
									</div>
								)}

								{twofaEnabled === true && (
									<div style={{ display: 'grid', gap: 8 }}>
										<label>
											Enter password to disable 2FA
											<input type="password" value={disablePassword} onChange={(e) => setDisablePassword((e as any).target.value)} style={{ padding: 8 }} />
										</label>
										<button onClick={async () => {
											setErr(null); setMsg(null);
											const csrf = await ensureCsrf();
											const res = await twofaDisable({ password: disablePassword }, csrf);
											if (!res.ok) { setErr((res.data as any)?.error || 'Failed to disable 2FA'); return; }
											setMsg('2FA disabled'); setDisablePassword(''); setQr(null);
											await fetchMe();
											setTwofaEnabled(false);
										}}>Disable 2FA</button>
									</div>
								)}
							</div>
						</div>

						{msg && <p style={{ color: 'seagreen', marginTop: 12 }}>{msg}</p>}
						{(error || err) && <p style={{ color: 'crimson', marginTop: 12 }}>{error || err}</p>}
					</div>
				) : (
					<p>You are not logged in.</p>
				)}
			</section>
		</main>
	);
}


