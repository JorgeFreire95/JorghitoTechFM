import React, { useState } from 'react';
import { useRadio } from './RadioContext';

const ListenerApp = () => {
    const { isLive, currentSong, audioURL, news } = useRadio();

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

                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
                    <audio key={audioURL} controls autoPlay style={{ width: '100%', maxWidth: '500px' }}>
                        <source src={audioURL} type="audio/mpeg" />
                        Your browser does not support the audio element.
                    </audio>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                    {[...Array(15)].map((_, i) => (
                        <div key={i} className={`bar ${isLive ? 'active' : ''}`} style={{
                            width: '4px',
                            height: '20px',
                            background: 'var(--accent-color)',
                            borderRadius: '2px',
                            animation: isLive || currentSong ? `pulse 1s ease-in-out infinite ${i * 0.1}s` : 'none'
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
