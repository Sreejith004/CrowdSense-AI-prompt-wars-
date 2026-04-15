"""Authentication API routes (Simulated)."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from app.models.schemas import LoginRequest, SignupRequest, ForgotPasswordRequest, ResetPasswordRequest
from app.utils.mock_firestore import db
import uuid

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])

@router.post("/login")
async def login(req: LoginRequest):
    """Simulated login with Password or OTP."""
    # Find user
    users = db.collection("users").where("identifier", "==", req.identifier)
    
    if not users:
        # For OTP mode, if they use 1234, let's auto-create the user for a smoother demo
        if req.mode == "otp" and req.otp == "1234":
            user_id = str(uuid.uuid4())[:8]
            user_data = {
                "user_id": user_id,
                "identifier": req.identifier,
                "password": "simulated_password"
            }
            db.collection("users").add(user_id, user_data)
            return {"user_id": user_id, "identifier": req.identifier, "message": "Login successful (New user created via OTP)"}
        
        raise HTTPException(status_code=401, detail="User not found. Please Sign Up first or use OTP 1234.")

    user = users[0]

    if req.mode == "otp":
        if req.otp == "1234":
            return {"user_id": user["user_id"], "identifier": user["identifier"], "message": "Login successful via OTP"}
        else:
            raise HTTPException(status_code=401, detail="Invalid OTP")
    else:
        if user["password"] == req.password:
            return {"user_id": user["user_id"], "identifier": user["identifier"], "message": "Login successful"}
        else:
            raise HTTPException(status_code=401, detail="Invalid password")

@router.post("/signup")
async def signup(req: SignupRequest):
    """Register a new user."""
    if req.password != req.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    
    # Check if exists
    existing = db.collection("users").where("identifier", "==", req.identifier)
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")

    user_id = str(uuid.uuid4())[:8]
    user_data = {
        "user_id": user_id,
        "identifier": req.identifier,
        "password": req.password
    }
    db.collection("users").add(user_id, user_data)
    return {"user_id": user_id, "identifier": req.identifier, "message": "Registration successful"}

@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest):
    """Simulated forgot password - check if user exists."""
    existing = db.collection("users").where("identifier", "==", req.identifier)
    if not existing:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "Reset code sent (Simulated). Use '0000' to reset."}

@router.post("/reset-password")
async def reset_password(req: ResetPasswordRequest):
    """Simulated password reset."""
    if req.reset_code != "0000":
        raise HTTPException(status_code=400, detail="Invalid reset code")
    
    existing = db.collection("users").where("identifier", "==", req.identifier)
    if not existing:
        raise HTTPException(status_code=404, detail="User not found")
    
    user = existing[0]
    user["password"] = req.new_password
    db.collection("users").document(user["user_id"]).update({"password": req.new_password})
    
    return {"message": "Password reset successful"}
