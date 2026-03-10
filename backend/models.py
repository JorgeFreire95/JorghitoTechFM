from sqlalchemy import Column, Integer, String, DateTime, Text
from datetime import datetime
from database import Base

class News(Base):
    __tablename__ = "news"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)

class Music(Base):
    __tablename__ = "music"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    artist = Column(String, index=True, nullable=True)
    type = Column(String) # 'file', 'youtube', 'spotify'
    path_or_url = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
