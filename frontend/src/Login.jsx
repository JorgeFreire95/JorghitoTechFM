import React, { useState } from 'react';
import { useRadio } from './RadioContext';

const Login = ({ onSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useRadio();

    const handleSubmit = async (e) => {
        e.preventDefault();
        const success = await login(username, password);
        if (success) {
            onSuccess();
        } else {
            setError('Usuario o contraseña incorrectos');
        }
    };

    return (
        <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
            <div className="glass" style={{ padding: '3rem', width: '100%', maxWidth: '400px' }}>
                <h2 style={{ marginBottom: '2rem', textAlign: 'center', color: 'var(--accent-color)' }}>Acceso Admin</h2>

                <form onSubmit={handleSubmit}>
                    {error && <p style={{ color: '#ef4444', marginBottom: '1rem', textAlign: 'center', fontSize: '0.9rem' }}>{error}</p>}

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Usuario</label>
                        <input
                            type="text"
                            value={username || ''}
                            onChange={(e) => setUsername(e.target.value)}
                            className="glass"
                            style={{ width: '100%', padding: '12px', color: 'white' }}
                            required
                        />
                    </div>

                    <div style={{ marginBottom: '2rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Contraseña</label>
                        <input
                            type="password"
                            value={password || ''}
                            onChange={(e) => setPassword(e.target.value)}
                            className="glass"
                            style={{ width: '100%', padding: '12px', color: 'white' }}
                            required
                        />
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                        Entrar
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
