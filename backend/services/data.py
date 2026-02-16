import json
import os
from typing import List, Dict, Any

METADATA_FILE = "metadata.json"

def get_metadata_path(session_path: str) -> str:
    return os.path.join(session_path, METADATA_FILE)

def load_metadata(session_path: str) -> List[Dict[str, Any]]:
    """Load metadata from the session's JSON file."""
    path = get_metadata_path(session_path)
    if not os.path.exists(path):
        return []
    try:
        with open(path, "r") as f:
            return json.load(f)
    except Exception:
        return []

def save_metadata(session_path: str, data: List[Dict[str, Any]]):
    """Save metadata to the session's JSON file."""
    path = get_metadata_path(session_path)
    with open(path, "w") as f:
        json.dump(data, f, indent=2)

def update_image_record(session_path: str, image_name: str, updates: Dict[str, Any]) -> bool:
    """Update a specific record by image_name."""
    data = load_metadata(session_path)
    updated = False
    for record in data:
        if record.get("image_name") == image_name: # Using image_name as key for now
             # Or use a unique ID if generated
             record.update(updates)
             updated = True
             break
    
    if updated:
        save_metadata(session_path, data)
    return updated
