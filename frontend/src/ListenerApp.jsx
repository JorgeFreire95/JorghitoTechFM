import React, { useState, useRef, useEffect } from 'react';
import { useRadio } from './RadioContext';

const ListenerApp = () => {
    const { isLive, isPaused, currentSong, audioURL, news, subscribeToAudio, volume } = useRadio();
    const audioRef = useRef(null);
    const liveAudioRef = useRef(null);
    const mediaSourceRef = useRef(null);
    const sourceBufferRef = useRef(null);
    const queueRef = useRef([]);

    // Music Player Control
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
            if (isPaused || isLive) {
                audioRef.current.pause();
            } else {
                audioRef.current.play().catch(err => console.log("Auto-play blocked:", err));
            }
        }
    }, [isPaused, isLive, audioURL, volume]);

    // Live Streaming Control (MSE)
    useEffect(() => {
        if (isLive) {
            const ms = new MediaSource();
            mediaSourceRef.current = ms;

            if (liveAudioRef.current) {
                liveAudioRef.current.src = URL.createObjectURL(ms);
                liveAudioRef.current.volume = volume;
            }

            const onSourceOpen = () => {
                try {
                    const sb = ms.addSourceBuffer('audio/webm; codecs=opus');
                    sourceBufferRef.current = sb;

                    sb.addEventListener('updateend', () => {
                        if (queueRef.current.length > 0 && !sb.updating && ms.readyState === 'open') {
                            sb.appendBuffer(queueRef.current.shift());
                        }
                    });
                } catch (e) {
                    console.error("Error adding source buffer:", e);
                }
            };

            ms.addEventListener('sourceopen', onSourceOpen);

            const unsubscribe = subscribeToAudio((chunk) => {
                if (sourceBufferRef.current && !sourceBufferRef.current.updating && ms.readyState === 'open') {
                    try {
                        sourceBufferRef.current.appendBuffer(chunk);
                    } catch (e) {
                        queueRef.current.push(chunk);
                    }
                } else {
                    queueRef.current.push(chunk);
                }

                if (liveAudioRef.current && liveAudioRef.current.paused) {
                    liveAudioRef.current.play().catch(() => { });
                }
            });

            return () => {
                unsubscribe();
                ms.removeEventListener('sourceopen', onSourceOpen);
                if (ms.readyState === 'open') ms.endOfStream();
            };
        }
    }, [isLive, subscribeToAudio, volume]);

    return (
        <div className="container">
            <header style={{ marginBottom: '3rem', textAlign: 'center' }}>
                <h1 style={{ fontSize: '3rem', color: 'var(--accent-color)' }}>JorghitoTech FM</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Tu radio online con estilo</p>
            </header>

            <div className="glass" style={{ padding: '2.5rem', marginBottom: '3rem', textAlign: 'center' }}>
                <div style={{ marginBottom: '1.5rem' }}>
                    {isLive ? (
                        <span style={{
                            background: '#ef4444',
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>En Vivo</span>
                    ) : (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Reproduciendo ahora</span>
                    )}
                </div>

                <h2 style={{ fontSize: '2rem', marginBottom: '2rem' }}>
                    {isLive ? 'Transmisión en Directo' : (currentSong || 'Sintonizando...')}
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginBottom: '2.5rem' }}>
                    <div style={{ width: '100%', maxWidth: '500px' }}>
                        {/* Hidden Live Audio Element */}
                        <audio ref={liveAudioRef} style={{ display: 'none' }} />

                        {audioURL && audioURL.includes('youtube.com') ? (
                            <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <p style={{ marginBottom: '0.5rem' }}>📺 Video detectado</p>
                                <a href={audioURL} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ fontSize: '0.8rem' }}>
                                    VER EN YOUTUBE
                                </a>
                            </div>
                        ) : (
                            <audio ref={audioRef} key={audioURL} controls style={{ width: '100%', borderRadius: '30px' }}>
                                <source src={audioURL} type="audio/mpeg" />
                            </audio>
                        )}
                    </div>

                    <div style={{ width: '100%', maxWidth: '300px', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '15px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            🔊 Volumen Global: {Math.round(volume * 100)}%
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                    {[...Array(15)].map((_, i) => (
                        <div key={i} className={`bar ${isLive ? 'active' : ''}`} style={{
                            width: '4px',
                            height: '20px',
                            background: 'var(--accent-color)',
                            borderRadius: '2px',
                            animation: (isLive || (currentSong && !isPaused)) ? `pulse 1s ease-in-out infinite ${i * 0.1}s` : 'none'
                        }}></div>
                    ))}
                </div>
            </div>

            <section>
                <h3 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>Noticias Recientes</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {news.map(item => (
                        <div key={item.id} className="glass" style={{ padding: '1.5rem' }}>
                            <h4 style={{ marginBottom: '0.5rem' }}>{item.title}</h4>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>{item.content}</p>
                            <small style={{ color: 'var(--accent-color)' }}>{new Date(item.created_at).toLocaleDateString()}</small>
                        </div>
                    ))}
                    {news.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No hay noticias por ahora.</p>}
                </div>
            </section>

            <style>{`
        @keyframes pulse {
            0%, 100% { height: 20px; opacity: 0.5; }
            50% { height: 40px; opacity: 1; }
        }
      `}</style>
        </div>
    );
};

export default ListenerApp;
