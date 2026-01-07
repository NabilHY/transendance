'use client';

import React from 'react';
import { AlertCircle, CheckCircle, XCircle, Info, X } from 'lucide-react';
import styles from './Popup.module.css';

export type PopupType = 'alert' | 'confirm' | 'info' | 'success' | 'error';

export interface PopupOptions {
  message: string;
  title?: string;
  type?: PopupType;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
}

interface PopupProps extends PopupOptions {
  onClose: () => void;
}

export const Popup: React.FC<PopupProps> = ({
  message,
  title,
  type = 'alert',
  onConfirm,
  onCancel,
  onClose,
  confirmText,
  cancelText,
}) => {
  const isConfirm = type === 'confirm';
  const hasActions = isConfirm || onConfirm;

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    onClose();
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle size={24} />;
      case 'error':
        return <XCircle size={24} />;
      case 'info':
        return <Info size={24} />;
      case 'confirm':
        return <AlertCircle size={24} />;
      default:
        return <Info size={24} />;
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'success':
        return '#00ff88';
      case 'error':
        return '#ff4444';
      case 'info':
        return '#2f8cff';
      case 'confirm':
        return '#ffa500';
      default:
        return '#2f8cff';
    }
  };

  const iconColor = getIconColor();

  return (
    <div className={styles.overlay} onClick={!isConfirm ? handleCancel : undefined}>
      <div className={styles.content} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div 
            className={styles.iconWrapper}
            style={{
              backgroundColor: `${iconColor}15`,
              borderColor: `${iconColor}30`,
            }}
          >
            <div style={{ color: iconColor }}>
              {getIcon()}
            </div>
          </div>
          {title && <h2 className={styles.title}>{title}</h2>}
          {!isConfirm && (
            <button className={styles.close} onClick={handleCancel}>×</button>
          )}
        </div>

        <div className={styles.body}>
          <p className={styles.message}>{message}</p>
        </div>

        {hasActions && (
          <div className={styles.actions}>
            {isConfirm && (
              <button 
                className={`${styles.button} ${styles.buttonSecondary}`}
                onClick={handleCancel}
              >
                {cancelText || 'Cancel'}
              </button>
            )}
            <button 
              className={`${styles.button} ${styles.buttonPrimary}`}
              onClick={handleConfirm}
            >
              {confirmText || (isConfirm ? 'Confirm' : 'OK')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};









