from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from services.session import get_session_path, cleanup_session, sanitize_email
from services.data import load_metadata
import shutil
import os
import pandas as pd
import zipfile
from io import BytesIO

router = APIRouter(prefix="/export", tags=["Export"])

def generate_excel_report(data, session_path, filename="Image_Validation_Report.xlsx", filter_approved=False):
    """Helper to generate Excel report from metadata data."""
    if not data:
        raise HTTPException(status_code=400, detail="No data to export")
        
    df = pd.DataFrame(data)
    
    # Filter approved if requested
    if filter_approved and "status" in df.columns:
        df = df[df["status"] == "Approved"]
        if df.empty:
            raise HTTPException(status_code=404, detail="No approved images found to export")

    # Capitalize 'image_provided_by' for better presentation (MFR, Client)
    if "image_provided_by" in df.columns:
        df["image_provided_by"] = df["image_provided_by"].apply(
            lambda x: str(x).upper() if str(x).lower() == "mfr" else str(x).capitalize() if x else ""
        )

    # Clean DPI to show only number (remove ' DPI' and AI info)
    if "dpi" in df.columns:
        df["dpi"] = df["dpi"].astype(str).apply(lambda x: x.split(" DPI")[0].strip())


    # Filter/Order columns as per requirements
    columns_order = [
        "image_provided_by", "sku_id", "image_name", 
        "size", "resolution", "dpi", 
        "format", "status", "display_order", "notes"
    ]
    
    # Rename map to match screenshot headers exactly
    rename_map = {
        "image_provided_by": "Image Provided By",
        "sku_id": "Sku ID",
        "image_name": "Image Name",
        "size": "Image Size",
        "resolution": "Image Resolution",
        "dpi": "DPI",
        "format": "Image Format",
        "status": "Approved Status",
        "display_order": "Display Order",
        "notes": "Notes"
    }

    # Ensure columns exist and fill missing with empty string
    for col in columns_order:
        if col not in df.columns:
            df[col] = "" 
            
    # Select and Rename
    df_final = df[columns_order].rename(columns=rename_map)
    
    output_path = os.path.join(session_path, f"export_{filename}")
    df_final.to_excel(output_path, index=False)
    
    return FileResponse(
        path=output_path, 
        filename=filename, 
        media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )

@router.get("/excel")
async def export_excel(email: str):
    """Generate and download full Excel report."""
    session_path = get_session_path(email)
    if not os.path.exists(session_path):
        raise HTTPException(status_code=404, detail="Session not found")
        
    data = load_metadata(session_path)
    return generate_excel_report(data, session_path, "Image_Validation_Report.xlsx")

@router.get("/approved-excel")
async def export_approved_excel(email: str):
    """Generate and download Excel report for approved images only."""
    session_path = get_session_path(email)
    if not os.path.exists(session_path):
        raise HTTPException(status_code=404, detail="Session not found")
        
    data = load_metadata(session_path)
    return generate_excel_report(data, session_path, "Approved_Images_Report.xlsx", filter_approved=True)

@router.get("/zip/{sku_id}")
async def export_zip(email: str, sku_id: str, background_tasks: BackgroundTasks):
    """Download approved images for a specific SKU as Zip."""
    session_path = get_session_path(email)
    images_dir = os.path.join(session_path, "images")
    
    data = load_metadata(session_path)
    
    # Filter approved images for SKU
    approved_images = [
        item["image_name"] 
        for item in data 
        if str(item.get("sku_id")).strip() == str(sku_id).strip() 
        and item.get("status") == "Approved"
    ]
    
    if not approved_images:
        raise HTTPException(status_code=404, detail="No approved images found for this SKU")
        
    zip_filename = f"{sku_id}_approved.zip"
    zip_path = os.path.join(session_path, zip_filename)
    
    with zipfile.ZipFile(zip_path, 'w') as zipf:
        for img_name in approved_images:
            src_path = os.path.join(images_dir, img_name)
            if os.path.exists(src_path):
                zipf.write(src_path, arcname=img_name)
                
    return FileResponse(zip_path, filename=zip_filename, media_type="application/zip")

@router.get("/approved-zip")
async def export_all_approved_zip(email: str):
    """Download ALL approved images across all SKUs as a single Zip."""
    session_path = get_session_path(email)
    images_dir = os.path.join(session_path, "images")
    
    if not os.path.exists(session_path):
        raise HTTPException(status_code=404, detail="Session not found")
        
    data = load_metadata(session_path)
    if not data:
        raise HTTPException(status_code=400, detail="No metadata found")
    
    # Filter all approved images
    approved_images = [
        item["image_name"] 
        for item in data 
        if item.get("status") == "Approved"
    ]
    
    if not approved_images:
        raise HTTPException(status_code=404, detail="No approved images found across all SKUs")
        
    zip_filename = "all_approved_images.zip"
    zip_path = os.path.join(session_path, zip_filename)
    
    with zipfile.ZipFile(zip_path, 'w') as zipf:
        # Track unique names to avoid zipping the same file multiple times if it appears in metadata twice
        added_files = set()
        for img_name in approved_images:
            if img_name in added_files:
                continue
            src_path = os.path.join(images_dir, img_name)
            if os.path.exists(src_path):
                zipf.write(src_path, arcname=img_name)
                added_files.add(img_name)
                
    return FileResponse(zip_path, filename=zip_filename, media_type="application/zip")
