import React, { useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Dashboard from './components/Dashboard.jsx';
import Playground from './components/Playground.jsx';
import AgentList from './components/AgentList.jsx';
import CommandList from './components/CommandList.jsx';
import Sessions from './components/Sessions.jsx';
import MCPServers from './components/MCPServers.jsx';
import Skills from './components/Skills.jsx';
import Config from './components/Config.jsx';

const VIEWS = {
  dashboard:  Dashboard,
  playground: Playground,
  agents:     AgentList,
  commands:   CommandList,
  sessions:   Sessions,
  mcp:        MCPServers,
  skills:     Skills,
  config:     Config,
};

export default function App() {
  const [view, setView] = useState('dashboard');
  const View = VIEWS[view] || Dashboard;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar active={view} onNav={setView} />
      <main style={{
        flex: 1,
        padding: view === 'playground' ? 0 : '32px 36px',
        overflowY: view === 'playground' ? 'hidden' : 'auto',
        maxWidth: view === 'playground' ? 'none' : 1100,
        position: 'relative',
      }}>
        <View />
      </main>
    </div>
  );
}
