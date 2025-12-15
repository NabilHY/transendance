'use client';

import { useEffect, useState } from 'react';
import { User, Mail, UserCircle } from 'lucide-react';
import '../styles.css';
import { fetchCurrentUser } from '@/lib/fetcher';
import { useRequireAuth } from '@/hooks/useAuthGuard';

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
  const { loading: authLoading, isAuthenticated } = useRequireAuth();
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
        `${process.env.NEXT_PUBLIC_USR_MANAG_URL}/me/profile`,
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

  if (authLoading || !isAuthenticated) {
    return null;
  }

  return (
    <div className="container">
      <div className="main-content">
        <div className="settings-content">
          <div className="settings-header">
            <div>
              <p className="settings-title" style={{ margin: 0 }}>Profile Settings</p>
              <p style={{ color: '#8c96b6', margin: '6px 0 0 0', fontSize: '14px' }}>Manage your personal information</p>
            </div>
          </div>

          <div className="security-settings-grid">
            <div className="setting-card security-card">
              <div className="card-header">
                <UserCircle size={20} />
                <h3>Display Name</h3>
              </div>
              <div className="input-group">
                <User size={16} />
                <input
                  type="text"
                  value={newInfoCurrentUser?.username || ''}
                  onChange={(e) => setNewInfoCurrentUser(prev => prev ? { ...prev, username: e.target.value } : prev)}
                />
              </div>
              <div className="button-group">
                <button className="btn" onClick={() => updateUserInfo('username')}>Save</button>
              </div>
            </div>

            <div className="setting-card security-card">
              <div className="card-header">
                <User size={20} />
                <h3>First Name</h3>
              </div>
              <div className="input-group">
                <User size={16} />
                <input
                  type="text"
                  value={newInfoCurrentUser?.first_name || ''}
                  onChange={(e) => setNewInfoCurrentUser(prev => prev ? { ...prev, first_name: e.target.value } : prev)}
                />
              </div>
              <div className="button-group">
                <button className="btn" onClick={() => updateUserInfo('first_name')}>Save</button>
              </div>
            </div>

            <div className="setting-card security-card">
              <div className="card-header">
                <User size={20} />
                <h3>Last Name</h3>
              </div>
              <div className="input-group">
                <User size={16} />
                <input
                  type="text"
                  value={newInfoCurrentUser?.last_name || ''}
                  onChange={(e) => setNewInfoCurrentUser(prev => prev ? { ...prev, last_name: e.target.value } : prev)}
                />
              </div>
              <div className="button-group">
                <button className="btn" onClick={() => updateUserInfo('last_name')}>Save</button>
              </div>
            </div>

            <div className="setting-card security-card">
              <div className="card-header">
                <Mail size={20} />
                <h3>Email</h3>
              </div>
              <div className="input-group">
                <Mail size={16} />
                <input
                  type="email"
                  value={newInfoCurrentUser?.email || ''}
                  onChange={(e) => setNewInfoCurrentUser(prev => prev ? { ...prev, email: e.target.value } : prev)}
                />
              </div>
              <div className="button-group">
                <button className="btn" onClick={() => updateUserInfo('email')}>Save</button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;

