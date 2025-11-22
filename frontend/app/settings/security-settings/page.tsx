"use client";

import { useState, useEffect } from "react";
import { Key, Mail, Lock, Shield } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  resetPassword,
  resetEmail,
  confirmEmailReset,
  getCsrfToken,
} from "@/lib/api";
import "../styles.css";

export default function PasswordSettingsPage() {
  const { ensureCsrf } = useAuth();
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  // Password Reset State
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Email Reset State
  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [verificationToken, setVerificationToken] = useState("");
  const [showTokenInput, setShowTokenInput] = useState(false);

  // Current User Email (to display)
  const [currentEmail, setCurrentEmail] = useState<string>("");

  useEffect(() => {
    // Get CSRF token on mount
    const loadCsrf = async () => {
      const token = await getCsrfToken();
      setCsrfToken(token);
    };
    loadCsrf();

    // Fetch current user email (you might want to get this from context or API)
    // For now, placeholder
  }, []);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    // Validation
    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordError("All fields are required");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    if (oldPassword === newPassword) {
      setPasswordError("New password must be different from old password");
      return;
    }

    setIsChangingPassword(true);

    try {
      const csrf = await ensureCsrf();
      const result = await resetPassword({ oldPassword, newPassword }, csrf);

      if (result.ok) {
        setPasswordSuccess("Password changed successfully");
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPasswordError(
          (result.data as any)?.error || "Failed to change password"
        );
      }
    } catch (error) {
      setPasswordError("An error occurred. Please try again.");
      console.error("Password reset error:", error);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleEmailReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    setEmailSuccess(null);

    if (!newEmail) {
      setEmailError("Email is required");
      return;
    }

    setIsChangingEmail(true);

    try {
      const csrf = await ensureCsrf();
      const result = await resetEmail({ email: newEmail }, csrf);

      if (result.ok) {
        setEmailSuccess("Verification email sent. Please check your inbox.");
        setShowTokenInput(true);
      } else {
        setEmailError(
          (result.data as any)?.error || "Failed to send verification email"
        );
      }
    } catch (error) {
      setEmailError("An error occurred. Please try again.");
      console.error("Email reset error:", error);
    } finally {
      setIsChangingEmail(false);
    }
  };

  const handleEmailConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    setEmailSuccess(null);

    if (!verificationToken) {
      setEmailError("Verification token is required");
      return;
    }

    try {
      const csrf = await ensureCsrf();
      const result = await confirmEmailReset(
        { token: verificationToken },
        csrf
      );

      if (result.ok) {
        setEmailSuccess("Email changed successfully");
        setNewEmail("");
        setVerificationToken("");
        setShowTokenInput(false);
        // Update current email display
        setCurrentEmail(newEmail);
      } else {
        setEmailError(
          (result.data as any)?.error || "Invalid or expired token"
        );
      }
    } catch (error) {
      setEmailError("An error occurred. Please try again.");
      console.error("Email confirmation error:", error);
    }
  };

  return (
    <div className="container">
      <div className="main-content">
        <div className="account-grid">
          {/* Change Password Section */}
          <div className="setting-card">
            <h3>
              <Lock
                size={18}
                style={{ display: "inline", marginRight: "8px" }}
              />
              Change Password
            </h3>
            <form onSubmit={handlePasswordReset}>
              <div className="input-group">
                <Key size={16} />
                <input
                  type="password"
                  placeholder="Current password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  required
                />
              </div>
              <div className="input-group">
                <Key size={16} />
                <input
                  type="password"
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <div className="input-group">
                <Key size={16} />
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              {passwordError && (
                <p
                  style={{
                    color: "#ef4444",
                    marginTop: "8px",
                    fontSize: "14px",
                  }}
                >
                  {passwordError}
                </p>
              )}
              {passwordSuccess && (
                <p
                  style={{
                    color: "#10b981",
                    marginTop: "8px",
                    fontSize: "14px",
                  }}
                >
                  {passwordSuccess}
                </p>
              )}
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isChangingPassword}
                style={{ marginTop: "12px", width: "100%" }}
              >
                {isChangingPassword ? "Changing..." : "Change Password"}
              </button>
            </form>
          </div>

          {/* Change Email Section */}
          <div className="setting-card">
            <h3>
              <Mail
                size={18}
                style={{ display: "inline", marginRight: "8px" }}
              />
              Change Email
            </h3>
            {currentEmail && (
              <p
                style={{
                  fontSize: "14px",
                  color: "#9ca8c7",
                  marginBottom: "16px",
                }}
              >
                Current email: {currentEmail}
              </p>
            )}
            <form onSubmit={handleEmailReset}>
              <div className="input-group">
                <Mail size={16} />
                <input
                  type="email"
                  placeholder="New email address"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                  disabled={showTokenInput}
                />
              </div>
              {emailError && (
                <p
                  style={{
                    color: "#ef4444",
                    marginTop: "8px",
                    fontSize: "14px",
                  }}
                >
                  {emailError}
                </p>
              )}
              {emailSuccess && (
                <p
                  style={{
                    color: "#10b981",
                    marginTop: "8px",
                    fontSize: "14px",
                  }}
                >
                  {emailSuccess}
                </p>
              )}
              {!showTokenInput ? (
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isChangingEmail}
                  style={{ marginTop: "12px", width: "100%" }}
                >
                  {isChangingEmail ? "Sending..." : "Send Verification Email"}
                </button>
              ) : (
                <form
                  onSubmit={handleEmailConfirm}
                  style={{ marginTop: "12px" }}
                >
                  <div className="input-group">
                    <Shield size={16} />
                    <input
                      type="text"
                      placeholder="Enter verification token"
                      value={verificationToken}
                      onChange={(e) => setVerificationToken(e.target.value)}
                      required
                    />
                  </div>
                  <div className="button-group" style={{ marginTop: "8px" }}>
                    <button type="submit" className="btn btn-primary">
                      Confirm Email Change
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        setShowTokenInput(false);
                        setVerificationToken("");
                        setEmailSuccess(null);
                        setEmailError(null);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
