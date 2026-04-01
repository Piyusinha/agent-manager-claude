import React, { useState } from 'react';
import { Card, Spinner, ErrorMsg } from './Card.jsx';
import { useFetch } from '../hooks/useFetch.js';

const TEMPLATES = {
  blank: (name) => `# ${name}\n\n## Description\nDescribe what this skill does.\n\n## Usage\n\`\`\`\n/${name} [args]\n\`\`\`\n\n## Steps\n1. Step one\n2. Step two\n`,
  agent: (name) => `# ${name}\n\n## Description\nThis skill invokes an AI agent to complete a task.\n\n## Instructions\nWhen the user runs /${name}:\n1. Analyze the current context\n2. Spawn the appropriate agent with Task tool\n3. Return results to the user\n\n## Agent Configuration\n- **Model**: claude-sonnet-4-6\n- **Tools**: Read, Write, Edit, Bash, Grep, Glob\n`,
  tool: (name) => `# ${name}\n\n## Description\nA tool-focused skill that performs specific operations.\n\n## Instructions\nWhen the user runs /${name}:\n1. Read relevant files\n2. Apply transformations\n3. Write output\n\n## Example\n\`\`\`bash\n# Example usage\n/${name} target-file.ts\n\`\`\`\n`,
  review: (name) => `# ${name}\n\n## Description\nCode review skill that analyzes code quality.\n\n## Review Checklist\n- [ ] Code correctness\n- [ ] Error handling\n- [ ] Security vulnerabilities\n- [ ] Performance concerns\n- [ ] Test coverage\n- [ ] Documentation\n\n## Instructions\nRun through each checklist item and report findings with severity: CRITICAL, HIGH, MEDIUM, LOW.\n`,
};

function Modal({ title, onClose, wide, children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 28, width: wide ? 760 : 520, maxWidth: '95vw', maxHeight: '88vh', overflowY: 'auto',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexShrink: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ViewModal({ skill, onEdit, onClose }) {
  const { data, loading, error } = useFetch(`/api/skills/${encodeURIComponent(skill.id)}`);
  return (
    <Modal title={`✦ ${skill.name}`} onClose={onClose} wide>
      {loading ? <Spinner /> : error ? <ErrorMsg msg={error} /> : (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button onClick={() => onEdit(data)} style={{
              background: 'var(--accent)', color: '#fff', border: 'none',
              borderRadius: 7, padding: '7px 16px', fontWeight: 600, cursor: 'pointer',
            }}>✏ Edit</button>
          </div>
          <pre style={{
            background: 'var(--surface2)', borderRadius: 8, padding: 16,
            fontFamily: 'var(--mono)', fontSize: 12, lineHeight: 1.6,
            whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowY: 'auto',
            maxHeight: '55vh', margin: 0,
          }}>
            {data?.content}
          </pre>
          <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text3)' }}>File: {data?.file}</div>
        </>
      )}
    </Modal>
  );
}

function EditModal({ skillData, onClose, onSaved }) {
  const [content, setContent] = useState(skillData.content);
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState(null);

  async function save() {
    setSaving(true); setErr(null);
    try {
      const res = await fetch(`/api/skills/${encodeURIComponent(skillData.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, file: skillData.file }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      onSaved();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={`✏ Edit: ${skillData.id}`} onClose={onClose} wide>
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        style={{
          width: '100%', boxSizing: 'border-box',
          fontFamily: 'var(--mono)', fontSize: 12, lineHeight: 1.6,
          resize: 'vertical', minHeight: 400, padding: 12,
        }}
      />
      {err && <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 8 }}>⚠ {err}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
        <button onClick={onClose} style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)', borderRadius: 7, padding: '8px 16px', cursor: 'pointer' }}>Cancel</button>
        <button onClick={save} disabled={saving} style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 18px', fontWeight: 600, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Saving…' : '✓ Save'}
        </button>
      </div>
    </Modal>
  );
}

function CreateModal({ onClose, onCreated }) {
  const [name, setName]         = useState('');
  const [template, setTemplate] = useState('blank');
  const [content, setContent]   = useState(TEMPLATES.blank('my-skill'));
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState(null);

  function applyTemplate(tpl, n) {
    const fn = TEMPLATES[tpl] || TEMPLATES.blank;
    setContent(fn(n || name || 'my-skill'));
  }

  function handleNameChange(v) {
    setName(v);
    applyTemplate(template, v || 'my-skill');
  }

  function handleTemplateChange(tpl) {
    setTemplate(tpl);
    applyTemplate(tpl, name || 'my-skill');
  }

  async function create() {
    if (!name.trim()) return setErr('Name is required');
    setSaving(true); setErr(null);
    try {
      const res = await fetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), content }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      onCreated();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  const label = s => <label style={{ fontSize: 12, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>{s}</label>;

  return (
    <Modal title="✦ Create New Skill" onClose={onClose} wide>
      <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          {label('Skill Name *')}
          <input
            value={name}
            onChange={e => handleNameChange(e.target.value)}
            placeholder="my-skill"
            style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'var(--mono)' }}
            autoFocus
          />
        </div>
        <div style={{ flex: 1 }}>
          {label('Template')}
          <select value={template} onChange={e => handleTemplateChange(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }}>
            <option value="blank">Blank</option>
            <option value="agent">Agent Skill</option>
            <option value="tool">Tool Skill</option>
            <option value="review">Code Review</option>
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        {label('Content (SKILL.md)')}
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          style={{
            width: '100%', boxSizing: 'border-box',
            fontFamily: 'var(--mono)', fontSize: 12, lineHeight: 1.6,
            resize: 'vertical', minHeight: 320, padding: 12,
          }}
        />
      </div>

      <div style={{ background: 'var(--surface2)', borderRadius: 6, padding: '8px 12px', fontSize: 11, color: 'var(--text3)', marginBottom: 14 }}>
        Will create <code style={{ fontFamily: 'var(--mono)' }}>~/.claude/skills/{name || 'my-skill'}/SKILL.md</code>
      </div>

      {err && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 10 }}>⚠ {err}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button onClick={onClose} style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)', borderRadius: 7, padding: '8px 16px', cursor: 'pointer' }}>Cancel</button>
        <button onClick={create} disabled={saving || !name.trim()} style={{
          background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 7,
          padding: '8px 18px', fontWeight: 600, cursor: 'pointer',
          opacity: saving || !name.trim() ? 0.6 : 1,
        }}>
          {saving ? 'Creating…' : '✦ Create Skill'}
        </button>
      </div>
    </Modal>
  );
}

export default function Skills() {
  const { data: skills, loading, error, refetch } = useFetch('/api/skills');
  const [search, setSearch]     = useState('');
  const [viewing, setViewing]   = useState(null);   // skill object
  const [editData, setEditData] = useState(null);   // { id, file, content }
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const filtered = (skills || []).filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.description?.toLowerCase().includes(search.toLowerCase())
  );

  async function deleteSkill(skill) {
    if (!confirm(`Delete skill "${skill.name}"? This cannot be undone.`)) return;
    setDeleting(skill.id);
    try {
      const res = await fetch(`/api/skills/${encodeURIComponent(skill.id)}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      refetch();
    } catch (e) {
      alert('Delete failed: ' + e.message);
    } finally {
      setDeleting(null);
    }
  }

  if (loading) return <Spinner />;
  if (error) return <ErrorMsg msg={error} />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontWeight: 700, fontSize: 22 }}>
          Skills <span style={{ fontSize: 14, color: 'var(--text3)', fontWeight: 400 }}>({filtered.length})</span>
        </h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <input placeholder="Search skills…" value={search} onChange={e => setSearch(e.target.value)} style={{ width: 200 }} />
          <button onClick={() => setCreating(true)} style={{
            background: 'var(--accent)', color: '#fff', border: 'none',
            borderRadius: 7, padding: '7px 16px', fontWeight: 600, cursor: 'pointer',
          }}>✦ New Skill</button>
          <button onClick={refetch} style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)', borderRadius: 7, padding: '7px 14px', cursor: 'pointer' }}>↻</button>
        </div>
      </div>

      {!skills?.length ? (
        <Card>
          <div style={{ color: 'var(--text3)', textAlign: 'center', padding: 40 }}>
            No skills directory found.<br />
            <span style={{ fontSize: 12, marginTop: 8, display: 'block' }}>
              Expected at ~/everything-claude-code/skills or ~/.claude/skills
            </span>
            <button onClick={() => setCreating(true)} style={{
              marginTop: 16, background: 'var(--accent)', color: '#fff', border: 'none',
              borderRadius: 7, padding: '8px 18px', fontWeight: 600, cursor: 'pointer',
            }}>✦ Create First Skill</button>
          </div>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          {filtered.map(skill => (
            <Card key={skill.id} style={{ padding: '14px 16px', cursor: 'pointer' }}
              onClick={() => setViewing(skill)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>✦ {skill.name}</div>
                <button
                  onClick={e => { e.stopPropagation(); deleteSkill(skill); }}
                  disabled={deleting === skill.id}
                  style={{
                    background: 'none', border: 'none', color: 'var(--text3)',
                    cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '2px 4px',
                    flexShrink: 0,
                  }}
                  title="Delete skill"
                >
                  {deleting === skill.id ? '…' : '🗑'}
                </button>
              </div>
              {skill.description && (
                <div style={{ color: 'var(--text3)', fontSize: 12, lineHeight: 1.4 }}>
                  {skill.description.slice(0, 90)}{skill.description.length > 90 ? '…' : ''}
                </div>
              )}
              <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
                <button
                  onClick={e => { e.stopPropagation(); setViewing(skill); }}
                  style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)', borderRadius: 5, padding: '3px 10px', fontSize: 11, cursor: 'pointer' }}
                >
                  Read
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {viewing && !editData && (
        <ViewModal
          skill={viewing}
          onClose={() => setViewing(null)}
          onEdit={data => { setEditData(data); setViewing(null); }}
        />
      )}

      {editData && (
        <EditModal
          skillData={editData}
          onClose={() => setEditData(null)}
          onSaved={() => { setEditData(null); refetch(); }}
        />
      )}

      {creating && (
        <CreateModal
          onClose={() => setCreating(false)}
          onCreated={() => { setCreating(false); refetch(); }}
        />
      )}
    </div>
  );
}
