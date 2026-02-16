from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import List
import shutil
import os
from services.session import get_session_path
from services.excel_parser import parse_excel
from services.data import save_metadata, load_metadata, update_image_record
from services.image import extract_technical_metadata

router = APIRouter(prefix="/upload", tags=["Upload"])

@router.post("/excel")
async def upload_excel(email: str = Form(...), file: UploadFile = File(...)):
    """Upload and parse Excel file."""
    if not email:
        raise HTTPException(status_code=400, detail="Email required")
        
    session_path = get_session_path(email)
    if not os.path.exists(session_path):
        raise HTTPException(status_code=404, detail="Session not found. Please login first.")

    file_location = os.path.join(session_path, file.filename)
    with open(file_location, "wb") as f:
        shutil.copyfileobj(file.file, f)

    try:
        records = parse_excel(file_location)
        # Initialize default fields
        for record in records:
            record.update({
                "status": "Pending",
                "display_order": None,
                "notes": "",
                "image_path": None, # Will be filled when image is uploaded
                # Technical metadata placeholders
                "width": "N/A", "height": "N/A", "resolution": "N/A", "dpi": "N/A",
                "size": "N/A", "format": "N/A", "color_mode": "N/A", 
                "background": "N/A", "watermark": "N/A"
            })
        
        save_metadata(session_path, records)
        return {"message": "Excel processed", "count": len(records)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/images")
async def upload_images(
    email: str = Form(...), 
    files: List[UploadFile] = File(...)
):
    """Upload images and extract metadata."""
    session_path = get_session_path(email)
    if not os.path.exists(session_path):
        raise HTTPException(status_code=404, detail="Session not found")

    images_dir = os.path.join(session_path, "images")
    if not os.path.exists(images_dir):
        os.makedirs(images_dir)

    results = []
    
    # Process sequentially/parallel (simple loop for now)
    for file in files:
        file_path = os.path.join(images_dir, file.filename)
        with open(file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
            
        # Extract Metadata
        meta = extract_technical_metadata(file_path)
        
        # Merge with existing record from Excel if matches
        update_success = update_image_record(session_path, file.filename, {
            **meta,
            "image_path": f"/sessions/{os.path.basename(session_path)}/images/{file.filename}"
        })
        
        results.append({
            "filename": file.filename, 
            "status": "Merged" if update_success else "Orphaned (No Excel Match)",
            "meta": meta
        })

    return {"results": results}
