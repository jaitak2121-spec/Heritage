import io
import os
import unittest
from pathlib import Path
from unittest.mock import patch
from fastapi import HTTPException, UploadFile
from PIL import Image, ImageDraw

import pymupdf
from app.database import engine, Base, SessionLocal
from app.models.heritage_site import HeritageSite
from app.models.archival_document import ArchivalDocument
from app.services.seed import seed_database
from app.routers.documents import (
    upload_document,
    list_documents,
    get_document,
    update_document,
    delete_document,
)
from app.routers.sites import get_sites
from app.schemas.document import DocumentUpdate


class TestDocumentDigitizationPipeline(unittest.IsolatedAsyncioTestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.db = SessionLocal()
        seed_database(cls.db)

        # Ensure SQLite has the migrated columns
        try:
            with engine.connect() as conn:
                cursor = conn.connection.cursor()
                cursor.execute("PRAGMA table_info(archival_documents);")
                cols = [row[1] for row in cursor.fetchall()]
                if "file_path" not in cols:
                    cursor.execute("ALTER TABLE archival_documents ADD COLUMN file_path VARCHAR(500);")
                if "file_size" not in cols:
                    cursor.execute("ALTER TABLE archival_documents ADD COLUMN file_size INTEGER;")
                conn.connection.commit()
        except Exception as e:
            print(f"Notice during test table setup: {e}")

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    async def test_01_upload_pdf_with_selectable_text(self):
        """Test uploading a vector PDF with selectable text extracted via PyMuPDF."""
        doc = pymupdf.open()
        page = doc.new_page()
        test_phrase = "The Brihadisvara Temple granite vimana rises 66 meters with an octagonal sikhara capstone."
        page.insert_text((50, 72), f"ARCHIVAL INSCRIPTION DOSSIER:\n{test_phrase}")
        pdf_bytes = doc.tobytes()
        doc.close()

        upload_file = UploadFile(
            file=io.BytesIO(pdf_bytes),
            filename="brihadisvara_survey.pdf",
            headers={"content-type": "application/pdf"}
        )

        res = await upload_document(
            file=upload_file,
            site_id=5,  # Brihadisvara Temple
            title="Brihadisvara Architectural Survey",
            db=self.db,
        )

        self.assertIsNotNone(res.id)
        self.assertEqual(res.site_id, 5)
        self.assertEqual(res.title, "Brihadisvara Architectural Survey")
        self.assertEqual(res.file_type, "PDF")
        self.assertEqual(res.method, "pymupdf")
        self.assertIn("vimana rises 66 meters", res.extracted_text)
        print(f"✓ test_01_upload_pdf_with_selectable_text passed: Doc #{res.id} extracted via PyMuPDF")

        # Save id for downstream tests
        self.__class__.created_pdf_doc_id = res.id

    async def test_02_upload_image_with_tesseract_ocr(self):
        """Test uploading an image and recognizing text via Tesseract OCR."""
        # Create an image containing clear printed text
        img = Image.new("RGB", (600, 150), color=(255, 255, 255))
        draw = ImageDraw.Draw(img)
        draw.text((20, 50), "CHOLA DYNASTY EPIGRAPHY 1010 CE", fill=(0, 0, 0))

        buf = io.BytesIO()
        img.save(buf, format="PNG")
        img_bytes = buf.getvalue()

        upload_file = UploadFile(
            file=io.BytesIO(img_bytes),
            filename="chola_epigraphy_plate.png",
            headers={"content-type": "image/png"}
        )

        res = await upload_document(
            file=upload_file,
            site_id=5,
            title="Chola Epigraphy Plate",
            db=self.db,
        )

        self.assertIsNotNone(res.id)
        self.assertEqual(res.file_type, "Image")
        self.assertEqual(res.method, "tesseract_ocr")
        self.assertTrue(len(res.extracted_text) > 0)
        self.assertIn("CHOLA", res.extracted_text.upper())
        print(f"✓ test_02_upload_image_with_tesseract_ocr passed: Doc #{res.id} OCR text: '{res.extracted_text.strip()}'")

        self.__class__.created_img_doc_id = res.id

    async def test_03_missing_ocr_dependency_handling(self):
        """Test clear, actionable error handling when Tesseract is unavailable."""
        img = Image.new("RGB", (200, 100), color=(255, 255, 255))
        buf = io.BytesIO()
        img.save(buf, format="JPEG")

        upload_file = UploadFile(
            file=io.BytesIO(buf.getvalue()),
            filename="scanned_ancient_plate.jpg",
            headers={"content-type": "image/jpeg"}
        )

        # Mock is_tesseract_available to simulate a server without Tesseract
        with patch("app.services.extraction.is_tesseract_available", return_value=False):
            with self.assertRaises(HTTPException) as ctx:
                await upload_document(
                    file=upload_file,
                    site_id=1,
                    title="Mock Scan",
                    db=self.db,
                )
            self.assertEqual(ctx.exception.status_code, 422)
            self.assertIn("Tesseract is not installed", ctx.exception.detail)
            self.assertIn("brew install tesseract", ctx.exception.detail)
            print(f"✓ test_03_missing_ocr_dependency_handling passed: HTTP 422 with actionable guidance: {ctx.exception.detail[:60]}...")

    async def test_04_invalid_file_type(self):
        """Test rejection of unsupported file types."""
        fake_bin = b"MZ\x90\x00\x03\x00\x00\x00"
        upload_file = UploadFile(
            file=io.BytesIO(fake_bin),
            filename="malicious_payload.exe",
            headers={"content-type": "application/x-msdownload"}
        )

        with self.assertRaises(HTTPException) as ctx:
            await upload_document(file=upload_file, db=self.db)

        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("Unsupported file format", ctx.exception.detail)
        print("✓ test_04_invalid_file_type passed: rejected .exe format")

    async def test_05_oversized_file(self):
        """Test rejection of oversized documents exceeding 25MB limit."""
        # 26 MB stream simulator without allocating full RAM
        class LargeStream(io.BytesIO):
            def __len__(self):
                return 26 * 1024 * 1024

        large_bytes = b"0" * (26 * 1024 * 1024)
        upload_file = UploadFile(
            file=io.BytesIO(large_bytes),
            filename="massive_historical_volume.pdf",
            headers={"content-type": "application/pdf"}
        )

        with self.assertRaises(HTTPException) as ctx:
            await upload_document(file=upload_file, db=self.db)

        self.assertEqual(ctx.exception.status_code, 413)
        self.assertIn("exceeds the maximum allowed limit of 25 MB", ctx.exception.detail)
        print("✓ test_05_oversized_file passed: rejected 26MB file with HTTP 413")

    def test_06_list_and_get_document(self):
        """Test retrieving document list and single document details."""
        docs = list_documents(site_id=5, db=self.db)
        self.assertGreaterEqual(len(docs), 1)
        first = docs[0]
        self.assertEqual(first.site_id, 5)

        detail = get_document(id=self.created_pdf_doc_id, db=self.db)
        self.assertEqual(detail.id, self.created_pdf_doc_id)
        self.assertIn("vimana", detail.extracted_text)
        print(f"✓ test_06_list_and_get_document passed: retrieved document #{detail.id}")

    def test_07_save_corrected_text(self):
        """Test saving user-corrected text on an existing document."""
        update_payload = DocumentUpdate(
            title="Brihadisvara Epigraph Verified",
            corrected_text="VERIFIED INSCRIPTION: Granite vimana octagonal sikhara calibrated to 1010 CE."
        )

        updated = update_document(id=self.created_pdf_doc_id, payload=update_payload, db=self.db)
        self.assertEqual(updated.title, "Brihadisvara Epigraph Verified")
        self.assertEqual(updated.corrected_text, "VERIFIED INSCRIPTION: Granite vimana octagonal sikhara calibrated to 1010 CE.")
        print(f"✓ test_07_save_corrected_text passed: updated doc #{self.created_pdf_doc_id} with verified text")

    def test_08_search_phrase_in_extracted_text(self):
        """Test that archive search finds heritage sites via extracted or corrected document text."""
        # 1. Search for phrase in raw extracted text
        results_extracted = get_sites(q="vimana rises 66 meters", db=self.db)
        self.assertGreaterEqual(len(results_extracted), 1)
        site_names = [s.name for s in results_extracted]
        self.assertIn("Brihadisvara Temple", site_names)

        # 2. Search for phrase in corrected text
        results_corrected = get_sites(q="calibrated to 1010 CE", db=self.db)
        self.assertGreaterEqual(len(results_corrected), 1)
        self.assertIn("Brihadisvara Temple", [s.name for s in results_corrected])

        print(f"✓ test_08_search_phrase_in_extracted_text passed: found {site_names} via document text search")

    def test_09_delete_document_and_cleanup(self):
        """Test document deletion and physical storage cleanup."""
        doc = self.db.query(ArchivalDocument).filter(ArchivalDocument.id == self.created_img_doc_id).first()
        self.assertIsNotNone(doc)
        stored_path = doc.file_path
        self.assertTrue(os.path.exists(stored_path), f"File {stored_path} should exist on disk before deletion")

        # Delete image doc
        del_res = delete_document(id=self.created_img_doc_id, db=self.db)
        self.assertEqual(del_res["id"], self.created_img_doc_id)
        self.assertFalse(os.path.exists(stored_path), f"File {stored_path} should be deleted from disk")

        # Delete PDF doc
        pdf_doc = self.db.query(ArchivalDocument).filter(ArchivalDocument.id == self.created_pdf_doc_id).first()
        if pdf_doc:
            pdf_path = pdf_doc.file_path
            delete_document(id=self.created_pdf_doc_id, db=self.db)
            if pdf_path:
                self.assertFalse(os.path.exists(pdf_path))

        print(f"✓ test_09_delete_document_and_cleanup passed: docs #{self.created_img_doc_id} and #{self.created_pdf_doc_id} cleanly deleted")


if __name__ == "__main__":
    unittest.main()
