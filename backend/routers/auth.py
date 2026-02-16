from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from services.session import create_session, cleanup_session

router = APIRouter(prefix="/auth", tags=["Auth"])

class LoginRequest(BaseModel):
    email: EmailStr

@router.post("/login")
async def login(request: LoginRequest):
    """Create a session directory for the user."""
    try:
        session_path = create_session(request.email)
        return {"message": "Login successful", "email": request.email, "session_active": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/logout")
async def logout(request: LoginRequest):
    """Delete the user's session directory."""
    try:
        cleanup_session(request.email)
        return {"message": "Logged out successfully (Session cleared)"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
