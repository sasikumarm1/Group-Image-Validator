import os
import json
from PIL import Image, ImageChops, ImageStat, ImageFilter

def extract_technical_metadata(image_path):
    """
    Extracts technical metadata from an image file using Pillow.
    """
    valid_extensions = ('.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tif', '.tiff')
    if not str(image_path).lower().endswith(valid_extensions):
        return {
            "image_name": os.path.basename(image_path),
            "width": "N/A", "height": "N/A", "resolution": "N/A", "dpi": "N/A",
            "size": "N/A", "format": "N/A", "color_mode": "N/A", "background": "N/A", "watermark": "N/A",
            "status": "Error: Not a supported image format"
        }

    try:
        # Get file size
        filesize = os.path.getsize(image_path)
        filesize_str = f"{filesize / 1024:.2f} KB" if filesize < 1024 * 1024 else f"{filesize / (1024 * 1024):.2f} MB"
        
        with Image.open(image_path) as img:
            # --- Robust DPI Extraction ---
            dpi = None
            
            # 1. Try generic info['dpi']
            dpi = img.info.get('dpi')
            
            # 2. Try JFIF density (JPEG specific)
            if not dpi:
                jfif_density = img.info.get('jfif_density')
                jfif_unit = img.info.get('jfif_unit')
                if jfif_density and jfif_unit:
                    if jfif_unit == 1: # DPI
                        dpi = jfif_density
                    elif jfif_unit == 2: # dots per cm -> DPI
                        dpi = (jfif_density[0] * 2.54, jfif_density[1] * 2.54)

            # 3. Try EXIF data (Comprehensive check)
            if not dpi:
                try:
                    exif = img.getexif()
                    if exif:
                        # Tags: 282=XResolution, 283=YResolution, 296=ResolutionUnit
                        x_res = exif.get(282)
                        y_res = exif.get(283)
                        res_unit = exif.get(296, 2) # Default to inches (2)
                        
                        if x_res and y_res:
                            # Handle rational (tuple of numerator, denominator)
                            x_dpi = x_res[0] / x_res[1] if isinstance(x_res, tuple) and x_res[1] != 0 else float(x_res)
                            y_dpi = y_res[0] / y_res[1] if isinstance(y_res, tuple) and y_res[1] != 0 else float(y_res)
                            
                            if res_unit == 3: # dots per cm
                                x_dpi *= 2.54
                                y_dpi *= 2.54
                            
                            dpi = (x_dpi, y_dpi)
                except:
                    pass

            # Final Cleanup and Default
            if not dpi or (isinstance(dpi, tuple) and (dpi[0] <= 1 or dpi[1] <= 1)):
                dpi = (0, 0)
            elif isinstance(dpi, (int, float)):
                dpi = (float(dpi), float(dpi))
            else:
                # Ensure it's a tuple of floats
                dpi = (float(dpi[0]), float(dpi[1]))
            
            # Detect Color Mode (Enhanced Accuracy)
            mode = img.mode
            w, h = img.size
            color_desc = mode
            bands = img.getbands()
            
            if mode in ['L', '1']:
                color_desc = "B&W"
            elif 'C' in bands and 'M' in bands and 'Y' in bands and 'K' in bands:
                color_desc = "CMYK"
            elif mode == 'CMYK':
                color_desc = "CMYK"
            elif mode in ['RGB', 'RGBA', 'RGBX', 'RGBa']:
                # Use HSV to check for saturation
                hsv_img = img.convert('HSV')
                stat = ImageStat.Stat(hsv_img)
                # Use max saturation to detect even small colorful logos
                if stat.extrema[1][1] < 30: # If max saturation is very low, it's B&W
                    color_desc = "B&W"
                else:
                    color_desc = "RGB"

            # Detect Background (Robust Border Sampling)
            has_bg = "Yes"
            
            # 1. Check for actual transparency
            is_transparent = False
            if mode in ['RGBA', 'LA'] or 'transparency' in img.info:
                alpha = img.convert('RGBA').getchannel('A')
                if alpha.getextrema()[0] < 255:
                    is_transparent = True
            
            # 2. Check for solid white background
            if is_transparent:
                has_bg = "No"  # Transparent = isolated object with no background
            else:
                # Check if it's solid white background (Yes) or anything else (No)
                rgb_img = img.convert('RGB')
                border_w = max(1, int(w * 0.01))
                border_h = max(1, int(h * 0.01))
                
                # Check 4 edges
                edges = [
                    rgb_img.crop((0, 0, w, border_h)), # Top
                    rgb_img.crop((0, h - border_h, w, h)), # Bottom
                    rgb_img.crop((0, 0, border_w, h)), # Left
                    rgb_img.crop((w - border_w, 0, w, h)) # Right
                ]
                
                white_pixels = 0
                total_border_pixels = 0
                for edge in edges:
                    stat = ImageStat.Stat(edge)
                    # "Near white" (RGB > 240)
                    if sum(stat.mean) / 3 > 240:
                        white_pixels += edge.width * edge.height
                    total_border_pixels += edge.width * edge.height
                
                is_solid_white = (white_pixels / total_border_pixels) > 0.9 if total_border_pixels > 0 else False
                
                if is_solid_white:
                    has_bg = "Yes"  # Only white background = has background
                else:
                    has_bg = "No"  # Black, colored, or complex = isolated object

            # 3. Watermark Detection (Enhanced)
            has_watermark = "No"
            gray = img.convert('L')
            edges_img = gray.filter(ImageFilter.FIND_EDGES)
            
            regions_coords = [
                (w*0.25, h*0.25, w*0.75, h*0.75), # Center
                (0, 0, w*0.2, h*0.2),             # Top-Left
                (w*0.8, 0, w, h*0.2),             # Top-Right
                (0, h*0.8, w*0.2, h),             # Bottom-Left
                (w*0.8, h*0.8, w, h)              # Bottom-Right
            ]
            
            watermark_score = 0
            regions_hit = []
            for i, coords in enumerate(regions_coords):
                x1, y1, x2, y2 = coords
                edge_region = edges_img.crop((int(x1), int(y1), int(x2), int(y2)))
                edge_stat = ImageStat.Stat(edge_region)
                
                if edge_stat.mean[0] > 40:
                    color_region = img.crop((int(x1), int(y1), int(x2), int(y2)))
                    hsv_region = color_region.convert('HSV')
                    sat_stat = ImageStat.Stat(hsv_region)
                    max_saturation = sat_stat.extrema[1][1] if len(sat_stat.extrema) > 1 else 0
                    
                    if max_saturation < 40: 
                        watermark_score += 1
                        regions_hit.append(i) 
            
            if 0 in regions_hit:
                has_watermark = "Yes"
            elif len([r for r in regions_hit if r > 0]) >= 3:
                has_watermark = "Yes"
            else:
                has_watermark = "No"

            return {
                "image_name": os.path.basename(image_path),
                "width": img.width,
                "height": img.height,
                "resolution": f"{img.width}x{img.height}",
                "dpi": f"{int(dpi[0])} DPI",
                "size": filesize_str,
                "format": img.format,
                "color_mode": color_desc,
                "background": has_bg,
                "watermark": has_watermark,
                "extraction_status": "Extraction Complete!"
            }
    except Exception as e:
        return {
            "image_name": os.path.basename(image_path) if image_path else "unknown",
            "width": "N/A", "height": "N/A", "resolution": "N/A", "dpi": "N/A",
            "size": "N/A", "format": "N/A", "color_mode": "N/A", "background": "N/A", "watermark": "N/A",
            "extraction_status": f"Error: {str(e)}"
        }
