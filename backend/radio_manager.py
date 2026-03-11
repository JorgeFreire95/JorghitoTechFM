import os
import time
import asyncio
from typing import List, Dict, Optional, Any
from fastapi import WebSocket
from database import SessionLocal
import models
class RadioManager:
    def __init__(self):
        self.listeners: List[WebSocket] = []
        self.admin: Optional[WebSocket] = None
        self.is_live: bool = False
        self.is_paused: bool = False
        self.paused_at: Optional[float] = None
        self.current_song: Optional[Dict] = None
        self.start_time: float = 0.0
        self.playlist: List[Dict] = []
        self.volume: float = 0.5
        self.load_playlist()

    def load_playlist(self):
        db = SessionLocal()
        try:
            db_music = db.query(models.Music).order_by(models.Music.created_at.desc()).all()
            new_playlist = [
                {
                    "id": m.id,
                    "title": m.title,
                    "artist": m.artist,
                    "type": m.type,
                    "path_or_url": m.path_or_url
                } for m in db_music
            ]
            
            changed = False
            if new_playlist != self.playlist:
                self.playlist = new_playlist
                # If no song was playing, start the first one
                if not self.current_song and self.playlist:
                    self.current_song = self.playlist[0]
                    self.start_time = time.time()
                    changed = True
                # If current song was "deleted" (not in new list)
                elif self.current_song and not any(m.get("id") == self.current_song.get("id") for m in self.playlist if self.current_song):
                    self.current_song = self.playlist[0] if self.playlist else None
                    self.start_time = time.time()
                    self.is_paused = False
                    self.paused_at = None
                    changed = True
            return changed
        finally:
            db.close()

    async def play_song(self, song_id: int):
        db = SessionLocal()
        try:
            m = db.query(models.Music).filter(models.Music.id == song_id).first()
            if m:
                self.current_song = {
                    "id": m.id,
                    "title": m.title,
                    "artist": m.artist,
                    "type": m.type,
                    "path_or_url": m.path_or_url
                }
                self.start_time = time.time()
                self.is_paused = False
                self.paused_at = None
                await self.broadcast_state()
        finally:
            db.close()

    async def next_song(self):
        if not self.playlist:
            return
        
        current_index = -1
        if self.current_song:
            for i, m in enumerate(self.playlist):
                if m.get("id") == self.current_song.get("id"):
                    current_index = i
                    break
        
        next_index = (current_index + 1) % len(self.playlist)
        self.current_song = self.playlist[next_index]
        self.start_time = time.time()
        self.is_paused = False
        self.paused_at = None
        await self.broadcast_state()

    async def previous_song(self):
        if not self.playlist:
            return
        
        current_index = -1
        if self.current_song:
            for i, m in enumerate(self.playlist):
                if m.get("id") == self.current_song.get("id"):
                    current_index = i
                    break
        
        prev_index = (current_index - 1) % len(self.playlist)
        self.current_song = self.playlist[prev_index]
        self.start_time = time.time()
        self.is_paused = False
        self.paused_at = None
        await self.broadcast_state()

    async def set_paused(self, paused: bool):
        if self.is_paused == paused:
            return
        
        if paused:
            # Pausing: record when we paused to calculate offset later
            self.is_paused = True
            self.paused_at = time.time()
        else:
            # Resuming: adjust start_time by the duration we were paused
            if self.paused_at is not None:
                pause_duration = time.time() - self.paused_at
                self.start_time += pause_duration
            self.is_paused = False
            self.paused_at = None
        
        await self.broadcast_state()

    async def broadcast_state(self):
        elapsed = 0.0
        if self.current_song:
            if self.is_paused and self.paused_at is not None:
                elapsed = self.paused_at - self.start_time
            else:
                elapsed = time.time() - self.start_time

        state = {
            "type": "state",
            "is_live": self.is_live,
            "is_paused": self.is_paused,
            "current_song": self.current_song,
            "elapsed": elapsed,
            "volume": self.volume
        }
        for listener in list(self.listeners):
            try:
                await listener.send_json(state)
            except Exception:
                if listener in self.listeners:
                    self.listeners.remove(listener)

    async def connect_listener(self, websocket: WebSocket):
        await websocket.accept()
        self.listeners.append(websocket)
        # Send current state immediately
        elapsed = 0.0
        if self.current_song:
            if self.is_paused and self.paused_at is not None:
                elapsed = self.paused_at - self.start_time
            else:
                elapsed = time.time() - self.start_time

        state = {
            "type": "state",
            "is_live": self.is_live,
            "is_paused": self.is_paused,
            "current_song": self.current_song,
            "elapsed": elapsed,
            "volume": self.volume
        }
        await websocket.send_json(state)

    def disconnect_listener(self, websocket: WebSocket):
        if websocket in self.listeners:
            self.listeners.remove(websocket)

    async def broadcast_audio(self, data: bytes):
        if not self.is_live:
            return
        
        for listener in list(self.listeners):
            try:
                await listener.send_bytes(data)
            except Exception:
                if listener in self.listeners:
                    self.listeners.remove(listener)

    async def set_live(self, status: bool):
        self.is_live = status
        await self.broadcast_state()

    async def set_volume(self, volume: float):
        self.volume = max(0.0, min(1.0, volume))
        await self.broadcast_state()

radio_manager = RadioManager()
