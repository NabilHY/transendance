'use client';

import React, { useEffect } from 'react';
import { Shield, UserCircle } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import './styles.css';

export interface User {
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

  const settingsOptions = [
    {
      id: 'profile',
      title: 'Profile Settings',
      description: 'Manage your personal information',
      icon: <UserCircle size={24} />,
      color: '#10b981',
      href: '/settings/profile-settings',
    },
    {
      id: 'security',
      title: 'Security Settings',
      description: 'Manage password, 2FA, and connected accounts',
      icon: <Shield size={24} />,
      color: '#1790ff',
      href: '/settings/security-settings',
    },
  ] as const;

  return (
    <div className="container">
      <div className="main-content">
        <div className="security-settings-wrapper">
          <div className="security-settings-header">
            <h1 className="security-settings-title">Settings</h1>
            <p className="security-settings-subtitle">
              Choose a settings category
            </p>
          </div>

          <div className="security-options-grid">
            {settingsOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => router.push(option.href)}
                className="security-option-card"
                data-color={option.color}
              >
                <div
                  className="security-option-icon-wrapper"
                  style={{
                    '--icon-bg': `${option.color}20`,
                    '--icon-color': option.color,
                  } as React.CSSProperties}
                >
                  {option.icon}
                </div>
                <div>
                  <h3 className="security-option-title">{option.title}</h3>
                  <p className="security-option-description">
                    {option.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
