'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { User, UserCircle } from 'lucide-react';
import '../styles.css';
import { fetchCurrentUser } from '@/lib/fetcher';
import { useRequireAuth } from '@/hooks/useAuthGuard';
import { getApiUrls } from '@/lib/api-config';

interface ProfileUser {
  id: number;
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  profile_pic: string;
  is_online: number; 
  created_at: string;
  updated_at: string;
}

const SettingsPage = () => {
  const { loading: authLoading, isAuthenticated } = useRequireAuth();
  const [currentUser, setCurrentUser] = useState<ProfileUser | null>(null);
  const [newInfoCurrentUser, setNewInfoCurrentUser] = useState<ProfileUser | null>(null);
  const [activeModal, setActiveModal] = useState<null | 'username' | 'first_name' | 'last_name'>(null);
  const usrManagBase = useMemo(() => process.env.NEXT_PUBLIC_USR_MANAG_URL ?? getApiUrls().usrManag, []);

  const updateUserInfo = async (field: string) => {
    if (!newInfoCurrentUser || !currentUser) return;

    const newValue = (newInfoCurrentUser as any)[field];
    const oldValue = (currentUser as any)[field];

    if (newValue === oldValue) {
      console.log("No changes detected for field:", field);
      return;
    }

    const updatedUser = { ...currentUser, [field]: newValue };
    setCurrentUser(updatedUser);

    try {
      const update = await fetch(
        `${usrManagBase}/me/profile`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile: updatedUser }),
          credentials: "include",
        }
      );
      if (!update.ok)
        throw new Error("Server error");
      console.log("Updated successfully!");
    } catch (err) {
      console.error("error ya dink", err);
    }
  };

  const loadCurrentUser = async () => {
    const currentUser = await fetchCurrentUser();
    setCurrentUser(currentUser);
    setNewInfoCurrentUser(currentUser);
    console.log("Current User in Settings:", currentUser);
  };

  useEffect(() => {
    loadCurrentUser();
  }, []);

  if (authLoading || !isAuthenticated) {
    return null;
  }

  const closeModal = () => setActiveModal(null);

  const renderEditModal = () => {
    if (!activeModal) return null;

    const fieldLabel =
      activeModal === 'username'
        ? 'Display Name'
        : activeModal === 'first_name'
          ? 'First Name'
          : 'Last Name';

    const inputType = 'text';
    const value = (newInfoCurrentUser as any)?.[activeModal] ?? '';

    const onChange = (v: string) =>
      setNewInfoCurrentUser((prev) => (prev ? ({ ...prev, [activeModal]: v } as any) : prev));

    const onSave = async () => {
      await updateUserInfo(activeModal);
      closeModal();
    };

    return (
      <div className="modal-overlay" onClick={closeModal}>
        <div className="modal-content modal-content-medium" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-icon-wrapper modal-icon-green">
              <UserCircle size={24} />
            </div>
            <h2 className="modal-title">{fieldLabel}</h2>
            <button className="modal-close" onClick={closeModal}>×</button>
          </div>
          <div className="modal-body">
            <form
              className="modal-form"
              onSubmit={(e) => {
                e.preventDefault();
                void onSave();
              }}
            >
              <div className="input-group">
                <User size={16} />
                <input
                  type={inputType}
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder={fieldLabel}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container">
      <div className="main-content">
        <div className="security-settings-wrapper">
          <div className="security-settings-header">
            <h1 className="security-settings-title">Profile Settings</h1>
            <p className="security-settings-subtitle">
              Manage your personal information
            </p>
          </div>

          <div className="security-options-grid">
            <button
              type="button"
              className="security-option-card"
              data-color="#10b981"
              onClick={() => setActiveModal('username')}
            >
              <div
                className="security-option-icon-wrapper"
                style={{ '--icon-bg': '#10b98120', '--icon-color': '#10b981' } as React.CSSProperties}
              >
                <UserCircle size={24} />
              </div>
              <div>
                <h3 className="security-option-title">Display Name</h3>
                <p className="security-option-description">
                  {currentUser?.username ? `Current: ${currentUser.username}` : 'Update your display name'}
                </p>
              </div>
            </button>

            <button
              type="button"
              className="security-option-card"
              data-color="#8b5cf6"
              onClick={() => setActiveModal('first_name')}
            >
              <div
                className="security-option-icon-wrapper"
                style={{ '--icon-bg': '#8b5cf620', '--icon-color': '#8b5cf6' } as React.CSSProperties}
              >
                <User size={24} />
              </div>
              <div>
                <h3 className="security-option-title">First Name</h3>
                <p className="security-option-description">
                  {currentUser?.first_name ? `Current: ${currentUser.first_name}` : 'Update your first name'}
                </p>
              </div>
            </button>

            <button
              type="button"
              className="security-option-card"
              data-color="#f59e0b"
              onClick={() => setActiveModal('last_name')}
            >
              <div
                className="security-option-icon-wrapper"
                style={{ '--icon-bg': '#f59e0b20', '--icon-color': '#f59e0b' } as React.CSSProperties}
              >
                <User size={24} />
              </div>
              <div>
                <h3 className="security-option-title">Last Name</h3>
                <p className="security-option-description">
                  {currentUser?.last_name ? `Current: ${currentUser.last_name}` : 'Update your last name'}
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
      {renderEditModal()}
    </div>
  );
}

export default SettingsPage;

