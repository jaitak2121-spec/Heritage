import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.dialects import postgresql
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.models.archival_document import ArchivalDocument
from app.models.audit_event import CuratorAuditEvent
from app.models.heritage_site import HeritageSite
from app.routers import audit, auth, sites
from app.routers.search import _search_condition, search_archive
from app.security import login_rate_limiter, verify_curator_token
from app.services.storage import LocalDocumentStorage, StorageConfigurationError, get_document_storage
from app.services.document_processing import recover_pending_documents
from app.main import readiness_check


AUTH_ENV = {
    "CURATOR_PASSWORD": "test-curator-password",
    "CURATOR_TOKEN_SECRET": "test-secret-that-is-longer-than-thirty-two-characters",
}


class TestPhaseOneSecurityStorageSearch(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
        )
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.db = self.Session()
        self.site = HeritageSite(
            name="Test Stepwell", description="A protected water architecture archive.",
            historical_period="Medieval", architectural_style="Stepwell", region="West",
            location_name="Gujarat", latitude=23.0, longitude=72.0,
            image_url="https://example.test/stepwell.jpg", significance="Community water system",
        )
        self.db.add(self.site)
        self.db.commit()
        self.db.refresh(self.site)

    def tearDown(self):
        login_rate_limiter.reset()
        self.db.close()
        self.engine.dispose()

    def test_curator_token_and_http_route_protection(self):
        app = FastAPI()
        app.include_router(auth.router)
        app.include_router(sites.router)
        app.include_router(audit.router)

        def override_db():
            yield self.db

        app.dependency_overrides[get_db] = override_db
        payload = {
            "name": "Protected Site", "description": "Created by an authenticated curator.",
            "historical_period": "Modern", "architectural_style": "Civic", "region": "Central",
            "location_name": "India", "latitude": 20.0, "longitude": 78.0,
            "image_url": "https://example.test/site.jpg",
        }
        with patch.dict(os.environ, AUTH_ENV, clear=False):
            client = TestClient(app)
            self.assertEqual(client.post("/api/sites", json=payload).status_code, 401)
            login = client.post("/api/auth/login", json={"password": AUTH_ENV["CURATOR_PASSWORD"]})
            self.assertEqual(login.status_code, 200)
            token = login.json()["access_token"]
            self.assertEqual(verify_curator_token(token).role, "curator")
            created = client.post("/api/sites", json=payload, headers={"Authorization": f"Bearer {token}"})
            self.assertEqual(created.status_code, 201)
            audit_response = client.get("/api/audit", headers={"Authorization": f"Bearer {token}"})
            self.assertEqual(audit_response.status_code, 200)
            actions = {event["action"] for event in audit_response.json()}
            self.assertIn("curator.login", actions)
            self.assertIn("site.create", actions)

    def test_curator_login_is_rate_limited_and_failures_are_audited(self):
        app = FastAPI()
        app.include_router(auth.router)

        def override_db():
            yield self.db

        app.dependency_overrides[get_db] = override_db
        env = {**AUTH_ENV, "CURATOR_LOGIN_MAX_ATTEMPTS": "2", "CURATOR_LOGIN_WINDOW_SECONDS": "60"}
        with patch.dict(os.environ, env, clear=False):
            client = TestClient(app)
            self.assertEqual(client.post("/api/auth/login", json={"password": "wrong"}).status_code, 401)
            self.assertEqual(client.post("/api/auth/login", json={"password": "wrong"}).status_code, 401)
            limited = client.post("/api/auth/login", json={"password": AUTH_ENV["CURATOR_PASSWORD"]})
            self.assertEqual(limited.status_code, 429)
            self.assertIn("Retry-After", limited.headers)
            failures = self.db.query(CuratorAuditEvent).filter_by(action="curator.login", outcome="failure").count()
            self.assertEqual(failures, 2)

    def test_local_storage_round_trip_and_supabase_configuration_failure(self):
        with tempfile.TemporaryDirectory() as directory:
            storage = LocalDocumentStorage(Path(directory))
            storage.store("documents/test.txt", b"heritage", "text/plain")
            target = storage.download_target("documents/test.txt")
            self.assertEqual(target.local_path.read_bytes(), b"heritage")
            storage.delete("documents/test.txt")
            self.assertFalse(target.local_path.exists())

        with patch.dict(os.environ, {"STORAGE_PROVIDER": "supabase", "SUPABASE_URL": "",
                                    "SUPABASE_SERVICE_ROLE_KEY": ""}, clear=False):
            with self.assertRaises(StorageConfigurationError):
                get_document_storage()

    def test_supabase_storage_uses_private_object_api_and_signed_download(self):
        class FakeResponse:
            def __init__(self, body=b"{}"):
                self.body = body

            def __enter__(self):
                return self

            def __exit__(self, *_args):
                return False

            def read(self):
                return self.body

        requests = []

        def fake_urlopen(request, timeout):
            requests.append(request)
            if "/object/authenticated/" in request.full_url:
                return FakeResponse(b"stored-pdf")
            if "/object/sign/" in request.full_url:
                return FakeResponse(b'{"signedURL":"/object/sign/heritage-documents/documents/test.pdf?token=signed"}')
            return FakeResponse()

        env = {
            "STORAGE_PROVIDER": "supabase", "SUPABASE_URL": "https://project.supabase.co",
            "SUPABASE_SERVICE_ROLE_KEY": "service-role-test-key",
            "SUPABASE_STORAGE_BUCKET": "heritage-documents",
        }
        with patch.dict(os.environ, env, clear=False), patch("app.services.storage.urlopen", side_effect=fake_urlopen):
            storage = get_document_storage()
            storage.store("documents/test.pdf", b"pdf", "application/pdf")
            stored = storage.read("documents/test.pdf")
            target = storage.download_target("documents/test.pdf")
            storage.delete("documents/test.pdf")

        self.assertEqual(requests[0].method, "POST")
        self.assertIn("/storage/v1/object/heritage-documents/documents/test.pdf", requests[0].full_url)
        self.assertNotIn("service-role-test-key", requests[0].full_url)
        self.assertEqual(stored, b"stored-pdf")
        self.assertEqual(requests[1].method, "GET")
        self.assertEqual(requests[2].method, "POST")
        self.assertTrue(target.redirect_url.endswith("?token=signed&download="))
        self.assertEqual(requests[3].method, "DELETE")

    def test_search_returns_corrected_document_text_and_site(self):
        documents = [
            ArchivalDocument(
                site_id=self.site.id, title=f"Conservation Notes {index}", file_type="PDF",
                extracted_text="damaged transcription", corrected_text=f"rainwater harvesting gallery {index}",
                processing_status="extracted", review_status="approved", storage_provider="local",
            )
            for index in range(3)
        ]
        self.db.add_all(documents)
        self.db.commit()
        response = search_archive(
            q="rainwater harvesting", period=None, style=None, region=None, offset=0, limit=1, db=self.db
        )
        self.assertEqual(response.total, 4)
        self.assertEqual(response.site_total, 1)
        self.assertEqual(response.document_total, 3)
        self.assertIn(response.documents[0].id, {document.id for document in documents})
        self.assertIn("rainwater harvesting", response.documents[0].excerpt)
        self.assertEqual(response.sites[0].id, self.site.id)
        self.assertTrue(response.has_more)
        next_page = search_archive(
            q="rainwater harvesting", period=None, style=None, region=None, offset=1, limit=1, db=self.db
        )
        self.assertEqual(next_page.sites, [])
        self.assertEqual(len(next_page.documents), 1)
        self.assertTrue(next_page.has_more)

    def test_readiness_checks_database_and_storage_configuration(self):
        with tempfile.TemporaryDirectory() as directory, patch.dict(
            os.environ, {"STORAGE_PROVIDER": "local", "UPLOAD_DIR": directory}, clear=False
        ):
            result = readiness_check(db=self.db)
        self.assertEqual(
            result,
            {"status": "ready", "database": "available", "storage": "local", "document_processing": "inline"},
        )

    def test_postgresql_search_uses_native_full_text_query(self):
        condition = _search_condition(
            "postgresql",
            (ArchivalDocument.title, ArchivalDocument.extracted_text, ArchivalDocument.corrected_text),
            "temple wheel",
        )
        sql = str(select(ArchivalDocument.id).where(condition).compile(dialect=postgresql.dialect()))
        self.assertIn("to_tsvector", sql)
        self.assertIn("websearch_to_tsquery", sql)
        self.assertIn("@@", sql)

    def test_background_recovery_only_resubmits_records_with_originals(self):
        stored = ArchivalDocument(
            title="Queued Original", file_type="PDF", storage_provider="local",
            storage_key="documents/queued.pdf", processing_status="processing",
        )
        text_only = ArchivalDocument(
            title="Seed Text", file_type="PDF", extracted_text="already curated",
            storage_provider="local", processing_status="uploaded",
        )
        self.db.add_all([stored, text_only])
        self.db.commit()
        worker_session = self.Session()
        with patch.dict(os.environ, {"DOCUMENT_PROCESSING_MODE": "background"}, clear=False), patch(
            "app.services.document_processing.SessionLocal", return_value=worker_session
        ), patch("app.services.document_processing.submit_document_processing", return_value=True) as submit:
            recovered = recover_pending_documents()
        self.assertEqual(recovered, 1)
        submit.assert_called_once_with(stored.id)


if __name__ == "__main__":
    unittest.main()
