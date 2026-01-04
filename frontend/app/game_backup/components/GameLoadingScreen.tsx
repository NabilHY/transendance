// Loading screen component

import React from 'react';
import styles from '../styles.module.css';

export const GameLoadingScreen: React.FC = () => {
  return (
    <div className={styles.page}>
      <div className={styles.container} style={{ alignItems: "center", justifyContent: "center", minHeight: "400px" }}>
        <div style={{ textAlign: "center" }}>
          <div className={styles.loadingSpinner} style={{ marginBottom: "20px" }}></div>
          <p style={{ color: "#8c96b6", fontSize: "15px" }}>Loading...</p>
        </div>
      </div>
    </div>
  );
};
