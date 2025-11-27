'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-toastify';
import { verifyEmail, getCsrfToken } from '@/lib/api';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import styles from './styles.module.css';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    const verifyEmailToken = async () => {
      const token = searchParams.get('token');
      
      if (!token) {
        toast.error('No verification token provided');
        setMessage('Invalid verification link');
        setStatus('error');
        return;
      }

      try {
        const csrfToken = await getCsrfToken();
        const result = await verifyEmail({ token }, csrfToken);

        if (result.ok && result.data) {
          const responseData = result.data as { message?: string; error?: string };
          
          if (responseData.error) {
            toast.error(responseData.error);
            setMessage(responseData.error);
            setStatus('error');
          } else {
            const successMessage = responseData.message || 'Email verified successfully';
            toast.success(successMessage);
            setMessage(successMessage);
            setStatus('success');
            
            setTimeout(() => {
              router.replace('/login');
            }, 2000);
          }
        } else {
          const errorMessage = (result.data as { error?: string })?.error || 'Failed to verify email';
          toast.error(errorMessage);
          setMessage(errorMessage);
          setStatus('error');
        }
      } catch (error) {
        toast.error('An error occurred while verifying your email');
        setMessage('Verification failed');
        setStatus('error');
        console.error('Verify email error:', error);
      }
    };

    verifyEmailToken();
  }, [searchParams, router]);

  return (
    <div className={styles.page}>
      <div className={styles.verifyContainer}>
        {status === 'loading' && (
          <>
            <div className={styles.iconContainer}>
              <Loader2 size={48} className={styles.loader} />
            </div>
            <h1 className={styles.title}>Verifying Email...</h1>
            <p className={styles.subtitle}>Please wait while we verify your email address.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className={`${styles.iconContainer} ${styles.successIcon}`}>
              <CheckCircle size={48} color="#4caf50" />
            </div>
            <h1 className={styles.title}>Email Verified!</h1>
            <p className={styles.successMessage}>{message}</p>
            <p className={styles.redirectText}>Redirecting to login...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className={`${styles.iconContainer} ${styles.errorIcon}`}>
              <XCircle size={48} color="#f44336" />
            </div>
            <h1 className={styles.title}>Verification Failed</h1>
            <p className={styles.errorDescription}>{message}</p>
            <div className={styles.buttonGroup}>
              <button
                onClick={() => router.replace('/login')}
                className={`${styles.loginButton} ${styles.errorButton}`}
              >
                Go to Login
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}