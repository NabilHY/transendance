"use client";

import { useState, useEffect } from "react";
import { Key, Mail, Lock, Shield, Eye, EyeOff, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
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

import "../styles.css";

export default function PasswordSettingsPage() {
  const router = useRouter();
  const { loading: authLoading, isAuthenticated } = useRequireAuth();
  const { ensureCsrf, fetchMe, isLoggedIn, logout } = useAuth();
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [setupToken, setSetupToken] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [showDisablePassword, setShowDisablePassword] = useState(false);
  const [twofaMsg, setTwofaMsg] = useState<string | null>(null);
  const [twofaErr, setTwofaErr] = useState<string | null>(null);
  const [twofaEnabled, setTwofaEnabled] = useState<boolean | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
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
        
        // Logout and redirect to login page
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

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeletePassword("");
  };

  useEffect(() => {
    // Get CSRF token on mount
    const loadCsrf = async () => {
      const token = await getCsrfToken();
      setCsrfToken(token);
    };
    loadCsrf();

    // Fetch email from /me endpoint
    const fetchEmail = async () => {
      try {
        const csrf = await ensureCsrf();
        if (!csrf) {
          return;
        }
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

  if (authLoading || !isAuthenticated) {
    return null;
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
  
    // Validation
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
        // Display the message from the API response
        const message = (result.data as { message?: string })?.message || "Password changed successfully";
        toast.success(message);
        
        // Clear form fields
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        // Display error from API response
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


  return (
    <div className="container">
      <div className="main-content">
        <div className="security-settings-grid">
          {/* Change Password Section */}
          <div className="setting-card security-card">
            <div className="card-header">
              <Lock size={20} />
              <h3>Change Password</h3>
            </div>
            <form onSubmit={handlePasswordReset} className="security-form">
              <div className="input-group">
                <Key size={16} />
                <input
                  type={showOldPassword ? "text" : "password"}
                  placeholder="Current password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowOldPassword(!showOldPassword)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                  aria-label={showOldPassword ? "Hide password" : "Show password"}
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
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
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
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff size={16} color="#666" /> : <Eye size={16} color="#666" />}
                </button>
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isChangingPassword}
              >
                {isChangingPassword ? "Changing..." : "Change Password"}
              </button>
            </form>
          </div>

          {/* Change Email Section */}
          <div className="setting-card security-card">
            <div className="card-header">
              <Mail size={20} />
              <h3>Change Email</h3>
            </div>
            <form onSubmit={handleEmailReset} className="security-form">
              <div className="input-group">
                <Mail size={16} />
                <input
                  type="email"
                  placeholder="New email address"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                 />
              </div>
                {currentEmail && (
                  <div className="current-email-display">
                    Current email: <span>{currentEmail}</span>
                  </div>
                )}
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isChangingEmail}
              >
                {isChangingEmail ? "Sending..." : "Send Verification Email"}
              </button>
            </form>
          </div>

          {/* Two-Factor Authentication Section */}
          <div className="setting-card security-card">
            <div className="card-header">
              <Shield size={20} />
              <h3>Two-Factor Authentication</h3>
            </div>
            <div className="twofa-content">
              {twofaEnabled === false && !qr && (
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
              )}

              {qr && twofaEnabled === false && (
                <div className="twofa-setup">
                  <img src={qr} alt="2FA QR" className="qr-code" />
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
                      setTwofaMsg('2FA enabled'); setQr(null); setSetupToken('');
                      await fetchMe();
                      setTwofaEnabled(true);
                    }}
                  >
                    Verify & Enable
                  </button>
                </div>
              )}

              {twofaEnabled === true && (
                <div className="twofa-disable">
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
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                      aria-label={showDisablePassword ? "Hide password" : "Show password"}
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
                      setTwofaMsg('2FA disabled'); setDisablePassword(''); setQr(null);
                      await fetchMe();
                      setTwofaEnabled(false);
                    }}
                  >
                    Disable 2FA
                  </button>
                </div>
              )}
            </div>
            {twofaMsg && (
              <div className="message-success">
                {twofaMsg}
              </div>
            )}
            {twofaErr && (
              <div className="message-error">
                {twofaErr}
              </div>
            )}
          </div>

          {/* Connected Accounts Placeholder */}
          <div className="setting-card security-card placeholder-card">
            <div className="card-header">
              <div style={{ width: '20px', height: '20px' }}></div>
              <h3>Connected Accounts</h3>
            </div>
            <div className="placeholder-content">
              <p className="placeholder-description">
                Manage your connected third-party accounts.
              </p>
              <div className="placeholder-notice">
                This feature will be available soon.
              </div>
            </div>
          </div>

          {/* Delete Account Section */}
          <div className="setting-card security-card full-width-card">
            <div className="card-header">
              <Trash2 size={20} style={{ color: '#ff4444' }} />
              <h3>Delete Account</h3>
            </div>
            <div className="placeholder-content">
              <p className="placeholder-description">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              <button
                className="btn"
                onClick={() => setShowDeleteModal(true)}
                style={{
                  backgroundColor: '#ff4444',
                  color: 'white',
                  border: 'none',
                  marginTop: '12px'
                }}
              >
                <Trash2 size={16} style={{ marginRight: '8px' }} />
                Delete My Account
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={closeDeleteModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-icon-wrapper">
                <Trash2 size={24} />
              </div>
              <h2 className="modal-title">Delete Account</h2>
              <button
                className="modal-close"
                onClick={closeDeleteModal}
                disabled={isDeleting}
                aria-label="Close modal"
              >
                ×
              </button>
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
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                    aria-label={showDeletePassword ? "Hide password" : "Show password"}
                    disabled={isDeleting}
                  >
                    {showDeletePassword ? <EyeOff size={16} color="#666" /> : <Eye size={16} color="#666" />}
                  </button>
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={closeDeleteModal}
                    disabled={isDeleting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-danger"
                    disabled={isDeleting || !deletePassword}
                  >
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
