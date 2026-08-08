import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { 
  Radio, 
  Volume2, 
  Sliders, 
  Copy, 
  ExternalLink, 
  Play, 
  Square, 
  Check, 
  ShieldAlert, 
  Sparkles, 
  Gift, 
  MessageSquare, 
  UserPlus, 
  Heart, 
  Share2,
  RefreshCw,
  Zap,
  LogIn
} from 'lucide-react';

export default function Dashboard({ overlayToken, setOverlayToken }) {
  const [tiktokUsername, setTiktokUsername] = useState('');
  const [connectionState, setConnectionState] = useState({ status: 'disconnected', stats: { comments: 0, gifts: 0, follows: 0, likes: 0 } });
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [newWord, setNewWord] = useState('');

  // Configuration state
  const [config, setConfig] = useState({
    ttsProvider: 'google',
    language: 'vi',
    speed: 'normal',
    volume: 1,
    giftMinValue: 0,
    eventsEnabled: {
      comment: true,
      gift: true,
      follow: true,
      like: false,
      share: true
    },
    blockedWords: ['đụ', 'dm', 'cl', 'vcl', 'dcm', 'chửi']
  });

  const cleanToken = (overlayToken || 'demo-overlay-token').replace(/^\/+/, '');
  const overlayUrl = `${window.location.origin}/overlay/${cleanToken}`;

  useEffect(() => {
    fetchConfig();
    fetchStatus();

    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [overlayToken]);

  const fetchConfig = async () => {
    try {
      const data = await api.getConfig(overlayToken);
      if (data.success && data.config) {
        setConfig(data.config);
        if (data.config.tiktokUsername) {
          setTiktokUsername(data.config.tiktokUsername);
        }
      }
    } catch (e) {
      console.error('Failed to load config', e);
    }
  };

  const fetchStatus = async () => {
    try {
      const data = await api.getStatus(overlayToken);
      if (data.success) {
        setConnectionState(data);
      }
    } catch (e) {}
  };

  const handleSaveConfig = async (newConfigData) => {
    const updated = { ...config, ...newConfigData };
    setConfig(updated);
    try {
      await api.updateConfig(overlayToken, updated);
    } catch (e) {
      console.error('Failed to update config', e);
    }
  };

  const handleStartConnection = async () => {
    if (!tiktokUsername.trim()) {
      alert('Vui lòng nhập TikTok Username (ví dụ: @streamer_shop)');
      return;
    }
    setLoading(true);
    try {
      const res = await api.startConnection(overlayToken, tiktokUsername.trim());
      if (res.success) {
        fetchStatus();
      } else {
        alert(res.message || 'Kết nối thất bại');
      }
    } catch (e) {
      alert(e.message || 'Lỗi server khi kết nối TikTok');
    } finally {
      setLoading(false);
    }
  };

  const handleStopConnection = async () => {
    setLoading(true);
    try {
      await api.stopConnection(overlayToken);
      fetchStatus();
    } catch (e) {
      alert('Lỗi ngắt kết nối');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyOverlayUrl = () => {
    navigator.clipboard.writeText(overlayUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerateNewToken = async () => {
    if (confirm('Tạo URL Overlay mới? Bạn sẽ cần dán lại URL mới vào OBS Studio.')) {
      const res = await api.generateToken();
      if (res.success) {
        setOverlayToken(res.overlayToken);
      }
    }
  };

  const handleAddBlockedWord = () => {
    if (!newWord.trim()) return;
    const word = newWord.trim().toLowerCase();
    if (!config.blockedWords.includes(word)) {
      const updatedWords = [...config.blockedWords, word];
      handleSaveConfig({ blockedWords: updatedWords });
    }
    setNewWord('');
  };

  const handleRemoveBlockedWord = (wordToRemove) => {
    const updatedWords = config.blockedWords.filter(w => w !== wordToRemove);
    handleSaveConfig({ blockedWords: updatedWords });
  };

  const handleTriggerTest = async (eventType, customData = {}) => {
    try {
      await api.testEvent(overlayToken, eventType, customData);
    } catch (e) {
      console.error('Test event error:', e);
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 20px' }}>
      
      {/* Header Bar */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 24, fontWeight: 900 }} className="gradient-text">
              TikTok Live TTS Reader
            </span>
            <span style={{ background: 'rgba(254, 44, 85, 0.15)', color: '#fe2c55', fontSize: '0.75rem', fontWeight: 800, padding: '4px 10px', borderRadius: 20, border: '1px solid rgba(254, 44, 85, 0.3)' }}>
              OBS OVERLAY PRO
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>
            Tự động đọc bình luận, quà tặng & lượt tương tác TikTok Live bằng giọng nói tự nhiên
          </p>
        </div>

        {/* Status Badge */}
        <div className="glass-panel" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 12, borderRadius: 30 }}>
          <div className={connectionState.status === 'connected' ? 'pulse-live' : 'pulse-offline'} />
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: connectionState.status === 'connected' ? '#4ade80' : '#cbd5e1' }}>
            {connectionState.status === 'connected' ? `ĐANG LIVE: @${connectionState.username}` : connectionState.status === 'connecting' ? 'Đang kết nối...' : 'CHƯA KẾT NỐI'}
          </span>
        </div>
      </header>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24 }}>
        
        {/* Connection Control Card */}
        <div className="glass-panel" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Radio color="#fe2c55" size={22} />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Kết nối phòng TikTok Live</h2>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600 }}>
              TikTok Username (chủ phòng live)
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              <input 
                type="text" 
                className="glass-input" 
                placeholder="Ví dụ: @chushop_hanghieu" 
                value={tiktokUsername}
                onChange={(e) => setTiktokUsername(e.target.value)}
                disabled={connectionState.status === 'connected'}
              />

              {connectionState.status === 'connected' ? (
                <button className="btn-danger" onClick={handleStopConnection} disabled={loading}>
                  <Square size={16} /> Ngắt kết nối
                </button>
              ) : (
                <button className="btn-primary" onClick={handleStartConnection} disabled={loading}>
                  {loading ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />} 
                  Kết nối
                </button>
              )}
            </div>
          </div>

          {/* Live Session Counter */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, background: 'rgba(0,0,0,0.25)', padding: 12, borderRadius: 12, marginTop: 20 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Bình luận</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#25f4ee' }}>{connectionState.stats?.comments || 0}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Quà tặng</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fe2c55' }}>{connectionState.stats?.gifts || 0}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Follow</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#a855f7' }}>{connectionState.stats?.follows || 0}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Thả tim</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f59e0b' }}>{connectionState.stats?.likes || 0}</div>
            </div>
          </div>
        </div>

        {/* OBS Overlay Link Card */}
        <div className="glass-panel" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Sparkles color="#25f4ee" size={22} />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Đường dẫn OBS Overlay</h2>
          </div>

          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
            Dán đường dẫn này vào <b>Browser Source</b> trong OBS Studio hoặc TikTok LIVE Studio:
          </p>

          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input 
              type="text" 
              className="glass-input" 
              value={overlayUrl} 
              readOnly 
              style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: '#25f4ee' }}
            />
            <button className="btn-primary" onClick={handleCopyOverlayUrl}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Đã copy' : 'Copy'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <a 
              href={overlayUrl} 
              target="_blank" 
              rel="noreferrer" 
              className="btn-secondary"
              style={{ textDecoration: 'none', fontSize: '0.85rem' }}
            >
              <ExternalLink size={16} /> Mở tab Overlay xem thử
            </a>
            <button 
              className="btn-secondary"
              onClick={handleGenerateNewToken}
              style={{ fontSize: '0.85rem' }}
            >
              <RefreshCw size={16} /> Đổi Token mới
            </button>
          </div>
        </div>

        {/* Voice & Sound Settings */}
        <div className="glass-panel" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Volume2 color="#a855f7" size={22} />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Cấu hình Giọng đọc TTS</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>
                Nguồn đọc TTS (Engine)
              </label>
              <select 
                className="glass-input"
                value={config.ttsProvider}
                onChange={(e) => handleSaveConfig({ ttsProvider: e.target.value })}
              >
                <option value="google" style={{ background: '#12141d' }}>Google Cloud TTS (Tiếng Việt tự nhiên - Khuyên dùng)</option>
                <option value="webspeech" style={{ background: '#12141d' }}>Web Speech API (Phát trực tiếp tại browser)</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>
                  Ngôn ngữ
                </label>
                <select 
                  className="glass-input"
                  value={config.language}
                  onChange={(e) => handleSaveConfig({ language: e.target.value })}
                >
                  <option value="vi" style={{ background: '#12141d' }}>Tiếng Việt (VN)</option>
                  <option value="en" style={{ background: '#12141d' }}>Tiếng Anh (EN)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>
                  Tốc độ đọc
                </label>
                <select 
                  className="glass-input"
                  value={config.speed}
                  onChange={(e) => handleSaveConfig({ speed: e.target.value })}
                >
                  <option value="normal" style={{ background: '#12141d' }}>Bình thường (1.0x)</option>
                  <option value="slow" style={{ background: '#12141d' }}>Chậm (0.8x)</option>
                </select>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                <span>Âm lượng đọc OBS</span>
                <span>{Math.round((config.volume ?? 1) * 100)}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.05" 
                value={config.volume ?? 1}
                onChange={(e) => handleSaveConfig({ volume: parseFloat(e.target.value) })}
                style={{ width: '100%', accentColor: '#8b5cf6' }}
              />
            </div>
          </div>
        </div>

        {/* Event Rules & Gift Filters */}
        <div className="glass-panel" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Sliders color="#f59e0b" size={22} />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Bật/Tắt Sự kiện & Lọc Quà</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { key: 'comment', label: 'Đọc bình luận (Chat)', icon: <MessageSquare size={16} color="#25f4ee" /> },
              { key: 'member', label: 'Chào mừng người xem mới (Vào phòng)', icon: <LogIn size={16} color="#10b981" /> },
              { key: 'gift', label: 'Đọc quà tặng (Gifts)', icon: <Gift size={16} color="#fe2c55" /> },
              { key: 'follow', label: 'Đọc lượt theo dõi mới', icon: <UserPlus size={16} color="#a855f7" /> },
              { key: 'share', label: 'Đọc lượt chia sẻ live', icon: <Share2 size={16} color="#3b82f6" /> },
              { key: 'like', label: 'Đọc lượt thả tim (Likes)', icon: <Heart size={16} color="#ef4444" /> }
            ].map(item => (
              <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.9rem', fontWeight: 600 }}>
                  {item.icon}
                  {item.label}
                </div>
                <label className="toggle-switch">
                  <input 
                    type="checkbox" 
                    checked={!!config.eventsEnabled?.[item.key]}
                    onChange={(e) => {
                      const updatedEvents = { ...config.eventsEnabled, [item.key]: e.target.checked };
                      handleSaveConfig({ eventsEnabled: updatedEvents });
                    }}
                  />
                  <span className="slider" />
                </label>
              </div>
            ))}

            <div style={{ borderTop: '1px solid var(--border-light)', pt: 12, marginTop: 8 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>
                Ngưỡng giá trị Gift đọc (chỉ đọc quà từ X Xu trở lên)
              </label>
              <input 
                type="number" 
                className="glass-input"
                min="0"
                value={config.giftMinValue || 0}
                onChange={(e) => handleSaveConfig({ giftMinValue: parseInt(e.target.value) || 0 })}
                placeholder="Nhập số xu tối thiểu (VD: 5 xu)"
              />
            </div>
          </div>
        </div>

        {/* Sensitive Words Blacklist */}
        <div className="glass-panel" style={{ padding: 24, gridColumn: 'span 1' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <ShieldAlert color="#ef4444" size={22} />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Lọc từ nhạy cảm / Spam</h2>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <input 
              type="text" 
              className="glass-input" 
              placeholder="Nhập từ cần chặn..." 
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddBlockedWord()}
            />
            <button className="btn-secondary" onClick={handleAddBlockedWord}>Thêm</button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {config.blockedWords.map(word => (
              <span 
                key={word} 
                style={{ 
                  background: 'rgba(239, 68, 68, 0.15)', 
                  border: '1px solid rgba(239, 68, 68, 0.3)', 
                  color: '#fca5a5', 
                  padding: '4px 10px', 
                  borderRadius: 16, 
                  fontSize: '0.82rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                {word}
                <button 
                  onClick={() => handleRemoveBlockedWord(word)}
                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Live Test Sandbox */}
        <div className="glass-panel" style={{ padding: 24, gridColumn: 'span 1' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Zap color="#ffd700" size={22} />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Thử nghiệm giọng đọc Live</h2>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>
            Nhấn các nút bên dưới để phát âm thanh thử nghiệm trực tiếp lên OBS Overlay mà không cần phòng đang Live:
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button className="btn-secondary" onClick={() => handleTriggerTest('comment', { comment: 'Shop ơi áo này vải gì ạ?' })}>
              <MessageSquare size={14} color="#25f4ee" /> Test Comment 1
            </button>
            <button className="btn-secondary" onClick={() => handleTriggerTest('comment', { comment: 'Có miễn phí vận chuyển không shop?' })}>
              <MessageSquare size={14} color="#25f4ee" /> Test Comment 2
            </button>
            <button className="btn-secondary" onClick={() => handleTriggerTest('gift', { giftName: 'Hoa Hồng', repeatCount: 10 })}>
              <Gift size={14} color="#fe2c55" /> Test Gift x10
            </button>
            <button className="btn-secondary" onClick={() => handleTriggerTest('follow')}>
              <UserPlus size={14} color="#a855f7" /> Test Follow
            </button>
            <button className="btn-secondary" onClick={() => handleTriggerTest('member')}>
              <LogIn size={14} color="#10b981" /> Test Chào Mừng
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
