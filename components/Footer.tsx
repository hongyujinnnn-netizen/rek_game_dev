// components/Footer.tsx
'use client';

import styles from './Footer.module.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.brand}>
          <span className={styles.footerLogo}>♞ Leung Rek</span>
          <p className={styles.copyright}>© {currentYear} — Traditional strategy reimagined</p>
        </div>
        <div className={styles.links}>
          <a href="#" className={styles.link}>About</a>
          <a href="https://github.com/hongyujinnnn-netizen/rek_game_dev.git" className={styles.link}>GitHub</a>
          <a href="#" className={styles.link}>Privacy</a>
        </div>
      </div>
    </footer>
  );
}