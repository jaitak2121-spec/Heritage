import io
import json
import unittest
from unittest.mock import patch, MagicMock
import urllib.error
from fastapi import HTTPException

from app.database import engine, Base, SessionLocal
from app.models.heritage_site import HeritageSite
from app.models.archival_document import ArchivalDocument
from app.services.seed import seed_database
from app.routers.assistant import chat_with_assistant
from app.schemas.assistant import ChatRequest
from app.services.assistant import retrieve_relevant_heritage_data


class TestAIAssistant(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        cls.db = SessionLocal()
        seed_database(cls.db)

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    def test_01_empty_question_validation(self):
        """Test rejection of empty or whitespace questions."""
        with self.assertRaises(HTTPException) as ctx:
            chat_with_assistant(ChatRequest(question="   "), db=self.db)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertIn("Question cannot be empty", ctx.exception.detail)
        print("✓ test_01_empty_question_validation passed: rejected empty question with HTTP 400")

    def test_02_retrieval_from_existing_heritage_sites(self):
        """Test keyword-based context retrieval from the 11 seeded heritage monuments."""
        query = "What is the architectural significance of the Konark Sun Temple wheel?"
        context, sources = retrieve_relevant_heritage_data(query, db=self.db)

        self.assertIn("Konark Sun Temple", context)
        self.assertIn("Puri, Odisha", context)
        self.assertIn("Kalinga", context)
        self.assertTrue(any(s.title == "Konark Sun Temple" for s in sources))
        self.assertTrue(any(s.url == "/site/6" for s in sources))
        print(f"✓ test_02_retrieval_from_existing_heritage_sites passed: retrieved {len(sources)} sources including Konark")

    def test_03_retrieval_from_digitized_documents(self):
        """Test retrieval of newly digitized archival documents attached to monuments."""
        # Create a document record with unique historical terms
        test_doc = ArchivalDocument(
            site_id=1,  # Taj Mahal
            title="Parchin Kari Pietra Dura Architectural Ledger",
            file_type="PDF",
            original_filename="parchin_kari_ledger.pdf",
            extracted_text="Mughal lapidary craftsmen in Agra utilized imported Italian Florentine commesso di pietre dure techniques.",
            corrected_text="Mughal lapidary craftsmen in Agra utilized imported Italian Florentine commesso di pietre dure techniques with carnelian inlays.",
        )
        self.db.add(test_doc)
        self.db.commit()
        self.db.refresh(test_doc)

        query = "Where was Florentine commesso di pietre dure used in Mughal monuments?"
        context, sources = retrieve_relevant_heritage_data(query, db=self.db)

        self.assertIn("Parchin Kari Pietra Dura Architectural Ledger", context)
        self.assertTrue(any("Pietra Dura" in s.title for s in sources))
        print("✓ test_03_retrieval_from_digitized_documents passed: digitized document successfully retrieved into context")

        # Clean up test document
        self.db.delete(test_doc)
        self.db.commit()

    def test_04_missing_api_key_graceful_fallback(self):
        """Test graceful archive fallback when OMNIROUTER_API_KEY is not set."""
        with patch.dict("os.environ", {"OMNIROUTER_API_KEY": ""}):
            req = ChatRequest(
                question="Which dynasties contributed to the rock-cut cave temples of Ellora?",
                conversation_id="test-session-ellora",
            )
            res = chat_with_assistant(req, db=self.db)

            self.assertEqual(res.mode, "archive_fallback")
            self.assertEqual(res.provider_status, "unconfigured")
            self.assertIsNotNone(res.warning)
            self.assertIn("Omnirouter API credentials are not configured", res.warning)
            self.assertGreaterEqual(len(res.sources), 1)
            self.assertTrue(any("Ellora" in s.title for s in res.sources))
            self.assertIn("Ellora Caves", res.answer)
            print("✓ test_04_missing_api_key_graceful_fallback passed: returned grounded fallback with verified sources")

    def test_05_mocked_omnirouter_api_success(self):
        """Test successful Omnirouter AI completion with mocked network response."""
        mock_response_data = {
            "choices": [
                {
                    "message": {
                        "content": "The Konark Sun Temple in Puri, Odisha is renowned for its 24 monumental chariot wheels carved from stone, which function as precise sundials calibrated to solar movements."
                    }
                }
            ]
        }
        mock_bytes = json.dumps(mock_response_data).encode("utf-8")

        mock_cm = MagicMock()
        mock_cm.read.return_value = mock_bytes
        mock_cm.__enter__.return_value = mock_cm

        with patch.dict("os.environ", {"OMNIROUTER_API_KEY": "test-mock-key"}):
            with patch("urllib.request.urlopen", return_value=mock_cm):
                req = ChatRequest(
                    question="Explain the Konark Sun Temple chariot wheels",
                    conversation_id="test-session-mock-ai",
                )
                res = chat_with_assistant(req, db=self.db)

                self.assertEqual(res.mode, "omnirouter_ai")
                self.assertEqual(res.provider_status, "operational")
                self.assertIsNone(res.warning)
                self.assertIn("24 monumental chariot wheels", res.answer)
                self.assertTrue(any("Konark" in s.title for s in res.sources))
                print("✓ test_05_mocked_omnirouter_api_success passed: synthesized answer with sources via Omnirouter")

    def test_06_provider_failure_graceful_fallback(self):
        """Test graceful fallback when Omnirouter API returns an HTTP error or is unreachable."""
        http_error = urllib.error.HTTPError(
            url="https://api.omnirouter.com/v1/chat/completions",
            code=502,
            msg="Bad Gateway",
            hdrs={},
            fp=io.BytesIO(b"Provider temporarily unavailable"),
        )

        with patch.dict("os.environ", {"OMNIROUTER_API_KEY": "test-mock-key"}):
            with patch("urllib.request.urlopen", side_effect=http_error):
                req = ChatRequest(
                    question="What construction materials were used in Hampi ruins?",
                    conversation_id="test-session-error-fallback",
                )
                res = chat_with_assistant(req, db=self.db)

                # Must not crash! Reverts gracefully to local archive evidence
                self.assertEqual(res.mode, "archive_fallback")
                self.assertEqual(res.provider_status, "error")
                self.assertIn("Omnirouter AI provider returned HTTP 502", res.warning)
                self.assertGreaterEqual(len(res.sources), 1)
                self.assertTrue(any("Hampi" in s.title for s in res.sources))
                self.assertIn("Hampi Ruins", res.answer)
                print("✓ test_06_provider_failure_graceful_fallback passed: handled HTTP 502 gracefully without crashing")

    def test_07_unrelated_query_no_hallucination(self):
        """Test that out-of-scope queries do not hallucinate and indicate lack of records."""
        with patch.dict("os.environ", {"OMNIROUTER_API_KEY": ""}):
            req = ChatRequest(
                question="Who won the 2024 Formula 1 World Championship?",
                conversation_id="test-session-unrelated",
            )
            res = chat_with_assistant(req, db=self.db)
            self.assertIn("does not currently contain documented records", res.answer)
            print("✓ test_07_unrelated_query_no_hallucination passed: no hallucination on out-of-scope query")


if __name__ == "__main__":
    unittest.main()
