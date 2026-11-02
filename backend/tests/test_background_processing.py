import io
import os
import time
import unittest
from unittest.mock import patch

import pymupdf
from fastapi.testclient import TestClient

from app.main import app


class TestBackgroundDocumentProcessing(unittest.TestCase):
    def test_upload_returns_and_persisted_job_reaches_extracted_state(self):
        pdf = pymupdf.open()
        page = pdf.new_page()
        page.insert_text((50, 72), "DURABLE BACKGROUND ARCHIVE EXTRACTION")
        content = pdf.tobytes()
        pdf.close()

        environment = {
            "DOCUMENT_PROCESSING_MODE": "background",
            "DOCUMENT_PROCESSING_WORKERS": "1",
            "CURATOR_PASSWORD": "background-test-password",
            "CURATOR_TOKEN_SECRET": "background-test-secret-with-more-than-thirty-two-characters",
        }
        with patch.dict(os.environ, environment, clear=False), TestClient(app) as client:
            login = client.post("/api/auth/login", json={"password": environment["CURATOR_PASSWORD"]})
            self.assertEqual(login.status_code, 200)
            headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
            upload = client.post(
                "/api/documents/upload",
                headers=headers,
                files={"file": ("background-integration.pdf", io.BytesIO(content), "application/pdf")},
                data={"title": "Background Integration Record"},
            )
            self.assertEqual(upload.status_code, 201, upload.text)
            document_id = upload.json()["id"]

            document = upload.json()
            for _ in range(50):
                if document["processing_status"] in {"extracted", "failed"}:
                    break
                time.sleep(0.05)
                document = client.get(f"/api/documents/{document_id}").json()

            self.assertEqual(document["processing_status"], "extracted", document)
            self.assertIn("BACKGROUND ARCHIVE", document["extracted_text"])
            deleted = client.delete(f"/api/documents/{document_id}", headers=headers)
            self.assertEqual(deleted.status_code, 200)


if __name__ == "__main__":
    unittest.main()
