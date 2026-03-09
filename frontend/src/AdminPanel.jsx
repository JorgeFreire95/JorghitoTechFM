import React, { useState, useRef } from 'react';
import { useRadio } from './RadioContext';

const AdminPanel = () => {
    const { isLive, setNews } = useRadio();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isBroadcasting, setIsBroadcasting] = useState(false);
    const mediaRecorderRef = useRef(null);
    const wsRef = useRef(null);

    const handleSubmitNews = async (e) => {
        e.preventDefault();
        const res = await fetch('http://localhost:8001/news', {
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
            const ws = new WebSocket('ws://localhost:8001/ws/admin');
            wsRef.current = ws;

            ws.onopen = async () => {
                ws.send(JSON.stringify({ type: 'start_live' }));
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const recorder = new MediaRecorder(stream);
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

    return (
        <div className="container">
            <h1 style={{ marginBottom: '2rem' }}>Panel de Administrador</h1>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
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
                                background: isBroadcasting ? '#ef4444' : 'var(--accent-color)'
                            }}
                        >
                            {isBroadcasting ? 'DETENER EN VIVO' : 'INICIAR EN VIVO'}
                        </button>
                        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>
                            {isBroadcasting ? 'Transmitiendo ahora...' : 'Listo para iniciar'}
                        </p>
                    </div>
                </section>

                <section className="glass" style={{ padding: '2rem' }}>
                    <h2 style={{ marginBottom: '1.5rem' }}>Agregar Noticia</h2>
                    <form onSubmit={handleSubmitNews}>
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Título</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid var(--glass-border)',
                                    color: 'white'
                                }}
                            />
                        </div>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Contenido</label>
                            <textarea
                                rows="4"
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid var(--glass-border)',
                                    color: 'white'
                                }}
                            />
                        </div>
                        <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                            Publicar Noticia
                        </button>
                    </form>
                </section>
            </div>
        </div>
    );
};

export default AdminPanel;
