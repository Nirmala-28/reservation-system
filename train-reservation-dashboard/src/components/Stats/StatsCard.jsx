import styles from './StatsCard.module.css';

const StatsCard = ({ title, value, change }) => {
  return (
    <div className={styles.card}>
      <h3 className={styles.title}>{title}</h3>
      <div className={styles.value}>{value}</div>
      {change !== undefined && (
        <div className={`${styles.change} ${
          change > 0 ? styles.positive : change < 0 ? styles.negative : ''
        }`}>
          {change === null ? (
            'New this month'
          ) : (
            <>
              {change > 0 ? '↑' : change < 0 ? '↓' : ''}{' '}
              {change !== 0 ? `${Math.abs(change)}%` : 'No change'}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default StatsCard;