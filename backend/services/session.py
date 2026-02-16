import os
import shutil
import re

SESSIONS_ROOT = "sessions"

def sanitize_email(email: str) -> str:
    """Sanitize email to be safe for directory names."""
    return re.sub(r'[^a-zA-Z0-9_\-]', '_', email)

def create_session(email: str) -> str:
    """Create a session directory for the user. Returns the path."""
    safe_email = sanitize_email(email)
    session_path = os.path.join(SESSIONS_ROOT, safe_email)
    if not os.path.exists(session_path):
        os.makedirs(session_path)
    return session_path

def get_session_path(email: str) -> str:
    """Get the session directory for the user."""
    safe_email = sanitize_email(email)
    return os.path.join(SESSIONS_ROOT, safe_email)

def cleanup_session(email: str):
    """Delete the session directory for the user."""
    safe_email = sanitize_email(email)
    session_path = os.path.join(SESSIONS_ROOT, safe_email)
    if os.path.exists(session_path):
        shutil.rmtree(session_path)

def save_file_to_session(email: str, filename: str, content: bytes):
    """Save a file to the user's session directory."""
    session_path = get_session_path(email)
    if not os.path.exists(session_path):
        os.makedirs(session_path)
    
    file_path = os.path.join(session_path, filename)
    with open(file_path, "wb") as f:
        f.write(content)
    return file_path
