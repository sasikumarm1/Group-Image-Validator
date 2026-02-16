import pandas as pd
from typing import List, Dict, Any

def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize column names to match expected format."""
    column_map = {
        "sku id": "sku_id",
        "sku": "sku_id",
        "image name": "image_name",
        "file name": "image_name",
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
        
        # Ensure required columns exist
        required = ["sku_id", "image_name"]
        missing = [col for col in required if col not in df.columns]
        
        if missing:
            raise ValueError(f"Missing required columns: {', '.join(missing)}")
            
        # Convert to records
        records = df.to_dict(orient="records")
        return records
        
    except Exception as e:
        print(f"Error parsing Excel: {e}")
        raise e
