'use client';

import { useEffect, useState } from 'react';
import { Search, User, Mail, Key, Github, Twitter, Trash2 } from 'lucide-react';
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
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [newInfoCurrentUser, setNewInfoCurrentUser] = useState<User | null>(null);
  const [confirmDeletion, setConfirmDeletion] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const updateUserInfo = async (field: string) => {
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


        <div className="setting-card">
          <h3>Email</h3>
          <div className="input-group">
            <Mail size={16} />
            <input type="email" value={newInfoCurrentUser?.email} />
          </div>
          <div className="button-group">
            <button className="btn" onClick={() => updateUserInfo('email')}>Change</button>
            <button className="btn">Verify</button>
          </div>
        </div>

        <div className="setting-card">
          <h3>Password</h3>
          <div className="input-group">
            <Key size={16} />
            <input type="password" placeholder='current password' value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </div>
          <div className="input-group">
            <Key size={16} />
            <input type="password" placeholder='new password' value={newPassword} onChange={(e) => setNewPassword(e.target.value)}  />
          </div>
          <div className="input-group">
            <Key size={16} />
            <input type="password" placeholder='confirm password' value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
          </div>
          <button className="btn">Update</button>
        </div>

        <div className="setting-card">
          <h3>Two-Factor Auth</h3>
          <div className="checkbox-group">
            <input type="checkbox" />
            <span>Authenticator App</span>
            <button className="btn">Configure</button>
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

        <div className="setting-card danger-zone">
          <h3>Danger Zone</h3>
          <div className="danger-zone-content">
            <span>
              <Trash2 size={18} />
              Delete account
            </span>
            <div className="danger-zone-actions">
              <button className="btn btn-danger" onClick={() => setShowDeleteConfirm(true)}>Delete</button>
            </div>
          </div>
        </div>
        </div>
      </div>

    </div>
  );
}

export default SettingsPage;
