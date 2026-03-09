from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
import os
import json

import models
import database
import radio_manager
from radio_manager import radio_manager as manager

# Models initialization
models.Base.metadata.create_all(bind=database.engine)

# Pydantic models for validation
class LoginRequest(BaseModel):
    username: str
    password: str

class NewsCreate(BaseModel):
    title: str
    content: str

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

# Mount Music and Frontend Assets
music_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "music"))
if not os.path.exists(music_path):
    os.makedirs(music_path)
app.mount("/music", StaticFiles(directory=music_path), name="music")

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
