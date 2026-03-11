from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
import os
import json
from datetime import datetime

import models
import database
from radio_manager import radio_manager as manager

# Configuration and Paths
music_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "music"))
if not os.path.exists(music_path):
    os.makedirs(music_path)

# Models initialization
models.Base.metadata.create_all(bind=database.engine)

# Pydantic models for validation
class LoginRequest(BaseModel):
    username: str
    password: str

class NewsCreate(BaseModel):
    title: str
    content: str

class MusicLink(BaseModel):
    title: str
    artist: Optional[str] = None
    type: str
    url: str

class PauseRequest(BaseModel):
    paused: bool

class VolumeRequest(BaseModel):
    volume: float

# Initialize Admin User if not exists
def init_admin():
    db = database.SessionLocal()
    try:
        admin = db.query(models.User).filter(models.User.username == "admin").first()
        if not admin:
            admin = models.User(username="admin", hashed_password="admin123")
            db.add(admin)
            db.commit()
    except Exception as e:
        print(f"Error initializing admin: {e}")
    finally:
        db.close()

init_admin()

app = FastAPI(title="JorghitoTechFM API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth Routes
@app.post("/login")
def login(data: LoginRequest, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(
        models.User.username == data.username,
        models.User.hashed_password == data.password
    ).first()
    if not user:
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    return {"status": "success", "username": user.username}

# WebSocket for Listeners
@app.websocket("/ws/listener")
async def websocket_listener(websocket: WebSocket):
    await manager.connect_listener(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect_listener(websocket)
    except Exception:
        manager.disconnect_listener(websocket)

# WebSocket for Admin (Live Control)
@app.websocket("/ws/admin")
async def websocket_admin(websocket: WebSocket):
    await websocket.accept()
    manager.admin = websocket
    try:
        while True:
            data = await websocket.receive()
            if "bytes" in data:
                await manager.broadcast_audio(data["bytes"])
            elif "text" in data:
                try:
                    msg = json.loads(data["text"])
                    if msg["type"] == "start_live":
                        await manager.set_live(True)
                    elif msg["type"] == "stop_live":
                        await manager.set_live(False)
                except json.JSONDecodeError:
                    continue
    except WebSocketDisconnect:
        manager.admin = None
        await manager.set_live(False)
    except Exception:
        manager.admin = None
        await manager.set_live(False)

# News Routes
@app.get("/news")
def get_news(db: Session = Depends(database.get_db)):
    return db.query(models.News).order_by(models.News.created_at.desc()).all()

@app.post("/news")
def create_news(news: NewsCreate, db: Session = Depends(database.get_db)):
    db_news = models.News(title=news.title, content=news.content)
    db.add(db_news)
    db.commit()
    db.refresh(db_news)
    return db_news

@app.delete("/news/{news_id}")
def delete_news(news_id: int, db: Session = Depends(database.get_db)):
    db_news = db.query(models.News).filter(models.News.id == news_id).first()
    if not db_news:
        raise HTTPException(status_code=404, detail="News not found")
    db.delete(db_news)
    db.commit()
    return {"message": "Deleted"}

# Music Routes
@app.get("/music")
def get_music(db: Session = Depends(database.get_db)):
    return db.query(models.Music).order_by(models.Music.created_at.desc()).all()

@app.post("/music/link")
def create_music_link(music: MusicLink, db: Session = Depends(database.get_db)):
    db_music = models.Music(
        title=music.title,
        artist=music.artist,
        type=music.type,
        path_or_url=music.url
    )
    db.add(db_music)
    db.commit()
    db.refresh(db_music)
    return db_music

@app.post("/music/upload")
async def upload_music(
    title: str = Form(...),
    artist: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(database.get_db)
):
    # Save file
    file_extension = os.path.splitext(file.filename)[1]
    filename = f"{int(datetime.utcnow().timestamp())}{file_extension}"
    file_path = os.path.join(music_path, filename)
    
    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())
    
    # Create DB record
    db_music = models.Music(
        title=title,
        artist=artist,
        type="file",
        path_or_url=f"/audio/{filename}"
    )
    db.add(db_music)
    db.commit()
    db.refresh(db_music)
    
    # Reload playlist and notify listeners
    manager.load_playlist()
    await manager.broadcast_state()
    
    return db_music

@app.post("/music/{music_id}/play")
async def play_music_endpoint(music_id: int):
    await manager.play_song(music_id)
    return {"message": "Playing"}

@app.post("/music/toggle-pause")
async def toggle_pause(data: PauseRequest):
    await manager.set_paused(data.paused)
    return {"status": "success", "paused": data.paused}

@app.post("/music/next")
async def play_next():
    await manager.next_song()
    return {"status": "success"}

@app.post("/music/previous")
async def play_previous():
    await manager.previous_song()
    return {"status": "success"}

@app.post("/music/volume")
async def set_volume(data: VolumeRequest):
    await manager.set_volume(data.volume)
    return {"status": "success", "volume": data.volume}

@app.delete("/music/{music_id}")
def delete_music(music_id: int, db: Session = Depends(database.get_db)):
    db_music = db.query(models.Music).filter(models.Music.id == music_id).first()
    if not db_music:
        raise HTTPException(status_code=404, detail="Music not found")
    
    # If it's a file, delete from disk
    if db_music.type == "file":
        filename = os.path.basename(db_music.path_or_url)
        file_path = os.path.join(music_path, filename)
        if os.path.exists(file_path):
            os.remove(file_path)
            
    db.delete(db_music)
    db.commit()
    return {"message": "Deleted"}

app.mount("/audio", StaticFiles(directory=music_path), name="audio")
