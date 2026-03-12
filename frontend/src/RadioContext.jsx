import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const RadioContext = createContext();

export const RadioProvider = ({ children }) => {
  const [isLive, setIsLive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentSong, setCurrentSong] = useState(null);
  const [audioURL, setAudioURL] = useState(null);
  const [news, setNews] = useState([]);
  const [volume, setVolume] = useState(0.5);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
  const onAudioDataRef = useRef(null);

  useEffect(() => {
    // Fetch News
    fetch('http://127.0.0.1:8001/news')
      .then(res => res.json())
      .then(data => setNews(data))
      .catch(err => console.error("Error fetching news:", err));

    // WebSocket Connection
    const ws = new WebSocket('ws://127.0.0.1:8001/ws/listener');
    ws.binaryType = 'arraybuffer';

    ws.onmessage = (event) => {
      if (typeof event.data === 'string') {
        const data = JSON.parse(event.data);
        if (data.type === 'state') {
          setIsLive(data.is_live);
          setVolume(data.volume);

          setIsPaused(prevPaused => {
            const song = data.current_song;
            if (song && song.type === 'file') {
              const newURL = `http://127.0.0.1:8001${song.path_or_url}#t=${data.elapsed}`;

              // Only update URL if song changed OR if we just unpaused
              setAudioURL(prevURL => {
                const songChanged = !prevURL || !prevURL.includes(song.path_or_url);
                const justUnpaused = prevPaused && !data.is_paused;

                if (songChanged || justUnpaused) {
                  return newURL;
                }
                return prevURL;
              });
            } else if (song && (song.type === 'stream' || song.type === 'youtube')) {
              setAudioURL(song.path_or_url);
            } else {
              setAudioURL(null); // Clear audioURL if no song or unknown type
            }
            return data.is_paused;
          });

          if (data.current_song) {
            setCurrentSong(`${data.current_song.title} - ${data.current_song.artist}`);
          } else {
            setCurrentSong(null);
          }
        } else if (data.type === 'live_status') {
          setIsLive(data.status);
        }
      } else {
        // Binary data (Live Mic)
        if (onAudioDataRef.current) {
          onAudioDataRef.current(event.data);
        }
      }
    };

    return () => ws.close();
  }, []);

  const login = React.useCallback(async (username, password) => {
    const res = await fetch('http://127.0.0.1:8001/login', {
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
  }, []);

  const togglePause = React.useCallback(async (paused) => {
    await fetch('http://127.0.0.1:8001/music/toggle-pause', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paused })
    });
  }, []);

  const nextSong = React.useCallback(async () => {
    await fetch('http://127.0.0.1:8001/music/next', { method: 'POST' });
  }, []);

  const prevSong = React.useCallback(async () => {
    await fetch('http://127.0.0.1:8001/music/previous', { method: 'POST' });
  }, []);

  const changeGlobalVolume = React.useCallback(async (newVolume) => {
    await fetch('http://127.0.0.1:8001/music/volume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ volume: newVolume })
    });
  }, []);

  const logout = React.useCallback(() => {
    setUser(null);
    localStorage.removeItem('user');
  }, []);

  const subscribeToAudio = React.useCallback((callback) => {
    onAudioDataRef.current = callback;
    return () => { onAudioDataRef.current = null; };
  }, []);

  return (
    <RadioContext.Provider value={{
      isLive, isPaused, togglePause, nextSong, prevSong,
      currentSong, audioURL, news, setNews, user, login, logout,
      subscribeToAudio, volume, changeGlobalVolume
    }}>
      {children}
    </RadioContext.Provider>
  );
};

export const useRadio = () => useContext(RadioContext);
