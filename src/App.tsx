import React, { useState, useRef, useEffect, useCallback } from 'react';
import './App.css';

// ─── Types ───────────────────────────────────────────────────────────────────

type AgentId = 1 | 2 | 3 | 4;
type AgentState = 'idle' | 'walk-to-boss' | 'at-boss' | 'walk-to-desk' | 'work' | 'report' | 'done';
type PanelTab = 'task' | 'history';

interface AgentConfig {
  name: string;
  deskX: string; deskY: string;
  fur: string; innerEar: string; nose: string;
}

interface TaskEntry { id: number; text: string; ts: string; }

const AGENTS: Record<AgentId, AgentConfig> = {
  1: { name: '小搜', deskX: '14%', deskY: '44%', fur: '#E8E8E8', innerEar: '#FFB8B8', nose: '#FF9B9B' },
  2: { name: '小研', deskX: '14%', deskY: '72%', fur: '#8B5CF6', innerEar: '#C4B5FD', nose: '#D8B4FE' },
  3: { name: '小写', deskX: '86%', deskY: '44%', fur: '#FBBF24', innerEar: '#FDE68A', nose: '#F59E0B' },
  4: { name: '小审', deskX: '86%', deskY: '72%', fur: '#1A1A1A', innerEar: '#555555', nose: '#666666' },
};

const BOSS_POS = { left: '50%', top: '24%' };

const AGENT_STATES: AgentState[] = ['idle', 'walk-to-boss', 'at-boss', 'walk-to-desk', 'work', 'report', 'done'];

const STATE_LABELS: Record<AgentState, string> = {
  idle: '待命中', 'walk-to-boss': '前往汇报', 'at-boss': '汇报中', 'walk-to-desk': '返回工位',
  work: '工作中', report: '提交结果', done: '已完成',
};

const WORK_MS   = 2800;
const REPORT_MS  = 2200;
const PAUSE_MS  = 700;

// ─── Cat SVG ─────────────────────────────────────────────────────────────────

interface CatSVGProps { fur: string; innerEar: string; nose: string; crown?: boolean; small?: boolean; }

const CatSVG: React.FC<CatSVGProps> = ({ fur, innerEar, nose, crown, small }) => {
  const s = small ? 0.6 : 1;
  return (
    <svg viewBox="0 0 100 100" style={{ width: `${80 * s}px`, height: `${80 * s}px` }} overflow="visible">
      {/* Crown */ }
      {crown && (
        <g>
          <polygon points="50,2 44,18 35,12 42,28 58,28 65,12 56,18" fill="#FFD700" stroke="#DAA520" strokeWidth="1"/>
          <circle cx="50" cy="5"  r="3" fill="#FFD700" stroke="#DAA520" strokeWidth="0.5"/>
          <circle cx="42" cy="12" r="2" fill="#FFD700" stroke="#DAA520" strokeWidth="0.5"/>
          <circle cx="58" cy="12" r="2" fill="#FFD700" stroke="#DAA520" strokeWidth="0.5"/>
        </g>
      )}
      {/* Body */ }
      <ellipse cx="50" cy="72" rx="22" ry="18" fill={fur} stroke={fur} strokeWidth="2"/>
      {/* Tail */}
      <path d="M 68 72 Q 88 60 82 45" fill="none" stroke={fur} strokeWidth="6" strokeLinecap="round"/>
      {/* Head */}
      <circle cx="50" cy="48" r="22" fill={fur} stroke={fur} strokeWidth="2"/>
      {/* Ears */}
      <polygon points="32,32 28,14 42,28"  fill={fur} stroke={fur} strokeWidth="1"/>
      <polygon points="68,32 72,14 58,28"  fill={fur} stroke={fur} strokeWidth="1"/>
      <polygon points="32,32 28,14 42,28"  fill={innerEar} opacity="0.8"/>
      <polygon points="68,32 72,14 58,28"  fill={innerEar} opacity="0.8"/>
      {/* Eyes */}
      <ellipse cx="41" cy="45" rx="5" ry="6" fill="#222"/>
      <ellipse cx="59" cy="45" rx="5" ry="6" fill="#222"/>
      <ellipse cx="41" cy="44" rx="2" ry="3" fill="#fff" opacity="0.9"/>
      <ellipse cx="59" cy="44" rx="2" ry="3" fill="#fff" opacity="0.9"/>
      {/* Nose */}
      <ellipse cx="50" cy="54" rx="4" ry="3" fill={nose}/>
      {/* Mouth */}
      <path d="M 46 58 Q 50 62 54 58" fill="none" stroke={nose} strokeWidth="1.5" strokeLinecap="round"/>
      {/* Whiskers */}
      <line x1="20" y1="50" x2="38" y2="52" stroke="#ccc" strokeWidth="0.8" opacity="0.7"/>
      <line x1="20" y1="55" x2="38" y2="55" stroke="#ccc" strokeWidth="0.8" opacity="0.7"/>
      <line x1="62" y1="52" x2="80" y2="50" stroke="#ccc" strokeWidth="0.8" opacity="0.7"/>
      <line x1="62" y1="55" x2="80" y2="55" stroke="#ccc" strokeWidth="0.8" opacity="0.7"/>
      {/* Front paws */}
      <ellipse cx="40" cy="86" rx="8" ry="5" fill={fur}/>
      <ellipse cx="60" cy="86" rx="8" ry="5" fill={fur}/>
    </svg>
  );
};

// ─── Desk SVG ────────────────────────────────────────────────────────────────

const DeskSVG: React.FC<{ computerOn?: boolean }> = ({ computerOn }) => (
  <svg viewBox="0 0 120 80" style={{ width: '100px', height: '67px' }} overflow="visible">
    {/* Desk surface */}
    <rect x="5" y="30" width="110" height="8" rx="2" fill="#8B6914" stroke="#6B4F12" strokeWidth="1"/>
    {/* Desk legs */}
    <rect x="10" y="38" width="8" height="36" rx="1" fill="#7A5C10"/>
    <rect x="102" y="38" width="8" height="36" rx="1" fill="#7A5C10"/>
    {/* Monitor */}
    <rect x="38" y="8" width="44" height="28" rx="3" fill="#333" stroke="#555" strokeWidth="1"/>
    <rect x="41" y="11" width="38" height="22" rx="1" fill={computerOn ? '#1a2a3a' : '#111'}/>
    {computerOn && <rect x="41" y="11" width="38" height="22" rx="1" fill="#0d1f2d"/> }
    {computerOn && (
      <>
        <rect x="43" y="13" width="34" height="2" rx="1" fill="#4a9eff" opacity="0.6"/>
        <rect x="43" y="17" width="20" height="2" rx="1" fill="#4a9eff" opacity="0.4"/>
        <rect x="43" y="21" width="26" height="2" rx="1" fill="#4a9eff" opacity="0.4"/>
      </>
    )}
    {/* Monitor stand */}
    <rect x="57" y="36" width="6" height="6" fill="#555"/>
    <rect x="50" y="40" width="20" height="4" rx="1" fill="#444"/>
    {/* Keyboard */}
    <rect x="40" y="43" width="40" height="8" rx="1" fill="#ccc" stroke="#aaa" strokeWidth="0.5"/>
  </svg>
);

// ─── Main App ─────────────────────────────────────────────────────────────────

const App: React.FC = () => {
  const [panelOpen,  setPanelOpen]  = useState(false);
  const [panelTab,   setPanelTab]   = useState<PanelTab>('task');
  const [taskText,   setTaskText]   = useState('');
  const [history,    setHistory]    = useState<TaskEntry[]>([]);
  const [uploadName, setUploadName] = useState<string | null>(null);
  const [uploadContent, setUploadContent] = useState<string>('');
  const fileRef = useRef<HTMLInputElement>(null);

  const [states, setStates] = useState<Record<AgentId, AgentState>>({ 1: 'idle', 2: 'idle', 3: 'idle', 4: 'idle' });
  const timersRef = useRef<Record<AgentId, ReturnType<typeof setTimeout> | null>>({ 1: null, 2: null, 3: null, 4: null });

  // Cleanup on unmount
  useEffect(() => () => {
    (Object.values(timersRef.current) as ReturnType<typeof setTimeout>[]).forEach(t => t && clearTimeout(t));
  }, []);

  const runAgentSequence = useCallback((id: AgentId) => {
    const delay = (ms: number) => new Promise<void>(r => {
      timersRef.current[id] = setTimeout(r, ms);
    });

    const seq = async () => {
      setStates(s => ({ ...s, [id]: 'walk-to-boss' }));
      await delay(900);

      setStates(s => ({ ...s, [id]: 'at-boss' }));
      await delay(PAUSE_MS);

      setStates(s => ({ ...s, [id]: 'walk-to-desk' }));
      await delay(900);

      setStates(s => ({ ...s, [id]: 'work' }));
      await delay(WORK_MS);

      setStates(s => ({ ...s, [id]: 'report' }));
      await delay(REPORT_MS);

      setStates(s => ({ ...s, [id]: 'done' }));
    };

    seq();
  }, []);

  const sendTask = useCallback(() => {
    const text = taskText.trim() || '默认任务';
    const entry: TaskEntry = { id: Date.now(), text, ts: new Date().toLocaleTimeString('zh-CN') };
    setHistory(h => [entry, ...h]);
    setTaskText('');
    if (fileRef.current) fileRef.current.value = '';

    const agents: AgentId[] = [1, 2, 3, 4];
    // Stagger agents slightly
    agents.forEach((id, i) => {
      const baseDelay = i * 250;
      setTimeout(() => runAgentSequence(id), baseDelay);
    });
  }, [taskText, runAgentSequence]);

  const resetAll = useCallback(() => {
    (Object.values(timersRef.current) as ReturnType<typeof setTimeout>[]).forEach(t => t && clearTimeout(t));
    timersRef.current = { 1: null, 2: null, 3: null, 4: null };
    setStates({ 1: 'idle', 2: 'idle', 3: 'idle', 4: 'idle' });
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadName(file.name);
    const reader = new FileReader();
    reader.onload = ev => setUploadContent(ev.target?.result as string || '');
    reader.readAsText(file);
  };

  // Agent pixel positions (viewport units)
  const agentPos: Record<AgentId, { left: string; top: string }> = {
    1: { left: AGENTS[1].deskX, top: AGENTS[1].deskY },
    2: { left: AGENTS[2].deskX, top: AGENTS[2].deskY },
    3: { left: AGENTS[3].deskX, top: AGENTS[3].deskY },
    4: { left: AGENTS[4].deskX, top: AGENTS[4].deskY },
  };

  // Walking = non-idle, non-done states
  const isWalking = (st: AgentState) => st === 'walk-to-boss' || st === 'walk-to-desk';
  const isWorking = (st: AgentState) => st === 'work';
  const isReporting = (st: AgentState) => st === 'report';
  const isAtBoss = (st: AgentState) => st === 'at-boss';
  const isDone = (st: AgentState) => st === 'done';

  // Determine visual position for each agent based on state
  const getAgentLeft = (id: AgentId, st: AgentState): string => {
    if (st === 'walk-to-boss' || st === 'at-boss') return BOSS_POS.left;
    return agentPos[id].left;
  };
  const getAgentTop = (id: AgentId, st: AgentState): string => {
    if (st === 'walk-to-boss' || st === 'at-boss') return BOSS_POS.top;
    return agentPos[id].top;
  };

  const STATE_COLORS: Record<AgentState, string> = {
    idle: '#aaa', 'walk-to-boss': '#60a5fa', 'at-boss': '#f59e0b',
    'walk-to-desk': '#60a5fa', work: '#34d399', report: '#a78bfa', done: '#10b981',
  };

  const STATE_ICONS: Record<AgentState, string> = {
    idle: '💤', 'walk-to-boss': '🚶', 'at-boss': '🗣️',
    'walk-to-desk': '🚶', work: '⌨️', report: '📋', done: '✅',
  };

  return (
    <div className="app-root">

      {/* ── Office Scene ── */}
      <div className="scene">
        {/* Floor */}
        <div className="floor" />
        {/* Rug */}
        <div className="rug" />
        {/* Wall decorations */}
        <div className="wall-frame wall-frame-1"><div className="frame-inner">📋</div></div>
        <div className="wall-frame wall-frame-2"><div className="frame-inner">📅</div></div>
        <div className="wall-frame wall-frame-3"><div className="frame-inner">🏆</div></div>

        {/* Boss cat */}
        <div
          className={`cat-entity boss-cat ${isAtBoss(states[1]||'idle')||isAtBoss(states[2]||'idle')||isAtBoss(states[3]||'idle')||isAtBoss(states[4]||'idle') ? 'boss-active' : ''}`}
          style={{ left: BOSS_POS.left, top: BOSS_POS.top }}
        >
          <div className="cat-sprite">
            <CatSVG fur="#F5A623" innerEar="#FFD0A0" nose="#FF6B6B" crown />
          </div>
          <div className="cat-label boss-label">🐱 猫老板</div>
        </div>

        {/* Agent cats */}
        {([1, 2, 3, 4] as AgentId[]).map(id => {
          const cfg = AGENTS[id];
          const st  = states[id];
          return (
            <div
              key={id}
              className={`cat-entity agent-cat agent-${id} ${isWalking(st) ? 'walking' : ''} ${isWorking(st) ? 'working' : ''} ${isReporting(st) ? 'reporting' : ''} ${isDone(st) ? 'done' : ''}`}
              style={{
                left: getAgentLeft(id, st),
                top:  getAgentTop(id, st),
                transition: `left 0.9s cubic-bezier(0.4,0,0.2,1), top 0.9s cubic-bezier(0.4,0,0.2,1)`,
              }}
            >
              <div className="cat-sprite">
                <CatSVG fur={cfg.fur} innerEar={cfg.innerEar} nose={cfg.nose} small />
              </div>
              <div className="cat-label">{cfg.name}</div>
            </div>
          );
        })}

        {/* Desks */}
        {([1, 2] as AgentId[]).map(id => (
          <div key={`desk-left-${id}`} className="desk-entity" style={{ left: AGENTS[id].deskX, top: AGENTS[id].deskY }}>
            <DeskSVG computerOn={isWorking(states[id])} />
          </div>
        ))}
        {([3, 4] as AgentId[]).map(id => (
          <div key={`desk-right-${id}`} className="desk-entity" style={{ left: AGENTS[id].deskX, top: AGENTS[id].deskY }}>
            <DeskSVG computerOn={isWorking(states[id])} />
          </div>
        ))}

        {/* Walk path indicator (subtle dotted line) */}
        <svg className="walk-path-svg" viewBox="0 0 100 100" preserveAspectRatio="none" overflow="visible">
          <defs>
            <marker id="arrowhead" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto">
              <polygon points="0 0, 4 2, 0 4" fill="#fff" opacity="0.3"/>
            </marker>
          </defs>
        </svg>
      </div>

      {/* ── Collapsible Panel ── */}
      <div className={'panel-wrapper' + (panelOpen ? ' panel-open' : '')}>
        <div className="panel-toggle">
          <button className="pt-btn" onClick={() => setPanelOpen(o => !o)}>
            {panelOpen ? '▶' : '◀'} 任务
          </button>
        </div>

        <div className="panel-body">
          <div className="panel-hdr">
            <div className="ph-title">🐱 Marvis Office</div>
            <div className="ph-sub">Multi-Agent · 任务编排</div>
          </div>

          <div className="panel-tabs">
            <button className={'pt-tab' + (panelTab === 'task' ? ' active' : '')} onClick={() => setPanelTab('task')}>📌 任务</button>
            <button className={'pt-tab' + (panelTab === 'history' ? ' active' : '')} onClick={() => setPanelTab('history')}>
              📜 历史{history.length > 0 && <span className="tab-badge">{history.length}</span>}
            </button>
          </div>

          <div className="panel-scroll">
            {panelTab === 'task' && (
              <div className="cp-section">
                <label className="cp-label">📋 任务描述</label>
                <textarea
                  className="cp-textarea"
                  placeholder="输入任务内容，例如：写一份市场调研报告…"
                  value={taskText}
                  onChange={e => setTaskText(e.target.value)}
                  rows={4}
                />

                <label className="cp-label" style={{ marginTop: '12px' }}>📎 附件（可选）</label>
                <div className="cp-file-wrap">
                  <button className="cp-btn-secondary" onClick={() => fileRef.current?.click()}>选择文件</button>
                  <input ref={fileRef} type="file" accept=".txt,.md,.doc,.docx,.pdf" onChange={handleFileChange} style={{ display: 'none' }} />
                  {uploadName && <span className="cp-filename">{uploadName}</span>}
                </div>
                {uploadContent && (
                  <div className="cp-preview">
                    <div className="cp-label">📄 文件预览</div>
                    <div className="cp-preview-content">{uploadContent.slice(0, 200)}{uploadContent.length > 200 ? '…' : ''}</div>
                  </div>
                )}

                <button className="cp-btn-primary" onClick={sendTask} disabled={taskText.trim() === '' && !uploadName}>
                  🚀 发送任务
                </button>
                <button className="cp-btn-secondary" onClick={resetAll}>🔄 重置</button>
              </div>
            )}

            {panelTab === 'history' && (
              <div className="cp-section">
                {history.length === 0 ? (
                  <div className="cp-empty">暂无任务记录</div>
                ) : (
                  <div className="cp-history-list">
                    {history.map(entry => (
                      <div key={entry.id} className="cp-history-item">
                        <div className="cp-history-ts">{entry.ts}</div>
                        <div className="cp-history-text">{entry.text}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Status Grid (floating bottom-left) ── */}
      <div className="status-grid">
        {([1, 2, 3, 4] as AgentId[]).map(id => {
          const st = states[id];
          return (
            <div key={id} className={`status-card status-${st.replace(/-/g, '_')}`} style={{ borderLeftColor: STATE_COLORS[st] }}>
              <div className="status-icon">{STATE_ICONS[st]}</div>
              <div className="status-info">
                <div className="status-name">{AGENTS[id].name}</div>
                <div className="status-state" style={{ color: STATE_COLORS[st] }}>{STATE_LABELS[st]}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default App;
