'use client'

import { useState, useEffect } from 'react'
import styles from './StatusTab.module.css'

export default function StatusTab() {
  const [stats, setStats] = useState({
    totalAirdrops: 0,
    totalRecipients: 0,
    totalClaimed: 0,
    totalTokens: '0'
  })

  useEffect(() => {
    // Simulate loading stats
    const loadStats = () => {
      setStats({
        totalAirdrops: 3,
        totalRecipients: 150,
        totalClaimed: 87,
        totalTokens: '1,500,000'
      })
    }
    
    loadStats()
  }, [])

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>📊 Airdrop Statistics</h2>
      
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.totalAirdrops}</div>
          <div className={styles.statLabel}>Total Airdrops</div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.totalRecipients}</div>
          <div className={styles.statLabel}>Total Recipients</div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.totalClaimed}</div>
          <div className={styles.statLabel}>Tokens Claimed</div>
        </div>
        
        <div className={styles.statCard}>
          <div className={styles.statValue}>{stats.totalTokens}</div>
          <div className={styles.statLabel}>Total Tokens</div>
        </div>
      </div>
      
      <div className={styles.recentActivity}>
        <h3>Recent Activity</h3>
        <div className={styles.activityList}>
          <div className={styles.activityItem}>
            <span className={styles.activityIcon}>🚀</span>
            <span>Airdrop deployed to testnet</span>
            <span className={styles.activityTime}>2 hours ago</span>
          </div>
          <div className={styles.activityItem}>
            <span className={styles.activityIcon}>💰</span>
            <span>User claimed 1,000 tokens</span>
            <span className={styles.activityTime}>5 hours ago</span>
          </div>
          <div className={styles.activityItem}>
            <span className={styles.activityIcon}>✅</span>
            <span>Merkle proof verified</span>
            <span className={styles.activityTime}>1 day ago</span>
          </div>
        </div>
      </div>
    </div>
  )
}