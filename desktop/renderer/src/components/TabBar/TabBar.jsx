import styles from './TabBar.module.css';

const TABS = [
  { id: 'live',       icon: '●',  label: 'Live'       },
  { id: 'playground', icon: '🏢', label: 'Office'     },
  { id: 'past',       icon: '📜', label: 'Past'       },
  { id: 'agents',     icon: '🤖', label: 'Agents'     },
  { id: 'commands',   icon: '⚡', label: 'Commands'   },
  { id: 'mcp',        icon: '🔌', label: 'MCP'        },
];

export default function TabBar({ activeTab, onTabChange, activeCount }) {
  return (
    <nav className={styles.tabBar}>
      {TABS.map((t) => (
        <button
          key={t.id}
          className={`${styles.tab} ${activeTab === t.id ? styles.active : ''}`}
          onClick={() => onTabChange(t.id)}
        >
          <span className={styles.icon}>{t.icon}</span>
          <span className={styles.label}>{t.label}</span>
          {t.id === 'live' && activeCount > 0 && (
            <span className={styles.badge}>{activeCount}</span>
          )}
        </button>
      ))}
    </nav>
  );
}
