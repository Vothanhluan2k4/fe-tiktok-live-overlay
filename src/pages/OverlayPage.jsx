import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { 
  Volume2, 
  Gift, 
  MessageSquare, 
  UserPlus, 
  Heart, 
  Share2, 
  LogIn, 
  VolumeX,
  Sparkles,
  RefreshCw
} from 'lucide-react';

export default function OverlayPage({ token: propToken }) {
  // Extract token from URL path (/overlay/TOKEN) or props
  const token = propToken || window.location.pathname.split('/overlay/')[1] || 'demo-overlay-token';

  const [currentEvent, setCurrentEvent] = useState(null);
  const [audioReady, setAudioReady] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [recentLog, setRecentLog] = useState([]);
  const [overlayConfig, setOverlayConfig] = useState(null);
  const [syncNotice, setSyncNotice] = useState(null);

  const audioQueueRef = useRef([]);
  const isPlayingRef = useRef(false);
  const socketRef = useRef(null);
  const chatContainerRef = useRef(null);

  useEffect(() => {
    // Fetch initial config
    api.getConfig(token).then((res) => {
      if (res.success && res.config) {
        setOverlayConfig(res.config);
      }
    }).catch(() => {});
  }, [token]);

  useEffect(() => {
    // Add overlay-mode class to body for full transparency
    document.body.classList.add('overlay-mode');

    // Connect to Socket.IO backend
    const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const socket = io(serverUrl);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Overlay] Socket connected, joining token room:', token);
      socket.emit('join_overlay', token);
      setConnectionStatus('ready');
    });

    socket.on('connection_status', (data) => {
      setConnectionStatus(data.status);
      if (data.config) {
        setOverlayConfig(data.config);
      }
    });

    socket.on('config_updated', (data) => {
      console.log('[Overlay] Realtime config updated:', data.config);
      if (data.config) {
        setOverlayConfig(data.config);
        setSyncNotice('⚡ Cấu hình Overlay đã tự động cập nhật!');
        setTimeout(() => setSyncNotice(null), 3500);
      }
    });

    socket.on('reload_overlay', () => {
      console.log('[Overlay] Reloading overlay window...');
      window.location.reload();
    });

    socket.on('live_event', (eventData) => {
      console.log('[Overlay] Received event:', eventData);

      // Add to visual history - NEWEST AT THE BOTTOM (like YouTube Chat)
      setRecentLog((prev) => [...prev.slice(-9), eventData]);

      // Trigger Confetti on Gifts
      if (eventData.type === 'gift') {
        try {
          confetti({
            particleCount: Math.min(80, (eventData.repeatCount || 1) * 10),
            spread: 70,
            origin: { y: 0.8 }
          });
        } catch (e) {}
      }

      // Enqueue Audio
      audioQueueRef.current.push(eventData);
      processAudioQueue();
    });

    // Auto unlock audio on any user interaction anywhere on screen
    const handleInteraction = () => {
      unlockAudio();
    };
    window.addEventListener('click', handleInteraction);
    window.addEventListener('keydown', handleInteraction);
    window.addEventListener('pointerdown', handleInteraction);

    return () => {
      document.body.classList.remove('overlay-mode');
      socket.disconnect();
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('pointerdown', handleInteraction);
    };
  }, [token]);

  // Scroll to bottom whenever recentLog updates
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [recentLog, currentEvent]);

  // Audio Queue Processor
  const processAudioQueue = async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) {
      return;
    }

    isPlayingRef.current = true;
    const event = audioQueueRef.current.shift();
    setCurrentEvent(event);

    try {
      let played = false;
      if (event.audioUrl) {
        try {
          await playAudioUrl(event.audioUrl, event.volume ?? 1);
          played = true;
        } catch (err) {
          console.warn('[Overlay Audio Engine] Audio URL playback failed, falling back to Web Speech:', err.message);
        }
      }

      if (!played && event.speechText && 'speechSynthesis' in window) {
        await playWebSpeech(event.speechText, event.volume ?? 1);
      }
    } catch (err) {
      console.warn('[Overlay Audio Processing Error]:', err.message);
    } finally {
      // Small pause before playing next item
      setTimeout(() => {
        isPlayingRef.current = false;
        if (audioQueueRef.current.length > 0) {
          processAudioQueue();
        } else {
          // Hide active badge highlight after idle timeout
          setTimeout(() => {
            if (audioQueueRef.current.length === 0) {
              setCurrentEvent(null);
            }
          }, 3000);
        }
      }, 400);
    }
  };

  const playAudioUrl = (url, volume) => {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.src = url;
      audio.volume = Math.max(0, Math.min(1, volume));

      audio.onended = () => resolve();
      audio.onerror = () => reject(new Error('Sound URL failed to load'));

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((e) => reject(e));
      }
    });
  };

  const playWebSpeech = (text, volume) => {
    return new Promise((resolve) => {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'vi-VN';
      utterance.volume = Math.max(0, Math.min(1, volume));
      utterance.rate = 1.0;

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();

      window.speechSynthesis.speak(utterance);
    });
  };

  const unlockAudio = () => {
    const audio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
    audio.play().then(() => {
      setAudioReady(true);
    }).catch(() => setAudioReady(true));
  };

  // Helper to render user avatar or fallback initial
  const renderAvatar = (item) => {
    if (item.avatar) {
      return (
        <img 
          src={item.avatar} 
          alt={item.user} 
          style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid rgba(255,255,255,0.2)' }}
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      );
    }
    const initial = (item.user || '?').charAt(0).toUpperCase();
    return (
      <div style={{
        width: 34,
        height: 34,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #6366f1, #a855f7)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
        fontSize: '0.9rem',
        border: '1.5px solid rgba(255,255,255,0.2)'
      }}>
        {initial}
      </div>
    );
  };

  return (
    <div style={{ position: 'fixed', inset: 0, padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', pointerEvents: 'none' }}>
      
      {/* Realtime Config Sync Notice */}
      {syncNotice && (
        <div style={{ 
          position: 'absolute', 
          top: 20, 
          left: '50%', 
          transform: 'translateX(-50%)', 
          pointerEvents: 'none', 
          zIndex: 9999,
          background: 'linear-gradient(135deg, #25f4ee, #8b5cf6)',
          color: '#000',
          padding: '8px 18px',
          borderRadius: 20,
          fontWeight: 800,
          fontSize: '0.85rem',
          boxShadow: '0 4px 20px rgba(37, 244, 238, 0.5)',
          animation: 'youtubeSlideIn 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}>
          <Sparkles size={16} /> {syncNotice}
        </div>
      )}

      {/* OBS Audio Autoplay Unlock Prompt */}
      {!audioReady && (
        <div style={{ position: 'absolute', top: 20, right: 20, pointerEvents: 'auto', zIndex: 9999 }}>
          <button 
            onClick={unlockAudio}
            style={{
              background: 'linear-gradient(135deg, #fe2c55, #8b5cf6)',
              color: '#fff',
              border: 'none',
              borderRadius: 30,
              padding: '10px 20px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(254, 44, 85, 0.5)',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <Volume2 size={18} /> Bật âm thanh OBS Overlay
          </button>
        </div>
      )}

      {/* YOUTUBE LIVE CHAT STYLE OVERLAY FEED (Newest messages at the BOTTOM) */}
      <div 
        ref={chatContainerRef}
        style={{
          maxWidth: 440,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          gap: 10,
          maxHeight: '80vh',
          overflowY: 'hidden',
          paddingBottom: 8
        }}
      >
        {recentLog.map((item) => {
          const isSpeaking = currentEvent?.id === item.id;
          const isGift = item.type === 'gift';

          if (isGift) {
            // YouTube SuperChat Style Card for Gifts
            return (
              <div
                key={item.id}
                style={{
                  background: 'linear-gradient(135deg, rgba(234, 88, 12, 0.95), rgba(225, 29, 72, 0.95))',
                  backdropFilter: 'blur(16px)',
                  borderRadius: 16,
                  padding: 0,
                  overflow: 'hidden',
                  color: '#fff',
                  boxShadow: isSpeaking 
                    ? '0 8px 30px rgba(249, 115, 22, 0.7), 0 0 0 2px #ffd700' 
                    : '0 6px 24px rgba(0, 0, 0, 0.4)',
                  animation: 'youtubeSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                  transition: 'all 0.3s ease'
                }}
              >
                {/* SuperChat Header */}
                <div style={{
                  background: 'rgba(0, 0, 0, 0.25)',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.15)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {renderAvatar(item)}
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fff' }}>
                        {item.user}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#fef08a', fontWeight: 600 }}>
                        Đã tặng {item.giftName} x{item.repeatCount || 1}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {isSpeaking && (
                      <span style={{ 
                        background: '#ffd700', 
                        color: '#000', 
                        fontSize: '0.72rem', 
                        fontWeight: 800, 
                        padding: '2px 8px', 
                        borderRadius: 10,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}>
                        <Volume2 size={12} className="animate-pulse" /> ĐANG ĐỌC
                      </span>
                    )}
                    <Gift size={22} color="#ffd700" />
                  </div>
                </div>

                {/* SuperChat Body */}
                <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  {item.giftPictureUrl && (
                    <img 
                      src={item.giftPictureUrl} 
                      alt={item.giftName} 
                      style={{ width: 42, height: 42, objectFit: 'contain', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.4))' }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  )}
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, lineHeight: 1.3, color: '#fff' }}>
                    {item.text || item.speechText}
                  </div>
                </div>
              </div>
            );
          }

          // YouTube Live Chat Bubble style for Comments & other events
          return (
            <div
              key={item.id}
              style={{
                background: isSpeaking 
                  ? 'rgba(20, 24, 40, 0.96)' 
                  : 'rgba(15, 17, 26, 0.82)',
                backdropFilter: 'blur(12px)',
                border: isSpeaking 
                  ? '1.5px solid #25f4ee' 
                  : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 14,
                padding: '10px 14px',
                color: '#fff',
                boxShadow: isSpeaking 
                  ? '0 4px 20px rgba(37, 244, 238, 0.35)' 
                  : '0 4px 16px rgba(0, 0, 0, 0.3)',
                animation: 'youtubeSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                transition: 'all 0.3s ease'
              }}
            >
              {renderAvatar(item)}

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ 
                    fontWeight: 700, 
                    fontSize: '0.9rem', 
                    color: item.type === 'comment' ? '#25f4ee' : item.type === 'follow' ? '#c084fc' : '#38bdf8',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {item.user}
                  </span>

                  {item.type === 'follow' && (
                    <span style={{ background: 'rgba(168, 85, 247, 0.25)', color: '#d8b4fe', fontSize: '0.7rem', padding: '1px 6px', borderRadius: 6, fontWeight: 700 }}>
                      Follower
                    </span>
                  )}
                  {item.type === 'member' && (
                    <span style={{ background: 'rgba(16, 185, 129, 0.25)', color: '#6ee7b7', fontSize: '0.7rem', padding: '1px 6px', borderRadius: 6, fontWeight: 700 }}>
                      Member
                    </span>
                  )}
                  {item.type === 'like' && (
                    <span style={{ background: 'rgba(254, 44, 85, 0.25)', color: '#fda4af', fontSize: '0.7rem', padding: '1px 6px', borderRadius: 6, fontWeight: 700 }}>
                      Thả tim
                    </span>
                  )}
                  {item.type === 'share' && (
                    <span style={{ background: 'rgba(59, 130, 246, 0.25)', color: '#93c5fd', fontSize: '0.7rem', padding: '1px 6px', borderRadius: 6, fontWeight: 700 }}>
                      Chia sẻ
                    </span>
                  )}

                  {isSpeaking && (
                    <span style={{ 
                      marginLeft: 'auto',
                      color: '#25f4ee', 
                      fontSize: '0.72rem', 
                      fontWeight: 700, 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 4 
                    }}>
                      <Volume2 size={12} className="animate-pulse" /> TTS
                    </span>
                  )}
                </div>

                <div style={{ 
                  fontSize: '0.92rem', 
                  fontWeight: 500, 
                  color: '#f1f5f9', 
                  lineHeight: 1.4,
                  wordBreak: 'break-word' 
                }}>
                  {item.text || item.speechText}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes youtubeSlideIn {
          0% {
            opacity: 0;
            transform: translateY(24px) scale(0.96);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}

