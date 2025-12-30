'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Popup, PopupOptions, PopupType } from '@/components/Popup';

interface PopupContextType {
  showAlert: (message: string, title?: string) => Promise<void>;
  showConfirm: (message: string, title?: string) => Promise<boolean>;
  showInfo: (message: string, title?: string) => Promise<void>;
  showSuccess: (message: string, title?: string) => Promise<void>;
  showError: (message: string, title?: string) => Promise<void>;
}

const PopupContext = createContext<PopupContextType | null>(null);

export const usePopup = () => {
  const context = useContext(PopupContext);
  if (!context) {
    throw new Error('usePopup must be used within PopupProvider');
  }
  return context;
};

interface PopupProviderProps {
  children: ReactNode;
}

export const PopupProvider: React.FC<PopupProviderProps> = ({ children }) => {
  const [popup, setPopup] = useState<PopupOptions | null>(null);

  const showPopup = useCallback((options: PopupOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setPopup({
        ...options,
        onConfirm: () => {
          if (options.onConfirm) {
            options.onConfirm();
          }
          resolve(true);
        },
        onCancel: () => {
          if (options.onCancel) {
            options.onCancel();
          }
          resolve(false);
        },
      });
    });
  }, []);

  const closePopup = useCallback(() => {
    setPopup(null);
  }, []);

  const showAlert = useCallback(async (message: string, title?: string): Promise<void> => {
    await showPopup({ message, title, type: 'alert' });
  }, [showPopup]);

  const showConfirm = useCallback(async (message: string, title?: string): Promise<boolean> => {
    return await showPopup({ message, title, type: 'confirm' });
  }, [showPopup]);

  const showInfo = useCallback(async (message: string, title?: string): Promise<void> => {
    await showPopup({ message, title, type: 'info' });
  }, [showPopup]);

  const showSuccess = useCallback(async (message: string, title?: string): Promise<void> => {
    await showPopup({ message, title, type: 'success' });
  }, [showPopup]);

  const showError = useCallback(async (message: string, title?: string): Promise<void> => {
    await showPopup({ message, title, type: 'error' });
  }, [showPopup]);

  return (
    <PopupContext.Provider
      value={{
        showAlert,
        showConfirm,
        showInfo,
        showSuccess,
        showError,
      }}
    >
      {children}
      {popup && <Popup {...popup} onClose={closePopup} />}
    </PopupContext.Provider>
  );
};




