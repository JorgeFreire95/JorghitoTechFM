import React, { useState } from 'react'
import { RadioProvider, useRadio } from './RadioContext'
import ListenerApp from './ListenerApp'
import AdminPanel from './AdminPanel'
import Login from './Login'

function AppContent() {
    const [view, setView] = useState('listener')
    const { user, logout } = useRadio()

    const handleAdminClick = () => {
        setView('admin')
    }

    return (
        <>
            <nav style={{ padding: '1rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                <button
                    onClick={() => setView('listener')}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: view === 'listener' ? 'var(--accent-color)' : 'white',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                    }}
                >
                    Oyente
                </button>
                <button
                    onClick={handleAdminClick}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: (view === 'admin' || view === 'login') ? 'var(--accent-color)' : 'white',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                    }}
                >
                    Administrador
                </button>
                {user && (
                    <button
                        onClick={logout}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            marginLeft: '1rem'
                        }}
                    >
                        Cerrar Sesión
                    </button>
                )}
            </nav>

            {view === 'listener' && <ListenerApp />}

            {view === 'admin' && (
                !user ? <Login onSuccess={() => setView('admin')} /> : <AdminPanel />
            )}
        </>
    )
}

function App() {
    return (
        <RadioProvider>
            <AppContent />
        </RadioProvider>
    )
}

export default App
