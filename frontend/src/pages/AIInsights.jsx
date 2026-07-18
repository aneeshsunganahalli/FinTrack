import { useEffect, useState, useRef } from 'react';
import { Bot, Send, Wifi, WifiOff, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { getLLMStatus, chatWithLLM } from '../lib/api';
import Spinner from '../components/Spinner';

const SUGGESTIONS = [
  'Summarize my spending this month',
  'Where can I cut costs?',
  'Am I saving enough based on my income?',
  'Which category do I overspend in most?',
  'Give me 3 tips to improve my finances',
];

export default function AIInsights() {
  const [status, setStatus] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    getLLMStatus()
      .then(r => setStatus(r.data))
      .catch(() => setStatus({ available: false }))
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(text) {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');
    setMessages(m => [...m, { role: 'user', text: msg }]);
    setLoading(true);
    try {
      const res = await chatWithLLM(msg, true);
      setMessages(m => [...m, { role: 'ai', text: res.data.response || 'No response received.' }]);
    } catch {
      setMessages(m => [...m, { role: 'ai', text: '⚠ Failed to get a response. Check Ollama is running.', error: true }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ai-page-wrapper">
      <div className="page-header ai-header">
        <div>
          <h1 className="page-title">AI Insights</h1>
          <p className="page-subtitle">Ask your local LLM about your finances</p>
        </div>
        {/* Status indicator */}
        {checking ? (
          <Spinner size={20} />
        ) : status?.available ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'rgba(0,208,156,0.1)', borderRadius: 99, border: '1px solid var(--border-accent)', fontSize: 13 }}>
            <Wifi size={14} color="var(--accent)" />
            <span style={{ color: 'var(--accent)' }}>{status.model} · Connected</span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'rgba(255,83,112,0.1)', borderRadius: 99, border: '1px solid rgba(255,83,112,0.3)', fontSize: 13 }}>
            <WifiOff size={14} color="var(--red)" />
            <span style={{ color: 'var(--red)' }}>Ollama not detected</span>
          </div>
        )}
      </div>

      {!status?.available && !checking && (
        <div className="alert alert-warning ai-alert" style={{ marginBottom: 24 }}>
          <strong>Ollama is not running.</strong> Start Ollama locally with{' '}
          <code style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: 4 }}>ollama serve</code>{' '}
          and configure the model in Settings. Chat is disabled until connected.
        </div>
      )}

      <div className="ai-layout">
        {/* Chat window */}
        <div className="card ai-chat-window">
          <h3 className="section-title ai-chat-header" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bot size={16} color="var(--accent)" /> Chat
          </h3>

          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="ai-welcome-state">
                <Sparkles size={36} style={{ opacity: 0.2, marginBottom: 12 }} />
                <span className="empty-text" style={{ fontSize: 18, fontWeight: 600 }}>Jarvis AI</span>
                <span style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Ask anything about your finances</span>
                <div className="ai-welcome-chips">
                  {SUGGESTIONS.map((s, i) => (
                    <button
                      key={i}
                      className="ai-suggestion-chip"
                      onClick={() => sendMessage(s)}
                      disabled={!status?.available || loading}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => {
              const cleanText = m.text ? m.text.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '') : '';
              return (
              <div key={i} className={`chat-msg ${m.role}`} style={m.error ? { borderColor: 'rgba(255,83,112,0.3)', color: 'var(--red)' } : {}}>
                {m.role === 'ai' && !m.error ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                    {cleanText}
                  </ReactMarkdown>
                ) : (
                  cleanText
                )}
              </div>
            )})}
            {loading && (
              <div className="chat-msg ai" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Spinner size={16} />
                <span style={{ color: 'var(--text-muted)' }}>Thinking…</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Pill input bar */}
          <div className="ai-input-area">
            <div className="ai-pill-input">
              <input
                className="ai-pill-field"
                placeholder={status?.available ? 'Ask about your spending…' : 'Ollama not connected'}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                disabled={!status?.available || loading}
              />
              <button
                className="ai-pill-send"
                onClick={() => sendMessage()}
                disabled={!status?.available || loading || !input.trim()}
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar Info (desktop only) */}
        <div className="ai-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="card">
            <h3 className="section-title" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={15} color="var(--accent)" /> Suggested Questions
            </h3>
            <div className="suggested-questions-list desktop-only">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  className="btn btn-ghost chip"
                  onClick={() => sendMessage(s)}
                  disabled={!status?.available || loading}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="section-title" style={{ marginBottom: 8 }}>How it works</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              FinTrack sends an <strong>aggregated summary</strong> of your financial data
              (not raw transactions) to your local Ollama model. No data leaves your machine.
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginTop: 8 }}>
              Configure the model URL and name in <strong>Settings</strong>.
              Default: <code style={{ background: 'var(--bg-input)', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>llama3 @ localhost:11434</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
