import pandas as pd
from typing import List, Dict, Any

def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize column names to match expected format."""
    column_map = {
        "sku id": "sku_id",
        "sku": "sku_id",
        "image name": "image_name",
        "file name": "image_name",
        "image path and name": "full_path",
        "image provided": "image_provided_by",
        "image provided by": "image_provided_by",
        "provider": "image_provided_by"
    }
    
    new_cols = {}
    for col in df.columns:
        norm_col = str(col).lower().strip()
        if norm_col in column_map:
            new_cols[col] = column_map[norm_col]
        else:
            # Keep original name but slugified
            new_cols[col] = norm_col.replace(" ", "_")
            
    return df.rename(columns=new_cols)

def parse_excel(file_path: str) -> List[Dict[str, Any]]:
    """Parse Excel file and return list of records."""
    try:
        if file_path.endswith('.csv'):
            df = pd.read_csv(file_path)
        else:
            df = pd.read_excel(file_path)
            
        df = normalize_columns(df)
        
        # Ensure core columns exist - either image_name OR full_path
        if "image_name" not in df.columns and "full_path" not in df.columns:
            raise ValueError("Excel must contain either 'Image Name' or 'Image Path and Name' column.")
            
        if "sku_id" not in df.columns:
            raise ValueError("Excel must contain 'Sku ID' column.")

        # If image_name is missing but full_path is present, extract it
        if "image_name" not in df.columns and "full_path" in df.columns:
            import os
            df["image_name"] = df["full_path"].apply(lambda x: os.path.basename(str(x)) if pd.notnull(x) else None)
            
        # Convert to records
        records = df.to_dict(orient="records")
        return records
        
    except Exception as e:
        print(f"Error parsing Excel: {e}")
        raise e
