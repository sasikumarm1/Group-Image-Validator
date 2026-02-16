from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

app = FastAPI(title="Image Validator API")

# CORS Setup - Allow all for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure session directory exists
SESSION_DIR = "sessions"
if not os.path.exists(SESSION_DIR):
    os.makedirs(SESSION_DIR)

# Mount Session Directory for serving images
app.mount("/sessions", StaticFiles(directory=SESSION_DIR), name="sessions")

@app.get("/")
async def root():
    return {"message": "Image Validator API is running"}

from routers import auth, upload, validate, export

app.include_router(auth.router)
app.include_router(upload.router)
app.include_router(validate.router)
app.include_router(export.router)
