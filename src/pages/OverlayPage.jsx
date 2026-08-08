import React, { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import confetti from 'canvas-confetti';
import { Volume2, Gift, MessageSquare, UserPlus, Heart, Share2, Radio, LogIn } from 'lucide-react';

export default function OverlayPage({ token: propToken }) {
  // Extract token from URL path (/overlay/TOKEN) or props
  const token = propToken || window.location.pathname.split('/overlay/')[1] || 'demo-overlay-token';

  const [currentEvent, setCurrentEvent] = useState(null);
  const [audioReady, setAudioReady] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [recentLog, setRecentLog] = useState([]);

  const audioQueueRef = useRef([]);
  const isPlayingRef = useRef(false);
  const socketRef = useRef(null);

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
    });

    socket.on('live_event', (eventData) => {
      console.log('[Overlay] Received event:', eventData);

      // Add to visual history
      setRecentLog((prev) => [eventData, ...prev.slice(0, 4)]);

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
          // Hide badge after idle timeout
          setTimeout(() => {
            if (audioQueueRef.current.length === 0) {
              setCurrentEvent(null);
            }
          }, 3500);
        }
      }, 500);
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
      window.speechSynthesis.cancel(); // Reset active speech
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
    // Play a silent audio buffer to unlock browser audio context
    const audio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
    audio.play().then(() => {
      setAudioReady(true);
    }).catch(() => setAudioReady(true));
  };

  return (
    <div style={{ position: 'fixed', inset: 0, padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', pointerEvents: 'none' }}>
      
      {/* OBS Audio Autoplay Unlock Prompt (Shows if user hasn't clicked canvas yet) */}
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

      {/* Active Speech / Event Visual Badge */}
      {currentEvent && (
        <div 
          style={{
            maxWidth: 480,
            background: currentEvent.type === 'gift' 
              ? 'linear-gradient(135deg, rgba(254, 44, 85, 0.95), rgba(139, 92, 246, 0.95))'
              : 'rgba(15, 17, 26, 0.92)',
            backdropFilter: 'blur(16px)',
            border: currentEvent.type === 'gift' ? '2px solid #25f4ee' : '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: 20,
            padding: '16px 20px',
            color: '#fff',
            boxShadow: currentEvent.type === 'gift' ? '0 10px 40px rgba(254, 44, 85, 0.6)' : '0 10px 30px rgba(0,0,0,0.5)',
            transform: 'translateY(0)',
            animation: 'slideUp 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            marginBottom: 16
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            {currentEvent.type === 'comment' && <MessageSquare size={20} color="#25f4ee" />}
            {currentEvent.type === 'member' && <LogIn size={20} color="#10b981" />}
            {currentEvent.type === 'gift' && <Gift size={24} color="#ffd700" className="animate-bounce" />}
            {currentEvent.type === 'follow' && <UserPlus size={20} color="#a855f7" />}
            {currentEvent.type === 'like' && <Heart size={20} color="#fe2c55" />}
            {currentEvent.type === 'share' && <Share2 size={20} color="#3b82f6" />}

            <span style={{ fontWeight: 800, fontSize: '1.05rem', color: currentEvent.type === 'gift' ? '#fff' : '#f8fafc' }}>
              {currentEvent.user}
            </span>

            {currentEvent.type === 'gift' && (
              <span style={{ background: '#ffd700', color: '#000', padding: '2px 8px', borderRadius: 12, fontWeight: 800, fontSize: '0.8rem' }}>
                GIFT
              </span>
            )}
          </div>

          <div style={{ fontSize: '1rem', fontWeight: 600, color: currentEvent.type === 'gift' ? '#fff' : '#e2e8f0', lineHeight: 1.4 }}>
            {currentEvent.text || currentEvent.speechText}
          </div>
        </div>
      )}

      {/* Mini Recent Log Feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 360, opacity: 0.85 }}>
        {recentLog.slice(0, 3).map((item) => (
          <div 
            key={item.id} 
            style={{ 
              background: 'rgba(0, 0, 0, 0.4)', 
              borderRadius: 10, 
              padding: '6px 12px', 
              fontSize: '0.82rem', 
              color: '#cbd5e1',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              backdropFilter: 'blur(4px)'
            }}
          >
            <span style={{ color: '#25f4ee', fontWeight: 700 }}>{item.user}:</span>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.text || item.speechText}</span>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
