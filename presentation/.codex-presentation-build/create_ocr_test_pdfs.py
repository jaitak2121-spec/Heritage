from pathlib import Path
import random

from PIL import Image, ImageDraw, ImageFont, ImageFilter
from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas


ROOT = Path("/Users/jaitak/Documents/IIT-Hackathon")
OUT = ROOT / "presentation/output/pdf"
TMP = ROOT / "presentation/tmp/pdfs/ocr-tests"
OUT.mkdir(parents=True, exist_ok=True)
TMP.mkdir(parents=True, exist_ok=True)


def selectable_pdf():
    path = OUT / "HeritageLens-OCR-Test-Selectable-Text.pdf"
    c = canvas.Canvas(str(path), pagesize=A4)
    width, height = A4
    c.setFillColor(HexColor("#F7F1E5"))
    c.rect(0, 0, width, height, fill=1, stroke=0)
    c.setFillColor(HexColor("#176F68"))
    c.setFont("Helvetica-Bold", 11)
    c.drawString(52, height - 55, "HERITAGELENS OCR TEST 01")
    c.setFillColor(HexColor("#243037"))
    c.setFont("Times-Bold", 28)
    c.drawString(52, height - 105, "Konark Sun Temple Archive Note")
    c.setFont("Helvetica", 13)
    lines = [
        "Archive Reference: HL-OCR-001",
        "Location: Konark, Odisha, India",
        "Period: Thirteenth century",
        "",
        "The temple was designed as the monumental stone chariot of Surya.",
        "Its sculptural program includes twenty-four carved wheels and seven horses.",
        "Each wheel contains detailed spokes, floral bands, figures and daily-life scenes.",
        "Researchers use these carvings to study architecture, astronomy and social history.",
        "",
        "Verification phrase: HERITAGE WHEEL TWENTY FOUR",
        "Expected extraction method: PyMuPDF selectable text",
    ]
    y = height - 155
    for line in lines:
        c.drawString(52, y, line)
        y -= 25
    c.setFillColor(HexColor("#7B3040"))
    c.setFont("Helvetica-Bold", 12)
    c.drawString(52, 72, "Use this file to test direct PDF text extraction.")
    c.save()


def scanned_pdf():
    pdf_path = OUT / "HeritageLens-OCR-Test-Scanned-Image.pdf"
    img_path = TMP / "scanned-page.jpg"
    page_w, page_h = 1654, 2339
    image = Image.new("RGB", (page_w, page_h), (238, 231, 214))
    draw = ImageDraw.Draw(image)
    title = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 62)
    body = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 35)
    small = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 29)
    draw.text((120, 130), "ARCHIVAL FIELD NOTE - SCANNED COPY", font=title, fill=(45, 47, 45))
    draw.line((120, 220, 1530, 220), fill=(112, 71, 50), width=5)
    lines = [
        "Archive Reference: HL-OCR-002",
        "Site: Great Stupa at Sanchi",
        "Survey Date: 18 November 1912",
        "",
        "The principal stupa is surrounded by a stone railing and four carved gateways.",
        "The northern gateway preserves narrative scenes of pilgrimage and royal patronage.",
        "The monument demonstrates the development of early Buddhist stone architecture.",
        "Weathering is visible along the lower rail and selected sculptural panels.",
        "",
        "Verification phrase: SANCHI NORTHERN GATEWAY 1912",
        "Expected extraction method: Tesseract OCR from an image-only PDF",
    ]
    y = 320
    for line in lines:
        draw.text((135, y), line, font=body if line else small, fill=(48, 48, 45))
        y += 92 if line else 55
    random.seed(26)
    for _ in range(1600):
        x = random.randrange(page_w)
        y = random.randrange(page_h)
        shade = random.randrange(175, 220)
        draw.point((x, y), fill=(shade, shade - 5, shade - 12))
    image = image.rotate(0.35, resample=Image.Resampling.BICUBIC, fillcolor=(238, 231, 214))
    image = image.filter(ImageFilter.GaussianBlur(0.25))
    image.save(img_path, "JPEG", quality=88)

    c = canvas.Canvas(str(pdf_path), pagesize=A4)
    width, height = A4
    c.drawImage(ImageReader(str(img_path)), 0, 0, width=width, height=height)
    c.save()


selectable_pdf()
scanned_pdf()
