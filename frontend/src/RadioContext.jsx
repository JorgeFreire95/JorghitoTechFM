import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const RadioContext = createContext();

export const RadioProvider = ({ children }) => {
  const [isLive, setIsLive] = useState(false);
  const [currentSong, setCurrentSong] = useState(null);
  const [audioURL, setAudioURL] = useState(null);
  const [news, setNews] = useState([]);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
  const wsRef = useRef(null);

  useEffect(() => {
    // Fetch News
    fetch('http://localhost:8001/news')
      .then(res => res.json())
      .then(data => setNews(data))
      .catch(err => console.error("Error fetching news:", err));

    // WebSocket Connection
    const ws = new WebSocket('ws://localhost:8001/ws/listener');
    wsRef.current = ws;

    ws.onmessage = (event) => {
      if (typeof event.data === 'string') {
        const data = JSON.parse(event.data);
        if (data.type === 'state') {
          setIsLive(data.is_live);
          setCurrentSong(data.current_song);
          if (data.current_song) {
            setAudioURL(`http://localhost:8001/music/${data.current_song}#t=${data.elapsed}`);
          }
        } else if (data.type === 'live_status') {
          setIsLive(data.status);
        }
      }
    };

    return () => ws.close();
  }, []);

  const login = async (username, password) => {
    const res = await fetch('http://localhost:8001/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (res.ok) {
      const data = await res.json();
      setUser(data);
      localStorage.setItem('user', JSON.stringify(data));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  return (
    <RadioContext.Provider value={{ isLive, currentSong, audioURL, news, setNews, user, login, logout }}>
      {children}
    </RadioContext.Provider>
  );
};

export const useRadio = () => useContext(RadioContext);
