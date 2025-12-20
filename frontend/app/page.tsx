"use client";

import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useUser } from '@/context/UserContext';
import { useRequireAuth } from '@/hooks/useAuthGuard';
import { User, Users, Settings, Circle, ArrowRight } from 'lucide-react';
import styles from './login/LoginPage.module.css';
import { getAvatarUrl, getInitials, type UserWithAvatar } from '@/lib/avatar';

function ProfileAvatar({ profile }: { profile: any }) {
	const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
	const [avatarError, setAvatarError] = useState(false);

	useEffect(() => {
		if (!profile) return;
		let cancelled = false;
		const userData: UserWithAvatar = {
			id: profile.id,
			profile_pic: profile.profile_pic,
			avatar_updated_at: profile.avatar_updated_at,
			username: profile.username,
			first_name: profile.first_name,
			last_name: profile.last_name,
		};
		getAvatarUrl(userData, { isCurrentUser: true }).then(url => {
			if (!cancelled) setAvatarUrl(url);
		}).catch(() => {
			if (!cancelled) setAvatarError(true);
		});
		return () => { cancelled = true; };
	}, [profile?.id, profile?.profile_pic, profile?.avatar_updated_at]);

	return (
		<div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
			{avatarUrl && !avatarError ? (
				<img 
					src={avatarUrl} 
					alt="Profile"
					onError={() => setAvatarError(true)}
					style={{
						width: '100px',
						height: '100px',
						borderRadius: '16px',
						border: '2px solid #1b253f',
						objectFit: 'cover'
					}}
				/>
			) : profile ? (
				<div style={{
					width: '100px',
					height: '100px',
					borderRadius: '16px',
					border: '2px solid #1b253f',
					background: '#1b253f',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					fontSize: '36px',
					fontWeight: 'bold',
					color: '#6b7593'
				}}>
					{getInitials({
						id: profile.id,
						username: profile.username,
						first_name: profile.first_name,
						last_name: profile.last_name,
					})}
				</div>
			) : null}
		</div>
	);
}

export default function HomePage() {
	const { isLoggedIn, user, fetchMe, logout, error, clearError, ensureCsrf, requires2FA, checkOAuth2FA } = useAuth();
	const { profile, loading: profileLoading } = useUser();
	const { loading: authLoading } = useRequireAuth();
	const router = useRouter();

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

	if (authLoading || profileLoading) {
		return (
			<main className={styles.page}>
				<div className={styles.container}>
					<div style={{ color: '#8c96b6', fontSize: '15px' }}>Loading...</div>
				</div>
			</main>
		);
	}

	return (
		<main className={styles.page} style={{ alignItems: 'flex-start', paddingTop: '40px' }}>
			<div className={styles.container} style={{ maxWidth: '1000px', alignItems: 'stretch' }}>
				{/* Header Section */}
				<div style={{ width: '100%', marginBottom: '32px' }}>
					<h1 style={{ fontSize: '32px', fontWeight: 700, color: '#e4ecff', marginBottom: '8px' }}>
						Welcome back{profile?.first_name ? `, ${profile.first_name}` : ''}!
					</h1>
					<p style={{ fontSize: '15px', color: '#8c96b6' }}>
						Here's your dashboard overview
					</p>
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

				{isLoggedIn ? (
					<div style={{ width: '100%', display: 'grid', gap: '24px' }}>
						{/* Profile Card */}
						{profile && (
							<section className={styles.card} style={{ width: '100%' }}>
								<div className={styles.cardHeader} style={{ textAlign: 'left', marginBottom: '24px' }}>
									<h2 className={styles.title} style={{ fontSize: '24px', marginBottom: '8px' }}>
										Your Profile
									</h2>
									<p className={styles.subtitle} style={{ textAlign: 'left' }}>
										View and manage your account information
									</p>
								</div>

								<div style={{ display: 'grid', gap: '20px' }}>
									<ProfileAvatar profile={profile} />

									<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
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
												Status
											</span>
											<div style={{
												padding: '12px 16px',
												background: '#050b16',
												border: '1px solid #1e2b45',
												borderRadius: '12px',
												display: 'flex',
												alignItems: 'center',
												gap: '8px'
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
										</div>

										{profile.first_name && (
											<div className={styles.field}>
												<span style={{ fontSize: '12px', color: '#6b7593', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
													Full Name
												</span>
												<div style={{
													padding: '12px 16px',
													background: '#050b16',
													border: '1px solid #1e2b45',
													borderRadius: '12px',
													color: '#e4ecff',
													fontSize: '15px'
												}}>
													{profile.first_name} {profile.last_name || ''}
												</div>
											</div>
										)}
									</div>

									<div style={{
										marginTop: '8px',
										paddingTop: '24px',
										borderTop: '1px solid #1b253f',
										display: 'flex',
										gap: '12px',
										flexWrap: 'wrap'
									}}>
										<Link 
											href="/profile"
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
											<User size={16} />
											View Full Profile
											<ArrowRight size={14} />
										</Link>
										<Link 
											href="/users"
											className={styles.submitBtn}
											style={{
												textDecoration: 'none',
												display: 'inline-flex',
												alignItems: 'center',
												gap: '8px',
												padding: '12px 20px',
												fontSize: '14px',
												background: 'rgba(255, 255, 255, 0.04)',
												border: '1px solid rgba(255, 255, 255, 0.08)',
												color: '#93a0c5'
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
											Browse Users
										</Link>
									</div>
								</div>
							</section>
						)}

						{/* Quick Actions Grid */}
						<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
							<Link 
								href="/profile"
								style={{
									background: '#0b111f',
									border: '1px solid #1b253f',
									borderRadius: '16px',
									padding: '24px',
									textDecoration: 'none',
									transition: 'all 0.2s ease',
									display: 'flex',
									flexDirection: 'column',
									gap: '12px'
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.borderColor = '#1790ff';
									e.currentTarget.style.transform = 'translateY(-2px)';
									e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.3)';
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.borderColor = '#1b253f';
									e.currentTarget.style.transform = 'translateY(0)';
									e.currentTarget.style.boxShadow = 'none';
								}}
							>
								<div style={{
									width: '48px',
									height: '48px',
									borderRadius: '12px',
									background: '#1790ff20',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									color: '#1790ff'
								}}>
									<User size={24} />
								</div>
								<div>
									<h3 style={{
										margin: 0,
										fontSize: '18px',
										fontWeight: 600,
										color: '#e4ecff',
										marginBottom: '4px'
									}}>
										My Profile
									</h3>
									<p style={{
										margin: 0,
										fontSize: '13px',
										color: '#8c96b6'
									}}>
										View and edit your profile information
									</p>
								</div>
							</Link>

							<Link 
								href="/users"
								style={{
									background: '#0b111f',
									border: '1px solid #1b253f',
									borderRadius: '16px',
									padding: '24px',
									textDecoration: 'none',
									transition: 'all 0.2s ease',
									display: 'flex',
									flexDirection: 'column',
									gap: '12px'
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.borderColor = '#10b981';
									e.currentTarget.style.transform = 'translateY(-2px)';
									e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.3)';
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.borderColor = '#1b253f';
									e.currentTarget.style.transform = 'translateY(0)';
									e.currentTarget.style.boxShadow = 'none';
								}}
							>
								<div style={{
									width: '48px',
									height: '48px',
									borderRadius: '12px',
									background: '#10b98120',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									color: '#10b981'
								}}>
									<Users size={24} />
								</div>
								<div>
									<h3 style={{
										margin: 0,
										fontSize: '18px',
										fontWeight: 600,
										color: '#e4ecff',
										marginBottom: '4px'
									}}>
										Browse Users
									</h3>
									<p style={{
										margin: 0,
										fontSize: '13px',
										color: '#8c96b6'
									}}>
										Discover and connect with other users
									</p>
								</div>
							</Link>

							<Link 
								href="/settings"
								style={{
									background: '#0b111f',
									border: '1px solid #1b253f',
									borderRadius: '16px',
									padding: '24px',
									textDecoration: 'none',
									transition: 'all 0.2s ease',
									display: 'flex',
									flexDirection: 'column',
									gap: '12px'
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.borderColor = '#f59e0b';
									e.currentTarget.style.transform = 'translateY(-2px)';
									e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.3)';
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.borderColor = '#1b253f';
									e.currentTarget.style.transform = 'translateY(0)';
									e.currentTarget.style.boxShadow = 'none';
								}}
							>
								<div style={{
									width: '48px',
									height: '48px',
									borderRadius: '12px',
									background: '#f59e0b20',
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									color: '#f59e0b'
								}}>
									<Settings size={24} />
								</div>
								<div>
									<h3 style={{
										margin: 0,
										fontSize: '18px',
										fontWeight: 600,
										color: '#e4ecff',
										marginBottom: '4px'
									}}>
										Settings
									</h3>
									<p style={{
										margin: 0,
										fontSize: '13px',
										color: '#8c96b6'
									}}>
										Manage your account settings and preferences
									</p>
								</div>
							</Link>
						</div>
					</div>
				) : (
					<section className={styles.card} style={{ width: '100%', textAlign: 'center', padding: '48px 24px' }}>
						<h2 className={styles.title} style={{ fontSize: '24px', marginBottom: '12px' }}>
							Welcome to Dashboard
						</h2>
						<p className={styles.subtitle} style={{ marginBottom: '24px' }}>
							Please log in to access your dashboard
						</p>
						<Link 
							href="/login"
							className={styles.submitBtn}
							style={{
								textDecoration: 'none',
								display: 'inline-block'
							}}
						>
							Go to Login
						</Link>
					</section>
				)}
			</div>
		</main>
	);
}
