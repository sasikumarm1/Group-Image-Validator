from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Any
from services.session import get_session_path
from services.data import load_metadata, save_metadata, update_image_record
import os

router = APIRouter(prefix="/validate", tags=["Validate"])

class UpdateStatusRequest(BaseModel):
    email: str
    image_name: str
    status: str
    display_order: Optional[int] = None
    notes: Optional[str] = None

@router.get("/skus")
async def get_skus(email: str):
    """Get list of SKUs and their progress."""
    session_path = get_session_path(email)
    if not os.path.exists(session_path):
        raise HTTPException(status_code=404, detail="Session not found")
        
    data = load_metadata(session_path)
    if not data:
        return []
        
    skus = {}
    for item in data:
        sku = item.get("sku_id")
        if sku not in skus:
            skus[sku] = {"sku_id": sku, "total": 0, "approved": 0, "rejected": 0, "pending": 0}
        
        skus[sku]["total"] += 1
        status = item.get("status", "Pending").lower()
        if status == "approved":
            skus[sku]["approved"] += 1
        elif status == "rejected":
            skus[sku]["rejected"] += 1
        else:
            skus[sku]["pending"] += 1
            
    return list(skus.values())

@router.get("/images/{sku_id}")
async def get_images_by_sku(email: str, sku_id: str):
    """Get all images for a specific SKU."""
    session_path = get_session_path(email)
    data = load_metadata(session_path)
    
    # Filter by SKU (stringify to be safe)
    sku_images = [
        item for item in data 
        if str(item.get("sku_id")).strip() == str(sku_id).strip()
    ]
    
    # Sort: generic sort by name, or display_order if available
    sku_images.sort(key=lambda x: (x.get("display_order") or 9999, x.get("image_name")))
    
    return sku_images

class ResetSkuRequest(BaseModel):
    email: str
    sku_id: str

@router.put("/update")
async def update_image(request: UpdateStatusRequest):
    """Update status, order, and notes for an image."""
    session_path = get_session_path(request.email)
    if not os.path.exists(session_path):
        raise HTTPException(status_code=404, detail="Session not found")
        
    updates = {
        "status": request.status,
        "display_order": request.display_order,
        "notes": request.notes
    }
    
    # If rejected or pending, clear order
    if request.status in ["Rejected", "Pending"]:
        updates["display_order"] = None
        
    success = update_image_record(session_path, request.image_name, updates)
    if not success:
        raise HTTPException(status_code=404, detail="Image record not found")
        
    return {"message": "Updated successfully"}

@router.post("/reset")
async def reset_sku(request: ResetSkuRequest):
    """Reset all images for a specific SKU to Pending."""
    print(f"DEBUG: Reset SKU requested for {request.sku_id} by {request.email}")
    session_path = get_session_path(request.email)
    if not os.path.exists(session_path):
        print(f"DEBUG: Session path not found: {session_path}")
        raise HTTPException(status_code=404, detail="Session not found")
        
    data = load_metadata(session_path)
    updated = False
    
    print(f"DEBUG: Loaded {len(data)} records from metadata.json")
    
    # Filter and update in memory
    for item in data:
        item_sku = str(item.get("sku_id")).strip()
        req_sku = str(request.sku_id).strip()
        if item_sku == req_sku:
            print(f"DEBUG: Matching SKU found for image {item.get('image_name')}. Resetting...")
            item["status"] = "Pending"
            item["display_order"] = None
            updated = True
            
    if updated:
        save_metadata(session_path, data)
        print(f"DEBUG: Successfully updated and saved metadata.json")
        return {"message": f"Reset all images for SKU {request.sku_id}"}
    
    print(f"DEBUG: No matching SKU found or no updates needed for {request.sku_id}")
    return {"message": "No changes made"}
