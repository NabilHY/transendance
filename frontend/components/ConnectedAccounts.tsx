'use client';

import { useEffect, useState, useCallback } from 'react';
import { Link2, X, Loader2, Link as LinkIcon } from 'lucide-react';
import { getConnectedAccounts, disconnectAccount, connectGoogleAccount, ConnectedAccount } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface ConnectedAccountsProps {
  showHeader?: boolean;
}

export default function ConnectedAccounts({ showHeader = true }: ConnectedAccountsProps = {}) {
  const { ensureCsrf } = useAuth();
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const csrfToken = await ensureCsrf();
      const result = await getConnectedAccounts(csrfToken);
      
      if (result.ok && result.data) {
        const response = result.data as { accounts: ConnectedAccount[] };
        setAccounts(response.accounts || []);
      } else {
        setError('Failed to load connected accounts');
      }
    } catch (err) {
      setError('Failed to load connected accounts');
      console.error('Error loading connected accounts:', err);
    } finally {
      setLoading(false);
    }
  }, [ensureCsrf]);

  useEffect(() => {
    loadAccounts();

    // Listen for refresh events (e.g., after successful OAuth connection)
    const handleRefresh = () => {
      loadAccounts();
    };
    window.addEventListener('connected-accounts-refresh', handleRefresh);

    return () => {
      window.removeEventListener('connected-accounts-refresh', handleRefresh);
    };
  }, [loadAccounts]);

  const handleConnectGoogle = () => {
    connectGoogleAccount();
  };

  const handleDisconnect = async (provider: string) => {
    if (!confirm(`Are you sure you want to disconnect your ${provider} account?`)) {
      return;
    }

    setDisconnecting(provider);
    setDisconnectError(null);

    try {
      const csrfToken = await ensureCsrf();
      const result = await disconnectAccount(provider, csrfToken);

      if (result.ok) {
        // Reload accounts after successful disconnect
        await loadAccounts();
      } else {
        // Handle specific error cases
        if (result.status === 403) {
          setDisconnectError('Cannot unlink account. Please set a password first to prevent account lockout.');
        } else if (result.status === 400) {
          const errorData = result.data as { error?: string };
          setDisconnectError(errorData?.error || 'Account is not connected');
        } else if (result.status === 500) {
          setDisconnectError('Failed to disconnect. Please try again.');
        } else {
          const errorData = result.data as { error?: string };
          setDisconnectError(errorData?.error || 'Failed to disconnect account');
        }
      }
    } catch (err) {
      setDisconnectError('Failed to disconnect. Please try again.');
      console.error('Error disconnecting account:', err);
    } finally {
      setDisconnecting(null);
    }
  };

  const isGoogleConnected = accounts.some(acc => acc.provider === 'google');

  const content = (
    <>
      {loading ? (
        <div style={{ padding: '16px 0', display: 'flex', alignItems: 'center', gap: '8px', color: '#9ca8c7' }}>
          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: '14px' }}>Loading connected accounts...</span>
        </div>
      ) : error ? (
        <div style={{ padding: '16px 0' }}>
          <p style={{ color: '#ef4444', fontSize: '14px', marginBottom: '12px' }}>{error}</p>
          <button className="btn" onClick={loadAccounts}>Retry</button>
        </div>
      ) : (
        <div style={{ padding: '16px 0' }}>
          <p style={{ color: '#9ca8c7', fontSize: '14px', marginBottom: '16px' }}>
            Manage your connected third-party accounts.
          </p>

          {/* Google Account */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px',
            backgroundColor: '#0f0f0f',
            border: '1px solid #2a2a2a',
            borderRadius: '8px',
            marginBottom: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.64 9.20454C17.64 8.56636 17.5827 7.95272 17.4764 7.36363H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20454Z" fill="#4285F4"/>
                <path d="M9 18C11.43 18 13.467 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4204 9 14.4204C6.65454 14.4204 4.67182 12.8373 3.96409 10.71H0.957275V13.0418C2.43818 15.9832 5.48182 18 9 18Z" fill="#34A853"/>
                <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957273C0.347727 6.17318 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957273 13.0418L3.96409 10.71Z" fill="#FBBC05"/>
                <path d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65454 3.57955 9 3.57955Z" fill="#EA4335"/>
              </svg>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', color: '#e4ecff', fontWeight: 500 }}>Google</div>
                {isGoogleConnected ? (
                  <div style={{ fontSize: '12px', color: '#9ca8c7' }}>
                    {accounts.find(acc => acc.provider === 'google')?.email || 'Connected'}
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: '#666' }}>Not connected</div>
                )}
              </div>
              {isGoogleConnected && (
                <span style={{
                  fontSize: '12px',
                  color: '#10b981',
                  marginRight: '8px'
                }}>Connected</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {isGoogleConnected ? (
                <button
                  className="btn btn-danger"
                  onClick={() => handleDisconnect('google')}
                  disabled={disconnecting === 'google'}
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  {disconnecting === 'google' ? (
                    <>
                      <Loader2 size={14} style={{ display: 'inline-block', marginRight: '4px', animation: 'spin 1s linear infinite' }} />
                      Disconnecting...
                    </>
                  ) : (
                    <>
                      <X size={14} style={{ display: 'inline-block', marginRight: '4px' }} />
                      Disconnect
                    </>
                  )}
                </button>
              ) : (
                <button
                  className="btn btn-primary"
                  onClick={handleConnectGoogle}
                  style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Link2 size={14} />
                  Connect
                </button>
              )}
            </div>
          </div>

          {disconnectError && (
            <div style={{
              padding: '10px 12px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: '6px',
              marginTop: '12px'
            }}>
              <p style={{ color: '#ef4444', fontSize: '13px', margin: 0 }}>
                {disconnectError}
              </p>
            </div>
          )}

          {accounts.length === 0 && !loading && (
            <div style={{ fontSize: '13px', color: '#666', fontStyle: 'italic', marginTop: '8px' }}>
              No accounts connected
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </>
  );

  // If used inside security-card, render with header; otherwise render in setting-card wrapper
  if (showHeader) {
    return (
      <>
        <div className="card-header">
          <LinkIcon size={20} />
          <h3>Connected Accounts</h3>
        </div>
        <div className="twofa-content">
          {content}
        </div>
      </>
    );
  }

  return (
    <div className="setting-card">
      <h3>Connected Accounts</h3>
      {content}
    </div>
  );
}

