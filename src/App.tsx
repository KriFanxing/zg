import { useState, useRef, useEffect, useCallback } from 'react'
import './App.css'

type AgentStatus = 'idle' | 'going' | 'working' | 'reporting' | 'done'
type ViewTab = 'new' | 'history'

interface TaskRecord {
  id: string
  task: string
  timestamp: string
  duration: string
  report: string
}

interface Agent {
  id: string
  name: string
  role: string
  skill: string
  color: string
  x: number
  y: number
  angle: number
  emoji: string
}

const AGENTS: Agent[] = [
  { id: 'agent1', name: '小搜', role: '搜索专家', skill: '信息检索与数据采集', color: '#00d4ff', x: 50, y: 50, angle: -45, emoji: '🔍' },
  { id: 'agent2', name: '小研', role: '研究员', skill: '深度分析与洞察提炼', color: '#7c3aed', x: 50, y: 50, angle: 45, emoji: '📊' },
  { id: 'agent3', name: '小写', role: '写作师', skill: '内容创作与表达优化', color: '#06d6a0', x: 50, y: 50, angle: 135, emoji: '✍️' },
  { id: 'agent4', name: '小审', role: '审核员', skill: '质量把控与逻辑校验', color: '#ff6b6b', x: 50, y: 50, angle: -135, emoji: '👀' },
]

const AGENT_RESULTS: Record<string, string> = {
  agent1: '✅ 信息采集完毕',
  agent2: '✅ 数据分析完成',
  agent3: '✅ 报告撰写完成',
  agent4: '✅ 审核校验通过',
}

function AnimatedOrb() {
  return (
    <div className="orb-container">
      <div className="orb-core"/>
      <div className="orb-ring orb-ring-1"/>
      <div className="orb-ring orb-ring-2"/>
      <div className="orb-ring orb-ring-3"/>
      <div className="orb-particles">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="particle" style={{ '--i': i } as React.CSSProperties}/>
        ))}
      </div>
      <div className="orb-label">MARVIS</div>
    </div>
  )
}

function AgentOrb({ agent, status, onClick }: { agent: Agent; status: AgentStatus; onClick: () => void }) {
  return (
    <div
      className={`agent-orb-root status-${status}`}
      style={{ '--agent-color': agent.color } as React.CSSProperties}
      onClick={onClick}
    >
      <div className="agent-orb-outer"/>
      <div className="agent-orb-inner">
        <div className="agent-orb-avatar">{agent.emoji}</div>
        <div className="agent-orb-name">{agent.name}</div>
        <div className="agent-orb-role">{agent.role}</div>
      </div>
      <div className="agent-status-badge" style={{ '--c': agent.color } as React.CSSProperties}>
        {status === 'idle' ? '💤' : status === 'going' ? '🏃' : status === 'working' ? '⚙️' : status === 'reporting' ? '📢' : '✅'}
      </div>
      <svg className="connection-line" viewBox="0 0 100 100" preserveAspectRatio="none">
        <line x1="50" y1="50" x2="50" y2="50" stroke={agent.color} strokeWidth="0.3" strokeDasharray="2 2" opacity="0.3"/>
      </svg>
    </div>
  )
}

function TaskCard({ task, index, total }: { task: string; index: number; total: number }) {
  return (
    <div className="task-card" style={{ animationDelay: `${index * 0.15}s` }}>
      <div className="tc-index">{index + 1}/{total}</div>
      <div className="tc-text">{task}</div>
      <div className="tc-status-dot"/>
    </div>
  )
}

function App() {
  const [tab, setTab] = useState<ViewTab>('new')
  const [taskInput, setTaskInput] = useState('')
  const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentStatus>>(
    Object.fromEntries(AGENTS.map(a => [a.id, 'idle']))
  )
  const [taskActive, setTaskActive] = useState(false)
  const [taskText, setTaskText] = useState('')
  const [finalReport, setFinalReport] = useState('')
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; type: string; url: string; size: number }[]>([])
  const [taskHistory, setTaskHistory] = useState<TaskRecord[]>(() => {
    try { return JSON.parse(localStorage.getItem('marvis_history') || '[]') } catch { return [] }
  })
  const [phase, setPhase] = useState<'idle' | 'dispatch' | 'executing' | 'synthesizing'>('idle')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const startTimeRef = useRef<number>(0)

  const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

  const runTask = useCallback(async () => {
    if (!taskInput.trim()) return
    const task = taskInput.trim()
    setTaskInput('')
    startTimeRef.current = Date.now()
    setTaskActive(true)
    setFinalReport('')
    setPhase('dispatch')
    setAgentStatuses(Object.fromEntries(AGENTS.map(a => [a.id, 'idle'])))

    await delay(800)

    setPhase('executing')
    setAgentStatuses(Object.fromEntries(AGENTS.map(a => [a.id, 'working'])))
    await delay(2500)

    setAgentStatuses(Object.fromEntries(AGENTS.map(a => [a.id, 'done'])))
    setPhase('synthesizing')
    await delay(1800)

    const dur = ((Date.now() - startTimeRef.current) / 1000).toFixed(1)
    const r = `📋 任务完成报告\n━━━━━━━━━━━━━━━━━\n📌：「${task}」\n⏱ 用时：${dur}s\n\n✅ 小搜：全网信息检索完成\n✅ 小研：数据洞察整理完成\n✅ 小写：报告撰写完成\n✅ 小审：质量审核通过\n\n🎉 任务执行完毕，所有 Agent 已返回。`
    setFinalReport(r)
    setPhase('idle')
    setAgentStatuses(Object.fromEntries(AGENTS.map(a => [a.id, 'done'])))

    const rec: TaskRecord = {
      id: Date.now().toString(),
      task,
      timestamp: new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
      duration: dur + 's',
      report: r,
    }
    const nh = [rec, ...taskHistory].slice(0, 50)
    setTaskHistory(nh)
    localStorage.setItem('marvis_history', JSON.stringify(nh))
    setTaskActive(false)
  }, [taskInput, taskHistory])

  const resetAll = () => {
    setAgentStatuses(Object.fromEntries(AGENTS.map(a => [a.id, 'idle'])))
    setTaskActive(false)
    setFinalReport('')
    setTaskText('')
    setPhase('idle')
    setUploadedFiles([])
  }

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setUploadedFiles(prev => [...prev, ...files.map(f => ({
      name: f.name,
      type: f.type.startsWith('image/') ? 'image' : f.type.startsWith('video/') ? 'video' : 'file',
      url: URL.createObjectURL(f),
      size: f.size,
    }))])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="app">
      {/* ===== MAIN BG ===== */}
      <div className="main-bg">
        <div className="bg-grid"/>
        <div className="bg-glow bg-glow-1"/>
        <div className="bg-glow bg-glow-2"/>
        <div className="bg-glow bg-glow-3"/>

        {/* Top bar */}
        <div className="top-bar">
          <div className="top-logo">🤖 MARVIS OS</div>
          <div className="top-time" id="clock">00:00:00</div>
          <div className="top-status">
            <div className="top-dot"/>
            <span>系统正常</span>
          </div>
        </div>

        {/* Central Orb + Agents */}
        <div className="center-stage">
          {/* Connection lines */}
          <svg className="conn-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            {AGENTS.map((a, i) => {
              const rad = (a.angle * Math.PI) / 180
              const ex = 50 + 42 * Math.cos(rad)
              const ey = 50 + 42 * Math.sin(rad)
              return (
                <line
                  key={a.id}
                  x1="50" y1="50"
                  x2={ex.toFixed(1)} y2={ey.toFixed(1)}
                  stroke={a.color}
                  strokeWidth="0.4"
                  strokeDasharray={agentStatuses[a.id] === 'idle' ? '1 3' : '2 1'}
                  opacity={agentStatuses[a.id] !== 'idle' ? '0.7' : '0.2'}
                  className={`conn-line conn-${agentStatuses[a.id]}`}
                />
              )
            })}
          </svg>

          {/* Central AI Orb */}
          <div className="central-orb-wrapper">
            <AnimatedOrb/>
            {phase !== 'idle' && (
              <div className="phase-ring">
                <div className="phase-text">
                  {phase === 'dispatch' ? '📨 任务分发中' : phase === 'executing' ? '⚙️ 执行中' : '🧠 汇总整合中'}
                </div>
              </div>
            )}
          </div>

          {/* Agent orbs */}
          {AGENTS.map((a, i) => {
            const rad = (a.angle * Math.PI) / 180
            const px = 50 + 42 * Math.cos(rad)
            const py = 50 + 42 * Math.sin(rad)
            return (
              <div
                key={a.id}
                className={`agent-orb-wrapper status-${agentStatuses[a.id]}`}
                style={{ left: `${px}%`, top: `${py}%`, '--agent-color': a.color } as React.CSSProperties}
              >
                <div className={`ao-node ${agentStatuses[a.id] !== 'idle' ? 'active' : ''}`}>
                  <div className="ao-ring"/>
                  <div className="ao-core">
                    <div className="ao-avatar">{a.emoji}</div>
                    <div className="ao-label">{a.name}</div>
                    <div className="ao-role">{a.role}</div>
                  </div>
                  {agentStatuses[a.id] !== 'idle' && (
                    <div className="ao-status-indicator">
                      {agentStatuses[a.id] === 'working' && '⚙️'}
                      {agentStatuses[a.id] === 'done' && '✅'}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Bottom: agent skill cards */}
        <div className="agent-skills-bar">
          {AGENTS.map(a => (
            <div key={a.id} className="skill-chip">
              <div className="sc-dot" style={{ background: a.color }}/>
              <div className="sc-info">
                <div className="sc-name">{a.name}</div>
                <div className="sc-skill">{a.skill}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== RIGHT PANEL ===== */}
      <div className="right-panel">
        <div className="panel-header">
          <div className="ph-title">🏢 智能体协作平台</div>
          <div className="ph-sub">Multi-Agent Orchestration</div>
        </div>

        <div className="tab-bar">
          <button className={`tab-btn ${tab === 'new' ? 'active' : ''}`} onClick={() => setTab('new')}>
            📝 新任务
          </button>
          <button className={`tab-btn ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
            📜 历史
            {taskHistory.length > 0 && <span className="tab-badge">{taskHistory.length}</span>}
          </button>
        </div>

        {tab === 'new' ? (
          <>
            <div className="panel-section">
              <div className="section-label">📌 任务描述</div>
              <textarea
                className="task-input"
                placeholder="输入任务描述，Enter 发送..."
                value={taskInput}
                onChange={e => setTaskInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); runTask() } }}
                disabled={taskActive}
              />
              <div className="btn-row">
                <button className="btn-send" onClick={runTask} disabled={taskActive || !taskInput.trim()}>
                  {taskActive ? '⏳ 执行中...' : '🚀 发送任务'}
                </button>
                <button className="btn-reset" onClick={resetAll} disabled={taskActive}>🔄 重置</button>
              </div>
            </div>

            <div className="panel-section">
              <div className="section-label">📎 附件</div>
              <div className="upload-zone" onClick={() => fileInputRef.current?.click()}>
                <div className="upload-icon">📂</div>
                <div className="upload-text">点击上传</div>
                <div className="upload-hint">图片 / 视频 / 文档</div>
                <input ref={fileInputRef} type="file" multiple accept="image/*,video/*,.pdf,.doc,.docx,.txt" style={{ display: 'none' }} onChange={handleFiles}/>
              </div>
              {uploadedFiles.length > 0 && (
                <div className="file-list">
                  {uploadedFiles.map((f, i) => (
                    <div key={i} className="file-item">
                      {f.type === 'image' && <img src={f.url} alt={f.name} className="file-thumb"/>}
                      {f.type === 'video' && <video src={f.url} className="file-thumb" muted/>}
                      {f.type === 'file' && <div className="file-icon">📄</div>}
                      <div className="file-info">
                        <div className="file-name">{f.name}</div>
                        <div className="file-size">{f.size > 1024*1024 ? (f.size/1024/1024).toFixed(1)+' MB' : (f.size/1024).toFixed(1)+' KB'}</div>
                      </div>
                      <button className="file-remove" onClick={() => setUploadedFiles(p => p.filter((_,x)=>x!==i))}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {agentStatuses && Object.values(agentStatuses).some(s => s !== 'idle') && (
              <div className="panel-section">
                <div className="section-label">👥 执行状态</div>
                <div className="status-grid">
                  {AGENTS.map(a => (
                    <div key={a.id} className={`status-card ${agentStatuses[a.id]}`} style={{ borderColor: agentStatuses[a.id] !== 'idle' ? a.color : 'transparent' }}>
                      <div className="sc-emoji">{a.emoji}</div>
                      <div className="sc-name2">{a.name}</div>
                      <div className="sc-status" style={{ color: agentStatuses[a.id] === 'working' ? a.color : agentStatuses[a.id] === 'done' ? '#10b981' : '#6b7280' }}>
                        {agentStatuses[a.id] === 'idle' ? '💤' : agentStatuses[a.id] === 'going' ? '🏃' : agentStatuses[a.id] === 'working' ? '⚙️' : agentStatuses[a.id] === 'reporting' ? '📢' : '✅'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {finalReport && (
              <div className="panel-section">
                <div className="section-label boss-label">👑 任务报告</div>
                <pre className="report-text">{finalReport}</pre>
              </div>
            )}
          </>
        ) : (
          <div className="panel-section history-section">
            {taskHistory.length === 0 ? (
              <div className="history-empty">
                <div className="he-icon">📭</div>
                <div className="he-text">暂无历史记录</div>
              </div>
            ) : (
              <div className="history-list">
                {taskHistory.map((rec, i) => (
                  <div key={rec.id} className="history-item">
                    <div className="hi-top">
                      <div className="hi-task">{rec.task}</div>
                      {i === 0 && <span className="hi-new">最新</span>}
                    </div>
                    <div className="hi-meta">
                      <span>🕐 {rec.timestamp}</span>
                      <span>⏱ {rec.duration}</span>
                      <span className="hi-ok">✅ 完成</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default App