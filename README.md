# 🎙️ JorghitoTechFM - Online Radio Station

Una estación de radio online moderna y potente con transmisión en vivo, panel de administración y diseño "Glassmorphism" premium.

## ✨ Características

- **📻 Transmisión en Vivo**: Transmite audio directamente desde tu micrófono a todos los oyentes en tiempo real usando WebSockets.
- **🎵 Reproductor Sincronizado**: Los oyentes escuchan la misma música al mismo tiempo, perfectamente sincronizados con el servidor.
- **🔐 Panel de Administración Seguro**: Protegido por autenticación para gestionar noticias y controlar el en vivo.
- **📰 Sistema de Noticias**: Publica y gestiona noticias de última hora que se actualizan dinámicamente para los oyentes.
- **🎨 Diseño Premium**: Interfaz oscura con efectos de desenfocado (Glassmorphism), animaciones suaves y tipografía moderna.
- **🚀 Ultra-Rápido**: Construido con FastAPI (Python) y React (Vite) para un rendimiento excepcional.

## 🛠️ Stack Tecnológico

- **Frontend**: React.js, Vite, Context API, Vanilla CSS.
- **Backend**: FastAPI (Python), WebSockets, Pydantic, Uvicorn.
- **Base de Datos**: SQLite con SQLAlchemy ORM.
- **Audio**: Streaming binario de baja latencia vía WebSockets.

## 🚀 Instalación y Uso

### 1. Requisitos Previos
- Python 3.10+
- Node.js 18+

### 2. Configuración del Backend
```bash
cd backend
python -m pip install fastapi uvicorn sqlalchemy websockets python-multipart pydantic
python -m uvicorn main:app --host 0.0.0.0 --port 8001
```

### 3. Configuración del Frontend
```bash
cd frontend
npm install
npm run dev -- --host
```

### 4. Credenciales de Administrador
- **Usuario**: `admin`
- **Contraseña**: `admin123`

## 📁 Estructura del Proyecto

- `/backend`: Servidor FastAPI, lógica de radio y base de datos.
- `/frontend`: Aplicación React con la interfaz de oyente y administrador.
- `/music`: Carpeta donde debes colocar tus archivos `.mp3` para la programación automática.

## ⚠️ Notas de Red
El backend está configurado en el puerto **8001** para evitar conflictos comunes en Windows. El frontend corre en el puerto **5173**.

---
Desarrollado con ❤️ por Antigravity.