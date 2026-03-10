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
        self.current_song: Optional[Dict] = None
        self.start_time: float = 0.0
        self.playlist: List[Dict] = []
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
                elif self.current_song and not any(m["id"] == self.current_song["id"] for m in self.playlist):
                    self.current_song = self.playlist[0] if self.playlist else None
                    self.start_time = time.time()
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
                await self.broadcast_state()
        finally:
            db.close()

    async def broadcast_state(self):
        state = {
            "type": "state",
            "is_live": self.is_live,
            "current_song": self.current_song,
            "elapsed": time.time() - self.start_time if self.current_song else 0
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
        state = {
            "type": "state",
            "is_live": self.is_live,
            "current_song": self.current_song,
            "elapsed": time.time() - self.start_time if self.current_song else 0
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

radio_manager = RadioManager()
