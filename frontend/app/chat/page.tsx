'use client';

import styles from './styles.module.css';

export default function ChatPage() {

  return (
    <div className={styles.emptyStateWrapper}>
      <div className={styles.emptyStateCard}>
        <h1 className={styles.emptyStateTitle}>Select a conversation</h1>
        <p className={styles.emptyStateSubtitle}>
          Choose a friend or channel from the left sidebar to start chatting.
        </p>
      </div>
    </div>
  );
}

