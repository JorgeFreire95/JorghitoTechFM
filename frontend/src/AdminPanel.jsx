import React, { useState, useRef } from 'react';
import { useRadio } from './RadioContext';

const AdminPanel = () => {
    const { isLive, isPaused, togglePause, nextSong, prevSong, setNews, volume, changeGlobalVolume } = useRadio();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isBroadcasting, setIsBroadcasting] = useState(false);
    const mediaRecorderRef = useRef(null);
    const wsRef = useRef(null);

    const handleSubmitNews = async (e) => {
        e.preventDefault();
        const res = await fetch('http://127.0.0.1:8000/news', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, content })
        });
        if (res.ok) {
            const newNews = await res.json();
            setNews(prev => [newNews, ...prev]);
            setTitle('');
            setContent('');
        }
    };

    const toggleLive = async () => {
        if (!isBroadcasting) {
            // Start Live
            const ws = new WebSocket('ws://127.0.0.1:8000/ws/admin');
            wsRef.current = ws;

            ws.onopen = async () => {
                ws.send(JSON.stringify({ type: 'start_live' }));
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm; codecs=opus' });
                mediaRecorderRef.current = recorder;

                recorder.ondataavailable = (e) => {
                    if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
                        ws.send(e.data);
                    }
                };
                recorder.start(100); // Send chunks every 100ms
                setIsBroadcasting(true);
            };
        } else {
            // Stop Live
            if (wsRef.current) {
                wsRef.current.send(JSON.stringify({ type: 'stop_live' }));
                wsRef.current.close();
            }
            if (mediaRecorderRef.current) {
                mediaRecorderRef.current.stop();
                mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            }
            setIsBroadcasting(false);
        }
    };

    const [musicList, setMusicList] = useState([]);
    const [musicTitle, setMusicTitle] = useState('');
    const [musicArtist, setMusicArtist] = useState('');
    const [musicUrl, setMusicUrl] = useState('');
    const [musicFile, setMusicFile] = useState(null);
    const [musicType, setMusicType] = useState('file'); // 'file', 'youtube'
    
    React.useEffect(() => {
        fetchMusic();
    }, []);

    const fetchMusic = async () => {
        const res = await fetch('http://127.0.0.1:8000/music');
        if (res.ok) {
            const data = await res.json();
            setMusicList(data);
        }
    };

    const handleUploadMusic = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('title', musicTitle);
        formData.append('artist', musicArtist);
        formData.append('file', musicFile);

        const res = await fetch('http://127.0.0.1:8000/music/upload', {
            method: 'POST',
            body: formData
        });

        if (res.ok) {
            const newMusic = await res.json();
            setMusicList(prev => [newMusic, ...prev]);
            resetMusicForm();
        }
    };

    const handleAddLink = async (e) => {
        e.preventDefault();
        const res = await fetch('http://127.0.0.1:8000/music/link', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: musicTitle,
                artist: musicArtist,
                type: musicType,
                url: musicUrl
            })
        });

        if (res.ok) {
            const newMusic = await res.json();
            setMusicList(prev => [newMusic, ...prev]);
            resetMusicForm();
        }
    };

    const handleDeleteMusic = async (id) => {
        const res = await fetch(`http://127.0.0.1:8000/music/${id}`, {
            method: 'DELETE'
        });
        if (res.ok) {
            setMusicList(prev => prev.filter(m => m.id !== id));
        }
    };

    const handlePlayMusic = async (id) => {
        await fetch(`http://127.0.0.1:8000/music/${id}/play`, {
            method: 'POST'
        });
    };

    const resetMusicForm = () => {
        setMusicTitle('');
        setMusicArtist('');
        setMusicUrl('');
        setMusicFile(null);
    };

    return (
        <div className="container">
            <h1 style={{ marginBottom: '2rem' }}>Panel de Administrador</h1>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                {/* Emisión Component */}
                <section className="glass" style={{ padding: '2rem' }}>
                    <h2 style={{ marginBottom: '1.5rem' }}>Control de Emisión</h2>
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎙️</div>
                        <button
                            onClick={toggleLive}
                            className="btn btn-primary"
                            style={{
                                width: '100%',
                                justifyContent: 'center',
                                background: isBroadcasting ? '#ef4444' : 'var(--accent-color)',
                                marginBottom: '1.5rem',
                                fontWeight: 'bold'
                            }}
                        >
                            {isBroadcasting ? '🛑 DETENER EN VIVO' : '🎙️ INICIAR EN VIVO'}
                        </button>

                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                            <button onClick={prevSong} className="btn" style={{ flex: 1, padding: '0.75rem' }} title="Anterior">
                                ⏮️
                            </button>
                            <button
                                onClick={() => togglePause(!isPaused)}
                                className="btn"
                                style={{
                                    flex: 2,
                                    justifyContent: 'center',
                                    background: isPaused ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)',
                                    color: isPaused ? 'white' : 'var(--text-primary)',
                                    border: '1px solid rgba(255,255,255,0.2)'
                                }}
                            >
                                {isPaused ? '▶️ REANUDAR' : '⏸️ PAUSAR'}
                            </button>
                            <button onClick={nextSong} className="btn" style={{ flex: 1, padding: '0.75rem' }} title="Siguiente">
                                ⏭️
                            </button>
                        </div>

                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.8rem' }}>
                                <span>Volumen Monitor</span>
                                <span>{Math.round(volume * 100)}%</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={volume}
                                onChange={(e) => changeGlobalVolume(parseFloat(e.target.value))}
                                style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--accent-color)' }}
                            />
                        </div>

                        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            {isBroadcasting ? '🔴 En el aire...' : (isPaused ? '⏸️ Música en espera' : '🟢 Listo para emitir')}
                        </p>
                    </div>
                </section>

                {/* Noticias Component */}
                <section className="glass" style={{ padding: '2rem' }}>
                    <h2 style={{ marginBottom: '1.5rem' }}>Agregar Noticia</h2>
                    <form onSubmit={handleSubmitNews}>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Título</label>
                            <input
                                type="text"
                                className="input-field"
                                value={title || ''}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Contenido</label>
                            <textarea
                                rows="4"
                                className="input-field"
                                value={content || ''}
                                onChange={(e) => setContent(e.target.value)}
                            />
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                            Publicar Noticia
                        </button>
                    </form>
                </section>

                {/* Gestión de Música */}
                <section className="glass" style={{ padding: '2rem', gridColumn: 'span 2' }}>
                    <h2 style={{ marginBottom: '1.5rem' }}>Gestión de Música</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem' }}>
                        <div>
                            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                                <button
                                    className={`btn ${musicType === 'file' ? 'btn-primary' : ''}`}
                                    onClick={() => setMusicType('file')}
                                    style={{ flex: 1, fontSize: '0.8rem' }}
                                >
                                    Archivo
                                </button>
                                <button
                                    className={`btn ${musicType === 'youtube' ? 'btn-primary' : ''}`}
                                    onClick={() => setMusicType('youtube')}
                                    style={{ flex: 1, fontSize: '0.8rem' }}
                                >
                                    YouTube
                                </button>
                            </div>

                            <form onSubmit={musicType === 'file' ? handleUploadMusic : handleAddLink}>
                                <div style={{ marginBottom: '1rem' }}>
                                    <label className="label">Título</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        value={musicTitle || ''}
                                        onChange={(e) => setMusicTitle(e.target.value)}
                                        required
                                    />
                                </div>
                                <div style={{ marginBottom: '1rem' }}>
                                    <label className="label">Artista</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        value={musicArtist || ''}
                                        onChange={(e) => setMusicArtist(e.target.value)}
                                    />
                                </div>

                                {musicType === 'file' ? (
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <label className="label">Archivo MP3</label>
                                        <input
                                            key="file-input"
                                            type="file"
                                            accept="audio/*"
                                            onChange={(e) => setMusicFile(e.target.files[0])}
                                            className="input-field"
                                            required
                                        />
                                    </div>
                                ) : (
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <label className="label">URL de {musicType}</label>
                                        <input
                                            key="url-input"
                                            type="url"
                                            className="input-field"
                                            placeholder={`https://${musicType}.com/...`}
                                            value={musicUrl || ''}
                                            onChange={(e) => setMusicUrl(e.target.value)}
                                            required
                                        />
                                    </div>
                                )}

                                <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                                    Agregar Música
                                </button>
                            </form>
                        </div>

                        <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                            <h3 style={{ marginBottom: '1rem', fontSize: '1rem', color: 'var(--text-secondary)' }}>Lista de Música</h3>
                            {musicList.length === 0 ? (
                                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginTop: '2rem' }}>No hay música agregada.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {musicList.map(music => (
                                        <div key={music.id} className="glass" style={{
                                            padding: '0.75rem 1rem',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            background: 'rgba(255,255,255,0.03)'
                                        }}>
                                            <div>
                                                <div style={{ fontWeight: '500' }}>{music.title}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                    {music.artist || 'Artista desconocido'} • {music.type.toUpperCase()}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button
                                                    onClick={() => handlePlayMusic(music.id)}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        color: 'var(--accent-color)',
                                                        cursor: 'pointer',
                                                        padding: '5px',
                                                        fontSize: '1.2rem'
                                                    }}
                                                    title="Reproducir ahora"
                                                >
                                                    ▶️
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteMusic(music.id)}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        color: '#ef4444',
                                                        cursor: 'pointer',
                                                        padding: '5px'
                                                    }}
                                                    title="Eliminar"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default AdminPanel;
