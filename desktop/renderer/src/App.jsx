import { useState, useEffect, useRef } from 'react';
import { useFetch } from './hooks/useFetch.js';
import { fetchAgents, fetchCommands, fetchAgentStatus } from './api/client.js';
import Header from './components/Header/Header.jsx';
import TabBar from './components/TabBar/TabBar.jsx';
import LiveTab from './components/tabs/LiveTab/LiveTab.jsx';
import PlaygroundTab from './components/tabs/PlaygroundTab/PlaygroundTab.jsx';
import AgentsTab from './components/tabs/AgentsTab/AgentsTab.jsx';
import CommandsTab from './components/tabs/CommandsTab/CommandsTab.jsx';
import McpTab from './components/tabs/McpTab/McpTab.jsx';
import styles from './App.module.css';

const TABS = { live: LiveTab, playground: PlaygroundTab, agents: AgentsTab, commands: CommandsTab, mcp: McpTab };

export default function App() {
  const [tab, setTab] = useState('live');
  // Track session IDs we've already auto-switched for so we don't re-trigger
  const autoSwitchedFor = useRef(new Set());

  // Shared data powering Header stats (fetched once here, not per-tab)
  const agents  = useFetch(fetchAgents);
  const cmds    = useFetch(fetchCommands);
  const status  = useFetch(fetchAgentStatus, { interval: 5000 });

  const activeCount = (status.data || []).filter((s) => s.status !== 'Idle').length;
  const TabView = TABS[tab] || LiveTab;

  // Auto-switch to Office when an agent needs permission
  useEffect(() => {
    const agents = status.data || [];
    const alerting = agents.filter((a) => a.status === 'Waiting for permission');

    // Clear sessions that are no longer alerting so they can re-trigger if needed
    const alertIds = new Set(alerting.map((a) => a.sessionId));
    for (const id of autoSwitchedFor.current) {
      if (!alertIds.has(id)) autoSwitchedFor.current.delete(id);
    }

    // Switch to playground for any new alerting session
    const hasNew = alerting.some((a) => !autoSwitchedFor.current.has(a.sessionId));
    if (hasNew) {
      alerting.forEach((a) => autoSwitchedFor.current.add(a.sessionId));
      setTab('playground');
    }
  }, [status.data]);

  return (
    <div className={styles.app}>
      <Header
        agentCount={agents.data?.length ?? null}
        commandCount={cmds.data?.length ?? null}
        activeCount={activeCount}
        hasActive={activeCount > 0}
        onStatClick={setTab}
      />
      <TabBar activeTab={tab} onTabChange={setTab} activeCount={activeCount} />
      <div className={styles.content}>
        <TabView />
      </div>
    </div>
  );
}
