import styles from './SmokeEffect.module.css';

export default function SmokeEffect() {
  return (
    <div className={styles.smokeContainer}>
      <svg width="0" height="0" className={styles.svgFilter}>
        <defs>
          <filter id="real-smoke">
            <feTurbulence 
              type="fractalNoise" 
              baseFrequency="0.006" 
              numOctaves="5" 
              seed="1" 
              result="turbulence" 
            />
            <feDisplacementMap 
              in="SourceGraphic" 
              in2="turbulence" 
              scale="120" 
              xChannelSelector="R" 
              yChannelSelector="G" 
            />
          </filter>
        </defs>
      </svg>

      <div className={styles.smokeWrapper}>
        <div className={`${styles.smoke} ${styles.smoke1}`}></div>
        <div className={`${styles.smoke} ${styles.smoke2}`}></div>
        <div className={`${styles.smoke} ${styles.smoke3}`}></div>
        <div className={`${styles.smoke} ${styles.smoke4}`}></div>
      </div>
    </div>
  );
}
