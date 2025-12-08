"use client";

import { useState, useEffect } from "react";
import { Key, Mail, Lock, Shield, Eye, EyeOff, Trash2, Link2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useRequireAuth } from "@/hooks/useAuthGuard";
import {
  resetPassword,
  resetEmail,
  getCsrfToken,
  twofaDisable,
  twofaSetupStart,
  twofaSetupVerify,
  twofaStatus,
  me,
  deleteAccount,
} from "@/lib/api";
import { toast } from 'react-toastify';
import ConnectedAccounts from "@/components/ConnectedAccounts";

import "../styles.css";

type ModalType = 'password' | 'email' | '2fa' | 'connected' | 'delete' | null;

interface SecurityOption {
  id: ModalType;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

export default function PasswordSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loading: authLoading, isAuthenticated } = useRequireAuth();
  const { ensureCsrf, fetchMe, isLoggedIn, logout } = useAuth();
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  
  // Password state
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Email state
  const [newEmail, setNewEmail] = useState("");
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  
  // 2FA state
  const [qr, setQr] = useState<string | null>(null);
  const [setupToken, setSetupToken] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [showDisablePassword, setShowDisablePassword] = useState(false);
  const [twofaMsg, setTwofaMsg] = useState<string | null>(null);
  const [twofaErr, setTwofaErr] = useState<string | null>(null);
  const [twofaEnabled, setTwofaEnabled] = useState<boolean | null>(null);
  
  // Delete account state
  const [deletePassword, setDeletePassword] = useState("");
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const securityOptions: SecurityOption[] = [
    {
      id: 'password',
      title: 'Change Password',
      description: 'Update your account password',
      icon: <Lock size={24} />,
      color: '#1790ff'
    },
    {
      id: 'email',
      title: 'Change Email',
      description: 'Update your email address',
      icon: <Mail size={24} />,
      color: '#10b981'
    },
    {
      id: '2fa',
      title: 'Two-Factor Authentication',
      description: twofaEnabled ? '2FA is enabled' : 'Enable 2FA for extra security',
      icon: <Shield size={24} />,
      color: '#f59e0b'
    },
    {
      id: 'connected',
      title: 'Connected Accounts',
      description: 'Manage linked third-party accounts',
      icon: <Link2 size={24} />,
      color: '#8b5cf6'
    },
    {
      id: 'delete',
      title: 'Delete Account',
      description: 'Permanently delete your account',
      icon: <Trash2 size={24} />,
      color: '#ef4444'
    },
  ];

  useEffect(() => {
    const loadCsrf = async () => {
      const token = await getCsrfToken();
      setCsrfToken(token);
    };
    loadCsrf();

    const fetchEmail = async () => {
      try {
        const csrf = await ensureCsrf();
        if (!csrf) return;
        const meResult = await me(csrf);
        if (meResult.ok && meResult.data) {
          const responseData = meResult.data as { userId?: number; email?: string };
          const email = responseData?.email;
          if (email && typeof email === 'string') {
            setCurrentEmail(email);
          } else {
            const directEmail = (meResult.data as any)?.email;
            if (directEmail) {
              setCurrentEmail(directEmail);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch email:", error);
      }
    };
    fetchEmail();
  }, [ensureCsrf]);

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

  useEffect(() => {
    const connected = searchParams?.get('connected');
    const error = searchParams?.get('error');

    if (connected === 'google_success') {
      toast.success('Google account connected successfully!');
      window.dispatchEvent(new Event('connected-accounts-refresh'));
      router.replace('/settings/security-settings');
    } else if (error) {
      let errorMessage = 'Failed to connect account. Please try again.';
      
      switch (error) {
        case 'google_account_already_linked':
          errorMessage = 'This Google account is already linked to another account.';
          break;
        case 'google_already_linked':
          errorMessage = 'You already have a Google account connected.';
          break;
        case 'session_expired':
          errorMessage = 'Session expired. Please log in again.';
          break;
        case 'access_token_required':
          errorMessage = 'Please log in to connect accounts.';
          break;
        case 'connect_failed':
          errorMessage = 'Failed to connect account. Please try again.';
          break;
        case 'link_failed':
          errorMessage = 'Failed to link account. Please try again.';
          break;
        default:
          errorMessage = `Connection error: ${error}`;
      }

      toast.error(errorMessage);
      router.replace('/settings/security-settings');
    }
  }, [searchParams, router]);

  if (authLoading || !isAuthenticated) {
    return null;
  }

  const closeModal = () => {
    setActiveModal(null);
    // Reset form states
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setNewEmail("");
    setSetupToken("");
    setDisablePassword("");
    setDeletePassword("");
    setQr(null);
    setTwofaMsg(null);
    setTwofaErr(null);
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
  
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error("All fields are required");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
  
    if (oldPassword === newPassword) {
      toast.error("New password must be different from old password");
      return;
    }
  
    setIsChangingPassword(true);
  
    try {
      const csrf = await ensureCsrf();
      const result = await resetPassword({ oldPassword, newPassword }, csrf);
  
      if (result.ok && result.data) {
        const message = (result.data as { message?: string })?.message || "Password changed successfully";
        toast.success(message);
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        closeModal();
      } else {
        const errorMessage = (result.data as { error?: string })?.error || "Failed to change password";
        toast.error(errorMessage);
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.");
      console.error("Password reset error:", error);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleEmailReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newEmail) {
      toast.error("Email is required");
      return;
    }

    setIsChangingEmail(true);

    try {
      const csrf = await ensureCsrf();
      const result = await resetEmail({ email: newEmail }, csrf);

      if (result.ok && result.data) {
        const responseData = result.data as { message?: string };
        const message = responseData?.message || "Verification email sent to new address";
        toast.success(message);
        setNewEmail("");
        closeModal();
      } else {
        const responseData = result.data as { error?: string };
        const errorMessage = responseData?.error || "Failed to send verification email";
        toast.error(errorMessage);
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.");
      console.error("Email reset error:", error);
    } finally {
      setIsChangingEmail(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!deletePassword) {
      toast.error("Password is required to delete your account");
      return;
    }
    
    setIsDeleting(true);
    
    try {
      const csrf = await ensureCsrf();
      const result = await deleteAccount({ password: deletePassword }, csrf);

      if (result.ok && result.data) {
        const message = (result.data as { message?: string })?.message || "Account deleted successfully";
        toast.success(message);
        
        await logout();
        router.push('/login');
      } else {
        const errorMessage = (result.data as { error?: string })?.error || "Failed to delete account";
        toast.error(errorMessage);
        setDeletePassword("");
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.");
      console.error("Delete account error:", error);
      setDeletePassword("");
    } finally {
      setIsDeleting(false);
    }
  };

  const getModalIconClass = (color: string) => {
    switch (color) {
      case '#1790ff': return 'modal-icon-blue';
      case '#10b981': return 'modal-icon-green';
      case '#f59e0b': return 'modal-icon-yellow';
      case '#8b5cf6': return 'modal-icon-purple';
      case '#ef4444': return 'modal-icon-red';
      default: return '';
    }
  };

  return (
    <div className="container">
      <div className="main-content">
        <div className="security-settings-wrapper">
          <div className="security-settings-header">
            <h1 className="security-settings-title">
              Security Settings
            </h1>
            <p className="security-settings-subtitle">
              Manage your account security and authentication settings
            </p>
          </div>

          <div className="security-options-grid">
            {securityOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => setActiveModal(option.id)}
                className="security-option-card"
                data-color={option.color}
              >
                <div 
                  className="security-option-icon-wrapper"
                  style={{
                    '--icon-bg': `${option.color}20`,
                    '--icon-color': option.color
                  } as React.CSSProperties}
                >
                  {option.icon}
                </div>
                <div>
                  <h3 className="security-option-title">
                    {option.title}
                  </h3>
                  <p className="security-option-description">
                    {option.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {activeModal === 'password' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content modal-content-medium" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className={`modal-icon-wrapper ${getModalIconClass('#1790ff')}`}>
                <Lock size={24} />
              </div>
              <h2 className="modal-title">Change Password</h2>
              <button className="modal-close" onClick={closeModal} disabled={isChangingPassword}>×</button>
            </div>

            <div className="modal-body">
              <form onSubmit={handlePasswordReset} className="modal-form">
                <div className="input-group">
                  <Key size={16} />
                  <input
                    type={showOldPassword ? "text" : "password"}
                    placeholder="Current password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    required
                    disabled={isChangingPassword}
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    className="password-toggle-btn"
                  >
                    {showOldPassword ? <EyeOff size={16} color="#666" /> : <Eye size={16} color="#666" />}
                  </button>
                </div>
                <div className="input-group">
                  <Key size={16} />
                  <input
                    type={showNewPassword ? "text" : "password"}
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={12}
                    disabled={isChangingPassword}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="password-toggle-btn"
                  >
                    {showNewPassword ? <EyeOff size={16} color="#666" /> : <Eye size={16} color="#666" />}
                  </button>
                </div>
                <div className="input-group">
                  <Key size={16} />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={12}
                    disabled={isChangingPassword}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="password-toggle-btn"
                  >
                    {showConfirmPassword ? <EyeOff size={16} color="#666" /> : <Eye size={16} color="#666" />}
                  </button>
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={isChangingPassword}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={isChangingPassword}>
                    {isChangingPassword ? "Changing..." : "Change Password"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Change Email Modal */}
      {activeModal === 'email' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content modal-content-medium" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className={`modal-icon-wrapper ${getModalIconClass('#10b981')}`}>
                <Mail size={24} />
              </div>
              <h2 className="modal-title">Change Email</h2>
              <button className="modal-close" onClick={closeModal} disabled={isChangingEmail}>×</button>
            </div>

            <div className="modal-body">
              {currentEmail && (
                <div className="current-email-box">
                  Current email: <span className="current-email-value">{currentEmail}</span>
                </div>
              )}
              <form onSubmit={handleEmailReset} className="modal-form">
                <div className="input-group">
                  <Mail size={16} />
                  <input
                    type="email"
                    placeholder="New email address"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    required
                    disabled={isChangingEmail}
                  />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={isChangingEmail}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={isChangingEmail}>
                    {isChangingEmail ? "Sending..." : "Send Verification Email"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* 2FA Modal */}
      {activeModal === '2fa' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content modal-content-medium" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className={`modal-icon-wrapper ${getModalIconClass('#f59e0b')}`}>
                <Shield size={24} />
              </div>
              <h2 className="modal-title">Two-Factor Authentication</h2>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>

            <div className="modal-body">
              {twofaEnabled === false && !qr && (
                <div className="twofa-intro">
                  <p className="twofa-intro-text">
                    2FA is currently disabled. Click the button below to start the setup process.
                  </p>
                  <button
                    className="btn btn-primary"
                    onClick={async () => {
                      setTwofaErr(null); setTwofaMsg(null); setQr(null);
                      const csrf = await ensureCsrf();
                      const res = await twofaSetupStart(csrf);
                      if (!res.ok) { setTwofaErr((res.data as any)?.error || 'Failed to start 2FA setup'); return; }
                      setQr((res.data as any)?.qrCode || null);
                    }}
                  >
                    Start 2FA Setup
                  </button>
                </div>
              )}

              {qr && twofaEnabled === false && (
                <div className="modal-form">
                  <div className="twofa-qr-wrapper">
                    <p className="twofa-qr-instruction">
                      Scan this QR code with your authenticator app, then enter the 6-digit code to verify.
                    </p>
                    <img src={qr} alt="2FA QR" className="twofa-qr-image" />
                  </div>
                  <div className="input-group">
                    <Key size={16} />
                    <input
                      value={setupToken}
                      onChange={(e) => setSetupToken(e.target.value)}
                      maxLength={6}
                      inputMode="numeric"
                      placeholder="Enter 6-digit code"
                    />
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={async () => {
                      setTwofaErr(null); setTwofaMsg(null);
                      const csrf = await ensureCsrf();
                      const res = await twofaSetupVerify({ token: setupToken.trim() }, csrf);
                      if (!res.ok) { setTwofaErr((res.data as any)?.error || 'Failed to verify 2FA'); return; }
                      setTwofaMsg('2FA enabled successfully!'); setQr(null); setSetupToken('');
                      await fetchMe();
                      setTwofaEnabled(true);
                      setTimeout(closeModal, 2000);
                    }}
                  >
                    Verify & Enable
                  </button>
                </div>
              )}

              {twofaEnabled === true && (
                <div className="modal-form">
                  <div className="twofa-enabled-badge">
                    <p className="twofa-enabled-text">
                      <Shield size={16} />
                      Two-Factor Authentication is currently enabled
                    </p>
                  </div>
                  <div className="input-group">
                    <Lock size={16} />
                    <input
                      type={showDisablePassword ? "text" : "password"}
                      value={disablePassword}
                      onChange={(e) => setDisablePassword(e.target.value)}
                      placeholder="Enter password to disable 2FA"
                    />
                    <button
                      type="button"
                      onClick={() => setShowDisablePassword(!showDisablePassword)}
                      className="password-toggle-btn"
                    >
                      {showDisablePassword ? <EyeOff size={16} color="#666" /> : <Eye size={16} color="#666" />}
                    </button>
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={async () => {
                      setTwofaErr(null); setTwofaMsg(null);
                      const csrf = await ensureCsrf();
                      const res = await twofaDisable({ password: disablePassword }, csrf);
                      if (!res.ok) { setTwofaErr((res.data as any)?.error || 'Failed to disable 2FA'); return; }
                      setTwofaMsg('2FA disabled successfully'); setDisablePassword(''); setQr(null);
                      await fetchMe();
                      setTwofaEnabled(false);
                      setTimeout(closeModal, 2000);
                    }}
                  >
                    Disable 2FA
                  </button>
                </div>
              )}

              {twofaMsg && (
                <div className="message-box message-success-box">
                  {twofaMsg}
                </div>
              )}
              {twofaErr && (
                <div className="message-box message-error-box">
                  {twofaErr}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Connected Accounts Modal */}
      {activeModal === 'connected' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content modal-content-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className={`modal-icon-wrapper ${getModalIconClass('#8b5cf6')}`}>
                <Link2 size={24} />
              </div>
              <h2 className="modal-title">Connected Accounts</h2>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>

            <div className="modal-body">
              <ConnectedAccounts showHeader={false} />
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {activeModal === 'delete' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className={`modal-icon-wrapper ${getModalIconClass('#ef4444')}`}>
                <Trash2 size={24} />
              </div>
              <h2 className="modal-title">Delete Account</h2>
              <button className="modal-close" onClick={closeModal} disabled={isDeleting}>×</button>
            </div>

            <div className="modal-body">
              <div className="warning-box">
                <div className="warning-icon">⚠️</div>
                <div className="warning-content">
                  <h3 className="warning-title">Warning: This action is irreversible</h3>
                  <p className="warning-text">
                    Deleting your account will permanently remove:
                  </p>
                  <ul className="warning-list">
                    <li>All your personal information and profile data</li>
                    <li>All your messages and conversations</li>
                    <li>All your friends and connections</li>
                    <li>All your settings and preferences</li>
                    <li>Access to all your account features</li>
                  </ul>
                  <p className="warning-text-bold">
                    This action cannot be undone. Are you absolutely sure you want to proceed?
                  </p>
                </div>
              </div>

              <form onSubmit={handleDeleteAccount} className="modal-form">
                <div className="input-group">
                  <Lock size={16} />
                  <input
                    type={showDeletePassword ? "text" : "password"}
                    placeholder="Enter your password to confirm"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    required
                    autoFocus
                    disabled={isDeleting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowDeletePassword(!showDeletePassword)}
                    className="password-toggle-btn"
                    disabled={isDeleting}
                  >
                    {showDeletePassword ? <EyeOff size={16} color="#666" /> : <Eye size={16} color="#666" />}
                  </button>
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={closeModal} disabled={isDeleting}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-danger" disabled={isDeleting || !deletePassword}>
                    {isDeleting ? "Deleting..." : "Delete My Account"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
