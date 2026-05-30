import React, { useState, useRef, useCallback, useEffect } from 'react';
import './App.css';

// ─── Types ───────────────────────────────────────────────────────────────────

type AgentId = 1 | 2 | 3 | 4;
type AgentState = 'idle' | 'walk-to-boss' | 'at-boss' | 'walk-to-desk' | 'work' | 'report' | 'done';
type PanelTab = 'task' | 'history';

interface AgentConfig {
  name: string; deskX: string; deskY: string;
  fur: string; innerEar: string; nose: string;
}

interface TaskEntry { id: number; text: string; ts: string; }

const AGENTS: Record<AgentId, AgentConfig> = {
  1: { name: '小搜', deskX: '14%', deskY: '44%', fur: '#E8E8E8', innerEar: '#FFB8B8', nose: '#FF9B9B' },
  2: { name: '小研', deskX: '14%', deskY: '64%', fur: '#8B5CF6', innerEar: '#C4B5FD', nose: '#D8B4FE' },
  3: { name: '小写', deskX: '86%', deskY: '44%', fur: '#FBBF24', innerEar: '#FDE68A', nose: '#F59E0B' },
  4: { name: '小审', deskX: '86%', deskY: '64%', fur: '#1A1A1A', innerEar: '#555555', nose: '#666666' },
};

const BOSS_POS = { left: '50%', top: '24%' };
const STATE_LABELS: Record<AgentState, string> = {
  idle:'待命中', 'walk-to-boss':'前往汇报', 'at-boss':'汇报中', 'walk-to-desk':'返回工位',
  work:'工作中', report:'提交结果', done:'已完成',
};
const STATE_ICONS: Record<AgentState, string> = {
  idle:'💤', 'walk-to-boss':'🚶', 'at-boss':'📋', 'walk-to-desk':'🚶',
  work:'💻', report:'📤', done:'✅',
};
const STATE_COLORS: Record<AgentState, string> = {
  idle:'#aaa', 'walk-to-boss':'#60a5fa', 'at-boss':'#f59e0b', 'walk-to-desk':'#60a5fa',
  work:'#34d399', report:'#a78bfa', done:'#10b981',
};
const WORK_MS = 2800, REPORT_MS = 2200, PAUSE_MS = 700;

// ─── Cat SVG ─────────────────────────────────────────────────────────────────

const CatSVG: React.FC<{fur:string; innerEar:string; nose:string; crown?:boolean; small?:boolean}> = ({ fur, innerEar, nose, crown, small }) => {
  const s = small ? 0.6 : 1;
  return (
    <svg viewBox="0 0 100 100" style={{width:`${80*s}px`,height:`${80*s}px`}} overflow="visible">
      {crown && <g>
        <polygon points="50,2 44,18 35,12 42,28 58,28 65,12 56,18" fill="#FFD700" stroke="#DAA520" strokeWidth="1"/>
        <circle cx="50" cy="5" r="3" fill="#FFD700" stroke="#DAA520" strokeWidth="0.5"/>
        <circle cx="42" cy="12" r="2" fill="#FFD700" stroke="#DAA520" strokeWidth="0.5"/>
        <circle cx="58" cy="12" r="2" fill="#FFD700" stroke="#DAA520" strokeWidth="0.5"/>
      </g>}
      <ellipse cx="50" cy="72" rx="22" ry="18" fill={fur}/>
      <path d="M 68 72 Q 88 60 82 45" fill="none" stroke={fur} strokeWidth="6" strokeLinecap="round"/>
      <circle cx="50" cy="48" r="22" fill={fur}/>
      <polygon points="32,32 28,14 42,28" fill={fur}/><polygon points="68,32 72,14 58,28" fill={fur}/>
      <polygon points="32,32 28,14 42,28" fill={innerEar} opacity="0.8"/><polygon points="68,32 72,14 58,28" fill={innerEar} opacity="0.8"/>
      <ellipse cx="41" cy="45" rx="5" ry="6" fill="#222"/><ellipse cx="59" cy="45" rx="5" ry="6" fill="#222"/>
      <ellipse cx="41" cy="44" rx="2" ry="3" fill="#fff" opacity="0.9"/><ellipse cx="59" cy="44" rx="2" ry="3" fill="#fff" opacity="0.9"/>
      <ellipse cx="50" cy="54" rx="4" ry="3" fill={nose}/>
      <path d="M 46 58 Q 50 62 54 58" fill="none" stroke={nose} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="20" y1="50" x2="38" y2="52" stroke="#ccc" strokeWidth="0.8" opacity="0.7"/>
      <line x1="20" y1="55" x2="38" y2="55" stroke="#ccc" strokeWidth="0.8" opacity="0.7"/>
      <line x1="62" y1="52" x2="80" y2="50" stroke="#ccc" strokeWidth="0.8" opacity="0.7"/>
      <line x1="62" y1="55" x2="80" y2="55" stroke="#ccc" strokeWidth="0.8" opacity="0.7"/>
      <ellipse cx="40" cy="86" rx="8" ry="5" fill={fur}/><ellipse cx="60" cy="86" rx="8" ry="5" fill={fur}/>
    </svg>
  );
};

// ─── Desk SVG ────────────────────────────────────────────────────────────────

const DeskSVG: React.FC<{computerOn?:boolean}> = ({ computerOn }) => (
  <svg viewBox="0 0 120 80" style={{width:'100px',height:'67px'}} overflow="visible">
    <rect x="5" y="30" width="110" height="8" rx="2" fill="#8B6914" stroke="#6B4F12" strokeWidth="1"/>
    <rect x="10" y="38" width="8" height="36" rx="1" fill="#7A5C10"/><rect x="102" y="38" width="8" height="36" rx="1" fill="#7A5C10"/>
    <rect x="38" y="8" width="44" height="28" rx="3" fill="#333" stroke="#555" strokeWidth="1"/>
    <rect x="41" y="11" width="38" height="22" rx="1" fill={computerOn ? '#0d1f2d' : '#111'}/>
    {computerOn && <><rect x="43" y="13" width="34" height="2" rx="1" fill="#4a9eff" opacity="0.6"/><rect x="43" y="17" width="20" height="2" rx="1" fill="#4a9eff" opacity="0.4"/><rect x="43" y="21" width="26" height="2" rx="1" fill="#4a9eff" opacity="0.4"/></>}
    <rect x="57" y="36" width="6" height="6" fill="#555"/><rect x="50" y="40" width="20" height="4" rx="1" fill="#444"/>
    <rect x="40" y="43" width="40" height="8" rx="1" fill="#ccc" stroke="#aaa" strokeWidth="0.5"/>
  </svg>
);

// ─── Bottom Sheet Panel ─────────────────────────────────────────────────────

interface BottomSheetProps {
  panelTab: PanelTab;
  setPanelTab: (t: PanelTab) => void;
  taskText: string; setTaskText: (t: string) => void;
  history: TaskEntry[];
  uploadName: string | null;
  fileRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  sendTask: () => void;
  resetAll: () => void;
  sheetOpen: boolean;
  setSheetOpen: (v: boolean) => void;
  sheetH: number;
  liveH: number;
  setLiveH: (h: number) => void;
  dragStartY: React.MutableRefObject<number>;
  dragStartH: React.MutableRefObject<number>;
}

const BottomSheet: React.FC<BottomSheetProps> = ({
  panelTab, setPanelTab, taskText, setTaskText, history, uploadName, fileRef, onFileChange,
  sendTask, resetAll, sheetOpen, setSheetOpen, sheetH, liveH, setLiveH, dragStartY, dragStartH,
}) => {
  const onPointerDown = (e: React.PointerEvent) => {
    dragStartY.current = e.clientY;
    dragStartH.current = liveH || sheetH;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const dy = dragStartY.current - e.clientY;
    setLiveH(Math.max(0, Math.min(dragStartH.current + dy, sheetH)));
  };
  const onPointerUp = () => {
    if (liveH < sheetH * 0.45) { setLiveH(0); setSheetOpen(false); }
    else { setLiveH(sheetH); setSheetOpen(true); }
  };
  const closeSheet = () => { setLiveH(0); setSheetOpen(false); };

  return (
    <div
      className={`bottom-sheet ${sheetOpen && liveH > 0 ? 'sheet-open' : ''}`}
      style={{ height: sheetOpen ? liveH || sheetH : 0 }}
    >
      {/* Drag Handle */}
      <div
        className="sheet-handle"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div className="handle-bar" />
      </div>

      {/* Header */}
      <div className="sheet-hdr">
        <div className="ph-left">
          <div className="ph-title">🐱 Marvis Office</div>
          <div className="ph-sub">Multi-Agent · 任务编排</div>
        </div>
        <button className="panel-close-btn" onClick={closeSheet}>✕</button>
      </div>

      {/* Tabs */}
      <div className="panel-tabs">
        <button className={`pt-tab ${panelTab==='task'?'active':''}`} onClick={()=>setPanelTab('task')}>📌 任务</button>
        <button className={`pt-tab ${panelTab==='history'?'active':''}`} onClick={()=>setPanelTab('history')}>
          📜 历史{history.length>0&&<span className="tab-badge">{history.length}</span>}
        </button>
      </div>

      {/* Content */}
      <div className="panel-scroll">
        {panelTab === 'task' && (
          <div className="cp-section">
            <label className="cp-label">📋 任务描述</label>
            <textarea className="cp-textarea" placeholder="输入任务内容，例如：写一份市场调研报告…" value={taskText} onChange={e=>setTaskText(e.target.value)} rows={4} />
            <label className="cp-label" style={{marginTop:'12px'}}>📎 附件（可选）</label>
            <div className="cp-file-wrap">
              <button className="cp-btn-secondary" onClick={()=>fileRef.current?.click()}>选择文件</button>
              <input ref={fileRef} type="file" accept=".txt,.md,.doc,.docx,.pdf" onChange={onFileChange} style={{display:'none'}} />
              {uploadName && <span className="cp-filename">{uploadName}</span>}
            </div>
            <div className="cp-btn-row">
              <button className="cp-btn-primary" onClick={sendTask} disabled={taskText.trim()===''&&!uploadName}>🚀 发送任务</button>
              <button className="cp-btn-secondary" onClick={resetAll}>🔄 重置</button>
            </div>
          </div>
        )}
        {panelTab === 'history' && (
          <div className="cp-section">
            {history.length===0 ? <div className="cp-empty">暂无任务记录</div> :
              history.map(e => <div key={e.id} className="cp-history-item"><div className="cp-history-ts">{e.ts}</div><div className="cp-history-text">{e.text}</div></div>)
            }
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main App ─────────────────────────────────────────────────────────────────

const App: React.FC = () => {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [panelTab, setPanelTab] = useState<PanelTab>('task');
  const [taskText, setTaskText] = useState('');
  const [history, setHistory] = useState<TaskEntry[]>([]);
  const [uploadName, setUploadName] = useState<string|null>(null);
  const [uploadContent, setUploadContent] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const dragStartY = useRef(0);
  const dragStartH = useRef(0);
  const sheetH = 380;

  const [liveH, setLiveH] = useState(0);
  const [states, setStates] = useState<Record<AgentId,AgentState>>({1:'idle',2:'idle',3:'idle',4:'idle'});
  const timersRef = useRef<Record<AgentId,ReturnType<typeof setTimeout>|null>>({1:null,2:null,3:null,4:null});

  useEffect(() => () => { (Object.values(timersRef.current) as ReturnType<typeof setTimeout>[]).forEach(t => t && clearTimeout(t)); }, []);

  const runAgentSequence = useCallback((id: AgentId) => {
    const delay = (ms: number) => new Promise<void>(r => { timersRef.current[id] = setTimeout(r, ms); });
    const seq = async () => {
      setStates(s => ({...s, [id]: 'walk-to-boss'})); await delay(900);
      setStates(s => ({...s, [id]: 'at-boss'})); await delay(PAUSE_MS);
      setStates(s => ({...s, [id]: 'walk-to-desk'})); await delay(900);
      setStates(s => ({...s, [id]: 'work'})); await delay(WORK_MS);
      setStates(s => ({...s, [id]: 'report'})); await delay(REPORT_MS);
      setStates(s => ({...s, [id]: 'done'}));
    };
    seq();
  }, []);

  const sendTask = useCallback(() => {
    const text = taskText.trim() || '默认任务';
    const entry: TaskEntry = { id: Date.now(), text, ts: new Date().toLocaleTimeString('zh-CN') };
    setHistory(h => [entry, ...h]);
    setTaskText('');
    if (fileRef.current) fileRef.current.value = '';
    ([1,2,3,4] as AgentId[]).forEach((id,i) => setTimeout(() => runAgentSequence(id), i*250));
  }, [taskText, runAgentSequence]);

  const resetAll = useCallback(() => {
    (Object.values(timersRef.current) as ReturnType<typeof setTimeout>[]).forEach(t => t && clearTimeout(t));
    timersRef.current = {1:null,2:null,3:null,4:null};
    setStates({1:'idle',2:'idle',3:'idle',4:'idle'});
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadName(file.name);
    const reader = new FileReader();
    reader.onload = ev => setUploadContent(ev.target?.result as string || '');
    reader.readAsText(file);
  };

  // Sync open state with liveH
  useEffect(() => {
    if (sheetOpen && liveH === 0) setLiveH(sheetH);
  }, [sheetOpen]);

  const getAgentPos = (id: AgentId, st: AgentState) => {
    const d = AGENTS[id];
    if (st === 'idle' || st === 'done' || st === 'work') return {l: d.deskX, t: d.deskY};
    if (['walk-to-boss','at-boss','walk-to-desk'].includes(st)) {
      const bossL = 50, bossT = 24;
      const deskL = parseFloat(d.deskX), deskT = parseFloat(d.deskY);
      return {l: `${(bossL+deskL)/2}%`, t: `${(bossT+deskT)/2}%`};
    }
    return {l: d.deskX, t: d.deskY};
  };
  const isWalking = (st: AgentState) => ['walk-to-boss','walk-to-desk'].includes(st);
  const isWorking = (st: AgentState) => st === 'work';
  const isReporting = (st: AgentState) => st === 'report';
  const isDone = (st: AgentState) => st === 'done';
  const isAtBoss = (st: AgentState) => st === 'at-boss';
  const isBossActive = () => [1,2,3,4].some(id => isAtBoss(states[id as AgentId]));

  return (
    <div className="app-root">
      {/* Office Scene */}
      <div className="scene">
        <div className="floor"/><div className="rug"/>
        <div className="wall-frame wall-frame-1"><div className="frame-inner">📋</div></div>
        <div className="wall-frame wall-frame-2"><div className="frame-inner">📅</div></div>
        <div className="wall-frame wall-frame-3"><div className="frame-inner">🏆</div></div>

        {/* Boss */}
        <div className={`cat-entity boss-cat ${isBossActive()?'boss-active':''}`} style={{left: BOSS_POS.left, top: BOSS_POS.top}}>
          <div className="cat-sprite"><CatSVG fur="#F5A623" innerEar="#FFD0A0" nose="#FF6B6B" crown /></div>
          <div className="cat-label boss-label">🐱 猫老板</div>
        </div>

        {/* Agent cats */}
        {([1,2,3,4] as AgentId[]).map(id => {
          const cfg = AGENTS[id]; const st = states[id]; const pos = getAgentPos(id, st);
          return (
            <div key={id}
              className={`cat-entity agent-cat agent-${id} ${isWalking(st)?'walking':''} ${isWorking(st)?'working':''} ${isReporting(st)?'reporting':''} ${isDone(st)?'done':''}`}
              style={{left: pos.l, top: pos.t, transition: 'left 0.9s cubic-bezier(0.4,0,0.2,1), top 0.9s cubic-bezier(0.4,0,0.2,1)'}}
            >
              <div className="cat-sprite"><CatSVG fur={cfg.fur} innerEar={cfg.innerEar} nose={cfg.nose} small /></div>
              <div className="cat-label">{cfg.name}</div>
            </div>
          );
        })}

        {/* Desks */}
        {([1,2,3,4] as AgentId[]).map(id => (
          <div key={`dk-${id}`} className="desk-entity" style={{left: AGENTS[id].deskX, top: AGENTS[id].deskY}}>
            <DeskSVG computerOn={isWorking(states[id])} />
          </div>
        ))}
      </div>

      {/* FAB — 悬浮按钮，永远显示 */}
      <button
        className={`fab ${sheetOpen ? 'fab-active' : ''}`}
        onClick={() => {
          if (sheetOpen) { setLiveH(0); setSheetOpen(false); }
          else { setLiveH(sheetH); setSheetOpen(true); }
        }}
      >
        {sheetOpen ? '✕' : '📋'}
      </button>

      {/* Bottom Sheet Panel */}
      <BottomSheet
        panelTab={panelTab} setPanelTab={setPanelTab}
        taskText={taskText} setTaskText={setTaskText}
        history={history} uploadName={uploadName} fileRef={fileRef as any}
        onFileChange={handleFileChange}
        sendTask={sendTask} resetAll={resetAll}
        sheetOpen={sheetOpen} setSheetOpen={setSheetOpen}
        sheetH={sheetH} liveH={liveH} setLiveH={setLiveH}
        dragStartY={dragStartY} dragStartH={dragStartH}
      />

      {/* Status Grid */}
      <div className="status-grid">
        {([1,2,3,4] as AgentId[]).map(id => {
          const st = states[id];
          return (
            <div key={id} className={`status-card status-${st.replace(/-/g,'_')}`} style={{borderLeftColor: STATE_COLORS[st]}}>
              <div className="status-icon">{STATE_ICONS[st]}</div>
              <div className="status-info">
                <div className="status-name">{AGENTS[id].name}</div>
                <div className="status-state" style={{color: STATE_COLORS[st]}}>{STATE_LABELS[st]}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default App;