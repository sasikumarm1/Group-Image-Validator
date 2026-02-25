from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Body
from fastapi.responses import FileResponse, StreamingResponse
from typing import List
import shutil
import os
from services.session import get_session_path
from services.excel_parser import parse_excel
from services.data import save_metadata, load_metadata, update_image_record
from services.image import extract_technical_metadata
import pandas as pd
import io

router = APIRouter(prefix="/upload", tags=["Upload"])

@router.get("/local-image")
async def serve_local_image(path: str):
    """Serve an image from a local absolute path."""
    if not path or not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Image not found")
    
    valid_extensions = ('.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tif', '.tiff')
    if not path.lower().endswith(valid_extensions):
        raise HTTPException(status_code=400, detail="Invalid file type")
        
    return FileResponse(path)

@router.get("/template")
async def get_template(mode: str = "project"):
    """Generate and serve a sample Excel template."""
    if mode == "ftp":
        columns = ['Image Provided', 'Sku ID', 'Image Path and Name']
    else:
        columns = ['Image Provided', 'Sku ID', 'Image Name']
        
    df = pd.DataFrame(columns=columns)
    # Optional: Add an example row
    # df.loc[0] = ['MFR Image', 'SKU123', 'SKU123_1.jpg']
    
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        df.to_excel(writer, index=False, sheet_name='Template')
    
    output.seek(0)
    
    filename = "ftp_validation_template.xlsx" if mode == "ftp" else "validation_template.xlsx"
    headers = {
        'Content-Disposition': f'attachment; filename="{filename}"'
    }
    return StreamingResponse(output, headers=headers, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")

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

@router.post("/local-path")
async def upload_local_path(
    email: str = Form(...), 
    path: str = Form(None), # Made optional
    file: UploadFile = File(None)
):
    """Scan a local directory and/or use absolute paths from Excel to extract metadata."""
    if not email:
        raise HTTPException(status_code=400, detail="Email required")
    
    print(f"Processing local path upload for {email}")
    print(f"Path: {path}")
    print(f"Excel file: {file.filename if file else 'None'}")
    
    # Path is optional only if Excel is provided
    if not path and not file:
        raise HTTPException(status_code=400, detail="Either local directory path or Excel file is required.")

    session_path = get_session_path(email)
    if not os.path.exists(session_path):
        raise HTTPException(status_code=404, detail="Session not found. Please login first.")

    # 1. Parse Excel if provided
    excel_records = {} # Map: image_name -> record
    if file:
        temp_excel_path = os.path.join(session_path, f"temp_{file.filename}")
        with open(temp_excel_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        
        try:
            parsed = parse_excel(temp_excel_path)
            for rec in parsed:
                img_name = rec.get("image_name")
                if img_name:
                    # If multiple rows have same image_name, last one wins or we could handle duplicates
                    excel_records[img_name] = rec
        except Exception as e:
            if os.path.exists(temp_excel_path):
                os.remove(temp_excel_path)
            raise HTTPException(status_code=400, detail=f"Excel parsing failed: {str(e)}")
        finally:
            if os.path.exists(temp_excel_path):
                os.remove(temp_excel_path)

    # 2. Collect image paths from directory (if path provided)
    found_paths_by_name = {} # Map: filename -> absolute_path
    if path:
        if not os.path.exists(path):
            raise HTTPException(status_code=400, detail="Provided directory path does not exist")
        
        valid_extensions = ('.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tif', '.tiff')
        for root, dirs, files in os.walk(path):
            for f_name in files:
                if f_name.lower().endswith(valid_extensions):
                    found_paths_by_name[f_name] = os.path.join(root, f_name)

    # 3. Collect absolute paths from Excel
    for img_name, rec in excel_records.items():
        full_p = rec.get("full_path")
        if full_p and os.path.exists(str(full_p)):
            # Excel path takes precedence if it exists
            found_paths_by_name[img_name] = str(full_p)

    if not found_paths_by_name and not excel_records:
        raise HTTPException(status_code=404, detail="No images found in path and no metadata in Excel.")

    records = []
    results = []
    processed_image_names = set()

    # 4. Process all images we found a path for
    for filename, file_path in found_paths_by_name.items():
        processed_image_names.add(filename)
        
        # Extract Metadata
        meta = extract_technical_metadata(file_path)
        
        # Get Excel metadata if available
        excel_meta = excel_records.get(filename, {})
        
        # Try to extract SKU ID from filename as fallback
        sku_fallback = filename.split('_')[0] if '_' in filename else filename.split('.')[0]
        
        record = {
            "image_provided_by": excel_meta.get("image_provided_by", "MFR Image" if "mfr" in file_path.lower() or "mfr" in filename.lower() else "Client Image"),
            "sku_id": excel_meta.get("sku_id", sku_fallback),
            "image_name": filename,
            "status": "Pending",
            "display_order": excel_meta.get("display_order"),
            "notes": excel_meta.get("notes", ""),
            "image_path": file_path,
            **meta
        }
        records.append(record)
        results.append({
            "filename": filename, 
            "status": "Matched" if filename in excel_records else "Scanned",
            "source": "Excel Path" if excel_records.get(filename, {}).get("full_path") == file_path else "Directory Scan"
        })

    # 5. Handle records in Excel but NOT found anywhere (Missing Images)
    for filename, excel_meta in excel_records.items():
        if filename not in processed_image_names:
            record = {
                "image_provided_by": excel_meta.get("image_provided_by", "Unknown"),
                "sku_id": excel_meta.get("sku_id", "Unknown"),
                "image_name": filename,
                "status": "Missing",
                "display_order": excel_meta.get("display_order"),
                "notes": excel_meta.get("notes", "Image file not found"),
                "image_path": None,
                "width": "N/A", "height": "N/A", "resolution": "N/A", "dpi": "N/A",
                "size": "0 KB", "format": "N/A", "color_mode": "N/A", 
                "background": "N/A", "watermark": "N/A"
            }
            records.append(record)
            results.append({"filename": filename, "status": "Missing"})

    save_metadata(session_path, records)
    return {
        "message": f"Processed {len(records)} records ({len(processed_image_names)} images found)", 
        "count": len(records),
        "results": results
    }
