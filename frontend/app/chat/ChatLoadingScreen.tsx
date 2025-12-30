'use client';

import React from 'react';
import styles from './styles.module.css';

export const ChatLoadingScreen: React.FC = () => {
  return (
    <main className={styles.loadingContainer}>
      <div className={styles.loadingContent}>
        <div className={styles.loadingSpinner}></div>
        <p className={styles.loadingText}>Loading chat...</p>
      </div>
    </main>
  );
};




