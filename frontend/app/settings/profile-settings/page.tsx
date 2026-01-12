'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { User, UserCircle, Image as ImageIcon, Upload, X } from 'lucide-react';
import '../styles.css';
import { fetchCurrentUser } from '@/lib/fetcher';
import { useRequireAuth } from '@/hooks/useAuthGuard';
import { getApiUrls } from '@/lib/api-config';
import { getAvatarUrl, getInitials, clearAvatarCache, type UserWithAvatar } from '@/lib/avatar';

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
  const [activeModal, setActiveModal] = useState<null | 'name' | 'avatar'>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(null);
  const [nameUpdateSuccess, setNameUpdateSuccess] = useState(false);
  const [nameUpdateError, setNameUpdateError] = useState<string | null>(null);
  const usrManagBase = useMemo(() => process.env.NEXT_PUBLIC_USR_MANAG_URL ?? getApiUrls().usrManag, []);

  const updateUserInfo = async (field: 'username' | 'first_name' | 'last_name') => {
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

  const updateAllNameFields = async () => {
    if (!newInfoCurrentUser || !currentUser) return;

    // Check if any name fields changed
    const nameChanged = 
      newInfoCurrentUser.username !== currentUser.username ||
      newInfoCurrentUser.first_name !== currentUser.first_name ||
      newInfoCurrentUser.last_name !== currentUser.last_name;

    if (!nameChanged) {
      console.log("No changes detected for name fields");
      setNameUpdateError("No changes detected");
      return;
    }

    setNameUpdateError(null);
    setNameUpdateSuccess(false);

    const updatedUser = { 
      ...currentUser, 
      username: newInfoCurrentUser.username,
      first_name: newInfoCurrentUser.first_name,
      last_name: newInfoCurrentUser.last_name,
    };

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
      
      // Update current user state
      setCurrentUser(updatedUser);
      
      // Show success message
      setNameUpdateSuccess(true);
      
      // Close modal after a short delay to show success message
      setTimeout(() => {
        closeModal();
      }, 2000);
    } catch (err) {
      console.error("error updating name fields", err);
      setNameUpdateError("Failed to update name fields. Please try again.");
    }
  };

  const loadCurrentUser = async () => {
    const currentUser = await fetchCurrentUser();
    setCurrentUser(currentUser);
    setNewInfoCurrentUser(currentUser);
    console.log("Current User in Settings:", currentUser);
    
    // Load current avatar URL (force refresh by clearing cache first if needed)
    if (currentUser) {
      // Clear cache to ensure we get fresh URL
      clearAvatarCache(currentUser.id);
      
      const userData: UserWithAvatar = {
        id: currentUser.id,
        profile_pic: currentUser.profile_pic,
        avatar_updated_at: (currentUser as any).avatar_updated_at,
        username: currentUser.username,
        first_name: currentUser.first_name,
        last_name: currentUser.last_name,
      };
      const url = await getAvatarUrl(userData, { isCurrentUser: true, useCache: false });
      setCurrentAvatarUrl(url);
    }
  };

  useEffect(() => {
    loadCurrentUser();
  }, []);

  if (authLoading || !isAuthenticated) {
    return null;
  }

  const closeModal = () => {
    setActiveModal(null);
    setAvatarPreview(null);
    setAvatarFile(null);
    setUploadError(null);
    setUploadSuccess(false);
    setNameUpdateSuccess(false);
    setNameUpdateError(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size must be less than 5MB');
      return;
    }

    setAvatarFile(file);
    setUploadError(null);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarUpload = async () => {
    console.log('Upload button clicked', { avatarFile: !!avatarFile, currentUser: !!currentUser });
    if (!avatarFile || !currentUser) {
      console.warn('Upload blocked:', { avatarFile: !!avatarFile, currentUser: !!currentUser });
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      const formData = new FormData();
      // Backend uses request.file() which gets the first file, field name doesn't matter
      // But using 'file' to be explicit
      formData.append('file', avatarFile);
      console.log('Sending upload request...', { 
        fileName: avatarFile.name, 
        fileSize: avatarFile.size, 
        fileType: avatarFile.type 
      });

      const response = await fetch('/media/avatar/me', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errorData.error || `Upload failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('Upload response:', data);
      
      // Clear avatar cache to force refresh
      clearAvatarCache(currentUser.id);
      
      // Reload user data to get updated avatar_updated_at
      const updatedUser = await fetchCurrentUser();
      console.log('Updated user after upload:', updatedUser);
      
      if (updatedUser) {
        setCurrentUser(updatedUser);
        setNewInfoCurrentUser(updatedUser);
        
        // Force refresh avatar URL (bypass cache)
        const userData: UserWithAvatar = {
          id: updatedUser.id,
          profile_pic: updatedUser.profile_pic,
          avatar_updated_at: (updatedUser as any).avatar_updated_at,
          username: updatedUser.username,
          first_name: updatedUser.first_name,
          last_name: updatedUser.last_name,
        };
        console.log('Fetching avatar URL for:', userData);
        
        // Wait a bit for database to be fully updated
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const newUrl = await getAvatarUrl(userData, { isCurrentUser: true, useCache: false });
        console.log('New avatar URL:', newUrl);
        
        if (newUrl) {
          setCurrentAvatarUrl(newUrl);
          // Clear preview since we now have the real avatar
          setAvatarPreview(null);
          setAvatarFile(null);
        } else {
          console.warn('Failed to get avatar URL after upload, profile_pic:', updatedUser.profile_pic);
          // Keep preview visible as fallback until we can fetch the real URL
          // Don't clear preview - let user see their uploaded image
        }
      }
      
      // Show success message
      setUploadSuccess(true);
      
      // Close modal after a short delay to show success message
      setTimeout(() => {
        closeModal();
        // Trigger a page refresh to update avatars everywhere
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload avatar');
    } finally {
      setUploading(false);
    }
  };

  const renderEditModal = () => {
    if (!activeModal) return null;

    // Avatar upload modal
    if (activeModal === 'avatar') {
      return (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content modal-content-medium" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-icon-wrapper modal-icon-green">
                <ImageIcon size={24} />
              </div>
              <h2 className="modal-title">Profile Picture</h2>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center' }}>
                {/* Current/Preview Avatar */}
                <div style={{ position: 'relative', width: '120px', height: '120px' }}>
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Preview"
                      style={{
                        width: '120px',
                        height: '120px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '2px solid #1b253f',
                      }}
                    />
                  ) : currentAvatarUrl ? (
                    <img
                      key={`avatar-${currentUser?.id}-${(currentUser as any)?.avatar_updated_at || 0}-${Date.now()}`}
                      src={currentAvatarUrl}
                      alt="Current avatar"
                      onError={(e) => {
                        console.error('Avatar image failed to load:', currentAvatarUrl);
                        setCurrentAvatarUrl(null);
                      }}
                      onLoad={() => {
                        console.log('Avatar image loaded successfully:', currentAvatarUrl);
                      }}
                      style={{
                        width: '120px',
                        height: '120px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '2px solid #1b253f',
                      }}
                    />
                  ) : currentUser ? (
                    <div
                      style={{
                        width: '120px',
                        height: '120px',
                        borderRadius: '50%',
                        background: '#1b253f',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '48px',
                        fontWeight: 'bold',
                        color: '#6b7593',
                        border: '2px solid #1b253f',
                      }}
                    >
                      {getInitials({
                        id: currentUser.id,
                        username: currentUser.username || '',
                        first_name: currentUser.first_name || '',
                        last_name: currentUser.last_name || '',
                      })}
                    </div>
                  ) : null}
                </div>

                {/* File Input */}
                <label
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                    padding: '16px',
                    border: '2px dashed #1b253f',
                    borderRadius: '12px',
                    width: '100%',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#3b4d6f';
                    e.currentTarget.style.background = 'rgba(59, 77, 111, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#1b253f';
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <Upload size={24} color="#6b7593" />
                  <span style={{ fontSize: '14px', color: '#93a0c5' }}>
                    {avatarFile ? avatarFile.name : 'Click to select image'}
                  </span>
                  <span style={{ fontSize: '12px', color: '#6b7593' }}>
                    JPG, PNG, WEBP, or GIF (max 5MB)
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                    disabled={uploading}
                  />
                </label>

                {uploadSuccess && (
                  <div
                    style={{
                      padding: '12px 16px',
                      background: 'rgba(76, 175, 80, 0.1)',
                      border: '1px solid rgba(76, 175, 80, 0.3)',
                      borderRadius: '8px',
                      color: '#81c784',
                      fontSize: '14px',
                      width: '100%',
                      textAlign: 'center',
                    }}
                  >
                    ✓ Avatar uploaded successfully!
                  </div>
                )}

                {uploadError && (
                  <div
                    style={{
                      padding: '12px 16px',
                      background: 'rgba(255, 77, 77, 0.1)',
                      border: '1px solid rgba(255, 77, 77, 0.3)',
                      borderRadius: '8px',
                      color: '#ff9595',
                      fontSize: '14px',
                      width: '100%',
                      textAlign: 'center',
                    }}
                  >
                    {uploadError}
                  </div>
                )}

                <div className="modal-actions" style={{ width: '100%' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={closeModal}
                    disabled={uploading}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('Upload button clicked, calling handleAvatarUpload');
                      handleAvatarUpload();
                    }}
                    disabled={!avatarFile || uploading}
                    style={{ opacity: (!avatarFile || uploading) ? 0.6 : 1, cursor: (!avatarFile || uploading) ? 'not-allowed' : 'pointer' }}
                  >
                    {uploading ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Name fields modal (username, first_name, last_name combined)
    if (activeModal === 'name') {
      const username = newInfoCurrentUser?.username ?? '';
      const firstName = newInfoCurrentUser?.first_name ?? '';
      const lastName = newInfoCurrentUser?.last_name ?? '';

      return (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content modal-content-medium" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-icon-wrapper modal-icon-green">
                <UserCircle size={24} />
              </div>
              <h2 className="modal-title">Name Information</h2>
              <button className="modal-close" onClick={closeModal}>×</button>
            </div>
            <div className="modal-body">
              <form
                className="modal-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void updateAllNameFields();
                }}
              >
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '13px', 
                    fontWeight: '500', 
                    color: '#93a0c5', 
                    marginBottom: '8px' 
                  }}>
                    Display Name (Username)
                  </label>
                  <div className="input-group">
                    <User size={16} />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setNewInfoCurrentUser((prev) => 
                        prev ? ({ ...prev, username: e.target.value } as any) : prev
                      )}
                      placeholder="Enter display name"
                    />
                  </div>
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '13px', 
                    fontWeight: '500', 
                    color: '#93a0c5', 
                    marginBottom: '8px' 
                  }}>
                    First Name
                  </label>
                  <div className="input-group">
                    <User size={16} />
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setNewInfoCurrentUser((prev) => 
                        prev ? ({ ...prev, first_name: e.target.value } as any) : prev
                      )}
                      placeholder="Enter first name"
                    />
                  </div>
                </div>
                <div style={{ marginBottom: '24px' }}>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '13px', 
                    fontWeight: '500', 
                    color: '#93a0c5', 
                    marginBottom: '8px' 
                  }}>
                    Last Name
                  </label>
                  <div className="input-group">
                    <User size={16} />
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setNewInfoCurrentUser((prev) => 
                        prev ? ({ ...prev, last_name: e.target.value } as any) : prev
                      )}
                      placeholder="Enter last name"
                    />
                  </div>
                </div>
                
                {nameUpdateSuccess && (
                  <div
                    style={{
                      padding: '12px 16px',
                      background: 'rgba(76, 175, 80, 0.1)',
                      border: '1px solid rgba(76, 175, 80, 0.3)',
                      borderRadius: '8px',
                      color: '#81c784',
                      fontSize: '14px',
                      width: '100%',
                      textAlign: 'center',
                      marginBottom: '16px',
                    }}
                  >
                    ✓ Name information updated successfully!
                  </div>
                )}

                {nameUpdateError && (
                  <div
                    style={{
                      padding: '12px 16px',
                      background: 'rgba(255, 77, 77, 0.1)',
                      border: '1px solid rgba(255, 77, 77, 0.3)',
                      borderRadius: '8px',
                      color: '#ff9595',
                      fontSize: '14px',
                      width: '100%',
                      textAlign: 'center',
                      marginBottom: '16px',
                    }}
                  >
                    {nameUpdateError}
                  </div>
                )}

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
    }

    return null;
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
              data-color="#3b82f6"
              onClick={() => setActiveModal('avatar')}
            >
              <div
                className="security-option-icon-wrapper"
                style={{ '--icon-bg': '#3b82f620', '--icon-color': '#3b82f6' } as React.CSSProperties}
              >
                <ImageIcon size={24} />
              </div>
              <div>
                <h3 className="security-option-title">Profile Picture</h3>
                <p className="security-option-description">
                  {currentUser?.profile_pic ? 'Update your profile picture' : 'Set your profile picture'}
                </p>
              </div>
            </button>

            <button
              type="button"
              className="security-option-card"
              data-color="#10b981"
              onClick={() => setActiveModal('name')}
            >
              <div
                className="security-option-icon-wrapper"
                style={{ '--icon-bg': '#10b98120', '--icon-color': '#10b981' } as React.CSSProperties}
              >
                <UserCircle size={24} />
              </div>
              <div>
                <h3 className="security-option-title">Name</h3>
                <p className="security-option-description">
                  {currentUser?.username || currentUser?.first_name || currentUser?.last_name
                    ? `Display: ${currentUser.username || 'Not set'}, ${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim()
                    : 'Set your display name, first name, and last name'}
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

