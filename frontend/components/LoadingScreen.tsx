'use client';

import React from 'react';
import styles from './LoadingScreen.module.css';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = 'Loading...' 
}) => {
  return (
    <main className={styles.container}>
      <div className={styles.content}>
        <div className={styles.spinner}></div>
        <p className={styles.text}>{message}</p>
      </div>
    </main>
  );
};




