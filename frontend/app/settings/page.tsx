'use client';

import { useEffect, useState } from 'react';
import { Search, User, Mail, Key, Github, Twitter, Trash2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import './styles.css';
import { fetchCurrentUser } from '@/lib/fetcher';

interface PasswordInputProps {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface User {
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
  const router = useRouter();
  const searchParams = useSearchParams();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [newInfoCurrentUser, setNewInfoCurrentUser] = useState<User | null>(null);
  const [confirmDeletion, setConfirmDeletion] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const updateUserInfo = async (field: keyof User) => {
    if (!newInfoCurrentUser || !currentUser) return;

    const newValue = newInfoCurrentUser[field];
    const oldValue = currentUser[field];

    if (newValue === oldValue) {
      console.log("No changes detected for field:", field);
      return;
    }

    const updatedUser = { ...currentUser, [field]: newValue };
    setCurrentUser(updatedUser);

    try {
      const update = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/users` : process.env.NEXT_PUBLIC_USR_MANAG_URL}/me/profile`,
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

  const deleteAccount = async () => {
    // ! deletion here baliiiiiz
  };

  useEffect(() => {{
    if(confirmDeletion)
      deleteAccount();
  }}, [confirmDeletion]);

  useEffect(() => {
    loadCurrentUser();
  }, []);

  // Redirect OAuth callbacks to security-settings page
  useEffect(() => {
    const connected = searchParams?.get('connected');
    const error = searchParams?.get('error');
    
    if (connected || error) {
      const params = new URLSearchParams();
      if (connected) params.set('connected', connected);
      if (error) params.set('error', error);
      router.replace(`/settings/security-settings?${params.toString()}`);
    }
  }, [searchParams, router]);

  return (
    <div className={`container`}>

      <div className='main-content' >
        <div className="account-grid">
        <div className="setting-card">
          <h3>Display Name</h3>
          <div className="input-group">
            <User size={16} />
            <input type="text" value={newInfoCurrentUser?.username || ''} onChange={(e) => setNewInfoCurrentUser(prev => prev ? { ...prev, username: e.target.value } : prev)} />
          </div>
          <div className="button-group">
            <button className="btn" onClick={() => updateUserInfo('username')}>Edit</button>
          </div>
        </div>

        <div className="setting-card">
          <h3>First Name</h3>
          <div className="input-group">
            <User size={16} />
            <input type="text" value={newInfoCurrentUser?.first_name || ''} onChange={(e) => setNewInfoCurrentUser(prev => prev ? { ...prev, first_name: e.target.value } : prev)} />
          </div>
          <div className="button-group">
            <button className="btn" onClick={() => updateUserInfo('first_name')}>Edit</button>
          </div>
        </div>

        <div className="setting-card">
          <h3>Last Name</h3>
          <div className="input-group">
            <User size={16} />
            <input type="text" value={newInfoCurrentUser?.last_name || ''} onChange={(e) => setNewInfoCurrentUser(prev => prev ? { ...prev, last_name: e.target.value } : prev)} />
          </div>
          <div className="button-group">
            <button className="btn" onClick={() => updateUserInfo('last_name')}>Edit</button>
          </div>
        </div>

        <div className={`setting-card confirm-deletion ${showDeleteConfirm ? 'visible' : ''}`}>
          <h3>Are you sure ?</h3>
          <span>All your data will be lost.</span>
          <div className="checkbox-group">
            <button className="btn" onClick={() => setConfirmDeletion(true)}>Yes</button>
            <button className="btn" onClick={() => {setConfirmDeletion(false); setShowDeleteConfirm(false);}}>No</button>
          </div>
        </div>

        <div className="setting-card">
          <h3>Delete Account</h3>
          <div style={{ padding: '16px 0' }}>
            <p style={{ color: '#9ca8c7', fontSize: '14px', marginBottom: '12px' }}>
              Permanently delete your account and all associated data.
            </p>
            <div style={{ color: '#666', fontSize: '13px' }}>
              This feature will be available soon.
            </div>
          </div>
        </div>

        <div className="setting-card">
          <h3>Connected Accounts</h3>
          <div style={{ padding: '16px 0' }}>
            <p style={{ color: '#9ca8c7', fontSize: '14px', marginBottom: '12px' }}>
              Manage your connected third-party accounts.
            </p>
            <div style={{ color: '#666', fontSize: '13px' }}>
              This feature will be available soon.
            </div>
          </div>
        </div>
        </div>
      </div>

    </div>
  );
}

export default SettingsPage;
