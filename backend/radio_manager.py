import os
import time
import asyncio
from typing import List, Dict
from fastapi import WebSocket

class RadioManager:
    def __init__(self):
        self.listeners: List[WebSocket] = []
        self.admin: WebSocket = None
        self.is_live = False
        self.current_song = None
        self.start_time = 0
        self.playlist = []
        self.load_playlist()

    def load_playlist(self):
        music_dir = "../music"
        if os.path.exists(music_dir):
            self.playlist = [f for f in os.listdir(music_dir) if f.endswith(('.mp3', '.wav'))]
            if self.playlist:
                self.current_song = self.playlist[0]
                self.start_time = time.time()

    async def connect_listener(self, websocket: WebSocket):
        await websocket.accept()
        self.listeners.append(websocket)
        # Send current state
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
        
        # We wrap in tasks to avoid blocking the admin
        tasks = [listener.send_bytes(data) for listener in self.listeners]
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

    async def set_live(self, status: bool):
        self.is_live = status
        broadcast_msg = {"type": "live_status", "status": status}
        for listener in self.listeners:
            await listener.send_json(broadcast_msg)

radio_manager = RadioManager()
