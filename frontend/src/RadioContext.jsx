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

  const audioRef = useRef(null);
  const liveAudioRef = useRef(null);
  const mediaSourceRef = useRef(null);
  const sourceBufferRef = useRef(null);
  const queueRef = useRef([]);

  const togglePause = React.useCallback(async (paused) => {
    await fetch('http://127.0.0.1:8000/music/toggle-pause', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paused })
    });
  }, []);

  // Media Session API for background playing and OS controls
  useEffect(() => {
    if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new window.MediaMetadata({
            title: isLive ? 'JorghitoTech FM - En Vivo' : (currentSong || 'JorghitoTech FM'),
            artist: 'Radio Online',
            album: 'Background Playback'
        });

        navigator.mediaSession.setActionHandler('play', () => {
            if (user && user.is_admin) togglePause(false); 
        });
        navigator.mediaSession.setActionHandler('pause', () => {
             if (user && user.is_admin) togglePause(true);
        });
    }
  }, [currentSong, isLive, user, togglePause]);

  // Music Player Control (Moved from ListenerApp)
  useEffect(() => {
    if (audioRef.current) {
        audioRef.current.volume = volume;
        if (isPaused || isLive) {
            audioRef.current.pause();
        } else if (audioURL) {
            audioRef.current.play().catch(err => console.log("Auto-play blocked:", err));
        }
    }
  }, [isPaused, isLive, audioURL, volume]);

  // Live Streaming Control (Moved from ListenerApp)
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

        return () => {
            ms.removeEventListener('sourceopen', onSourceOpen);
            // We can't immediately close the remote stream cleanly here without closing WS,
            // but we clean up the MediaSource
            if (ms.readyState === 'open') ms.endOfStream();
        };
    }
  }, [isLive]);

  // Dedicated Volume Control for Live Stream
  useEffect(() => {
      if (isLive && liveAudioRef.current) {
          liveAudioRef.current.volume = volume;
      }
  }, [volume, isLive]);

  useEffect(() => {
    // Fetch News
    fetch('http://127.0.0.1:8000/news')
      .then(res => res.json())
      .then(data => setNews(data))
      .catch(err => console.error("Error fetching news:", err));

    // WebSocket Connection
    const ws = new WebSocket('ws://127.0.0.1:8000/ws/listener');
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
              const newURL = `http://127.0.0.1:8000${song.path_or_url}#t=${data.elapsed}`;

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
        if (isLive && mediaSourceRef.current?.readyState === 'open') {
             const chunk = event.data;
             if (sourceBufferRef.current && !sourceBufferRef.current.updating) {
                 try {
                     sourceBufferRef.current.appendBuffer(chunk);
                 } catch (e) {
                     queueRef.current.push(chunk);
                 }
             } else {
                 queueRef.current.push(chunk);
             }

             if (liveAudioRef.current && liveAudioRef.current.paused) {
                 liveAudioRef.current.play().catch(() => {});
             }
        }
      }
    };

    return () => ws.close();
  }, []);

  const login = React.useCallback(async (username, password) => {
    const res = await fetch('http://127.0.0.1:8000/login', {
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

  const nextSong = React.useCallback(async () => {
    await fetch('http://127.0.0.1:8000/music/next', { method: 'POST' });
  }, []);

  const prevSong = React.useCallback(async () => {
    await fetch('http://127.0.0.1:8000/music/previous', { method: 'POST' });
  }, []);

  const changeGlobalVolume = React.useCallback(async (newVolume) => {
    await fetch('http://127.0.0.1:8000/music/volume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ volume: newVolume })
    });
  }, []);

  const logout = React.useCallback(() => {
    setUser(null);
    localStorage.removeItem('user');
  }, []);



  return (
    <RadioContext.Provider value={{
      isLive, isPaused, togglePause, nextSong, prevSong,
      currentSong, audioURL, news, setNews, user, login, logout,
      volume, changeGlobalVolume
    }}>
      {/* Hidden global audio players */}
      <audio ref={audioRef} src={!isLive && audioURL ? audioURL : ''} display="none" />
      <audio ref={liveAudioRef} display="none" />
      
      {children}
    </RadioContext.Provider>
  );
};

export const useRadio = () => useContext(RadioContext);
