import os
import shutil
import logging
from pathlib import Path
from typing import Dict, Any, Optional

logger = logging.getLogger("heritagelens.extraction")

# Suppress harmless ONNX telemetry message if imported by PyMuPDF v2
os.environ.setdefault("ONNXRUNTIME_DISABLE_TELEMETRY", "1")


class OCRUnavailableError(Exception):
    """Raised when an operation requires Tesseract OCR but the binary is not installed."""
    pass


class ExtractionError(Exception):
    """Raised when document parsing fails."""
    pass


def is_tesseract_available() -> bool:
    """
    Check if Tesseract OCR binary and Python bindings are operational.
    """
    try:
        import pytesseract
        # Check if tesseract executable is discoverable in PATH
        tesseract_cmd = shutil.which("tesseract")
        if not tesseract_cmd:
            # Check standard macOS homebrew paths
            for candidate in ["/opt/homebrew/bin/tesseract", "/usr/local/bin/tesseract"]:
                if os.path.exists(candidate) and os.access(candidate, os.X_OK):
                    pytesseract.pytesseract.tesseract_cmd = candidate
                    tesseract_cmd = candidate
                    break

        if not tesseract_cmd:
            return False

        version = pytesseract.get_tesseract_version()
        logger.info(f"Tesseract OCR operational (version {version}) at {tesseract_cmd}")
        return True
    except Exception as e:
        logger.debug(f"Tesseract check failed: {e}")
        return False


def extract_text_from_pdf(file_path: Path, language: str = "eng") -> Dict[str, Any]:
    """
    Extract text from a PDF file using PyMuPDF.
    If the PDF consists of scanned pages without selectable text,
    attempts OCR using Tesseract if installed.
    """
    try:
        import pymupdf
    except ImportError:
        raise ExtractionError("PyMuPDF library is not installed on the server.")

    if not file_path.exists():
        raise ExtractionError(f"File not found: {file_path}")

    try:
        doc = pymupdf.open(str(file_path))
    except Exception as e:
        raise ExtractionError(f"Failed to open PDF document: {str(e)}")

    page_count = len(doc)
    extracted_pages = []

    for i in range(page_count):
        page = doc[i]
        text = page.get_text("text")
        if text and text.strip():
            extracted_pages.append(text.strip())

    combined_text = "\n\n".join(extracted_pages).strip()

    # If selectable text was found, return immediately
    if len(combined_text) > 0:
        doc.close()
        return {
            "success": True,
            "method": "pymupdf",
            "text": combined_text,
            "page_count": page_count,
            "char_count": len(combined_text),
            "message": f"Successfully extracted text from {page_count} pages via PyMuPDF vector text parser.",
        }

    # No selectable text: document is a scanned PDF
    logger.info(f"PDF {file_path.name} contains {page_count} scanned pages with no selectable vector text. Checking OCR.")
    if not is_tesseract_available():
        doc.close()
        raise OCRUnavailableError(
            "This PDF contains scanned pages with no embedded selectable text. "
            "Optical Character Recognition (OCR) is required, but Tesseract is not installed on this server. "
            "Please install Tesseract ('brew install tesseract' or 'apt-get install tesseract-ocr') to process scanned archives."
        )

    # Perform OCR page by page
    try:
        import pytesseract
        from PIL import Image
        import io

        ocr_pages = []
        for i in range(page_count):
            page = doc[i]
            # Render page to high-res pixmap (matrix scale for OCR readability)
            zoom = 2.0  # 144 DPI equivalent for clear character edges
            mat = pymupdf.Matrix(zoom, zoom)
            pix = page.get_pixmap(matrix=mat)
            img = Image.open(io.BytesIO(pix.tobytes("png")))
            ocr_text = pytesseract.image_to_string(img, lang=language)
            if ocr_text and ocr_text.strip():
                ocr_pages.append(ocr_text.strip())

        doc.close()
        combined_ocr = "\n\n".join(ocr_pages).strip()

        if not combined_ocr:
            raise ExtractionError("Tesseract OCR completed scanning the PDF but found no readable text.")

        return {
            "success": True,
            "method": "tesseract_ocr",
            "text": combined_ocr,
            "page_count": page_count,
            "char_count": len(combined_ocr),
            "message": f"Successfully extracted text from {page_count} scanned pages via Tesseract OCR.",
        }
    except OCRUnavailableError:
        raise
    except Exception as e:
        if not doc.is_closed:
            doc.close()
        raise ExtractionError(f"OCR processing failed for scanned PDF: {str(e)}")


def extract_text_from_image(file_path: Path, language: str = "eng") -> Dict[str, Any]:
    """
    Extract text from an image file (PNG, JPG, TIFF) using Tesseract OCR.
    """
    if not is_tesseract_available():
        raise OCRUnavailableError(
            "Image files require Optical Character Recognition (OCR), but Tesseract is not installed on this server. "
            "Please install Tesseract ('brew install tesseract' or 'apt-get install tesseract-ocr') to enable image digitization."
        )

    try:
        import pytesseract
        from PIL import Image

        img = Image.open(str(file_path))
        ocr_text = pytesseract.image_to_string(img, lang=language)
        text = ocr_text.strip()

        if not text:
            raise ExtractionError("Tesseract OCR scanned the image but could not identify any readable textual characters.")

        return {
            "success": True,
            "method": "tesseract_ocr",
            "text": text,
            "page_count": 1,
            "char_count": len(text),
            "message": f"Successfully extracted {len(text)} characters via Tesseract OCR.",
        }
    except OCRUnavailableError:
        raise
    except ExtractionError:
        raise
    except Exception as e:
        raise ExtractionError(f"Image OCR processing failed: {str(e)}")


def extract_document_text(file_path: Path, original_filename: str, language: str = "eng") -> Dict[str, Any]:
    """
    Unified extraction router based on file extension.
    """
    suffix = file_path.suffix.lower()
    if suffix == ".pdf":
        return extract_text_from_pdf(file_path, language)
    elif suffix in [".png", ".jpg", ".jpeg", ".tiff", ".tif"]:
        return extract_text_from_image(file_path, language)
    else:
        raise ExtractionError(f"Unsupported file format '{suffix}'. Accepted types: .pdf, .png, .jpg, .jpeg, .tiff")
