import os
import re
import json
import logging
import urllib.request
import urllib.error
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session

from app.models.heritage_site import HeritageSite
from app.models.archival_document import ArchivalDocument
from app.schemas.assistant import SourceReference, ChatResponse

logger = logging.getLogger("heritagelens.assistant")

STOP_WORDS = {
    "what", "is", "the", "of", "and", "in", "to", "at", "for", "a", "an", "on", "with",
    "from", "which", "how", "tell", "me", "about", "explain", "describe", "were", "was",
    "are", "by", "that", "this", "these", "those", "does", "did", "do", "can", "could",
    "would", "should", "architectural", "architecture", "heritage", "history", "historical",
    "world", "monument", "monuments", "site", "sites", "century", "built", "records"
}


def extract_keywords(query: str) -> List[str]:
    """Extract clean keywords from user query for SQLite archival search."""
    tokens = re.findall(r"[a-zA-Z0-9]+", query.lower())
    keywords = [t for t in tokens if t not in STOP_WORDS and len(t) >= 3]
    return keywords if keywords else (tokens if tokens else [query.strip().lower()])


def retrieve_relevant_heritage_data(
    query: str,
    db: Session,
    max_sites: int = 4,
    max_docs: int = 3,
) -> Tuple[str, List[SourceReference]]:
    """
    Retrieve matching heritage sites and archival documents from SQLite using keyword relevance.
    Constructs a grounded context string and source references list.
    """
    keywords = extract_keywords(query)
    all_sites = db.query(HeritageSite).all()
    all_docs = db.query(ArchivalDocument).all()

    # 1. Score and rank Heritage Sites
    scored_sites = []
    for site in all_sites:
        score = 0
        site_corpus = f"{site.name} {site.location_name} {site.historical_period} {site.architectural_style} {site.description} {site.significance or ''}".lower()
        
        # Check direct phrase match
        if query.lower().strip() in site_corpus:
            score += 15

        # Check keyword matches with field weighting
        for kw in keywords:
            if kw in site.name.lower():
                score += 8
            elif kw in site.location_name.lower():
                score += 5
            elif kw in site.historical_period.lower() or kw in site.architectural_style.lower():
                score += 4
            elif kw in (site.description or "").lower():
                score += 2
            elif kw in (site.significance or "").lower():
                score += 1

        if score >= 4:
            scored_sites.append((score, site))

    scored_sites.sort(key=lambda x: x[0], reverse=True)
    if scored_sites and scored_sites[0][0] >= 5:
        selected_sites = [s[1] for s in scored_sites[:max_sites]]
    else:
        selected_sites = []

    # 2. Score and rank Archival Documents
    scored_docs = []
    for doc in all_docs:
        score = 0
        text_content = (doc.corrected_text or doc.extracted_text or "").lower()
        title_lower = doc.title.lower()

        if query.lower().strip() in text_content or query.lower().strip() in title_lower:
            score += 15

        for kw in keywords:
            if kw in title_lower:
                score += 7
            elif kw in text_content:
                score += 3

        if score >= 4:
            scored_docs.append((score, doc))

    scored_docs.sort(key=lambda x: x[0], reverse=True)
    if scored_docs and scored_docs[0][0] >= 5:
        selected_docs = [d[1] for d in scored_docs[:max_docs]]
    else:
        selected_docs = []

    # 3. Build Source References
    sources: List[SourceReference] = []
    seen_urls = set()

    for site in selected_sites:
        url = f"/site/{site.id}"
        if url not in seen_urls:
            sources.append(
                SourceReference(
                    id=site.id,
                    type="site",
                    title=site.name,
                    citation=site.sources or f"{site.name} National Archival Record",
                    location=site.location_name,
                    url=url,
                )
            )
            seen_urls.add(url)

    for doc in selected_docs:
        site_id = doc.site_id
        url = f"/site/{site_id}" if site_id else "/archive"
        sources.append(
            SourceReference(
                id=doc.id,
                type="document",
                title=doc.title,
                citation=f"Archival Dossier #{doc.id} ({doc.file_type})",
                location=doc.site.location_name if doc.site else None,
                url=url,
            )
        )

    # 4. Construct Structured Context Text
    context_blocks = []

    for site in selected_sites:
        block = (
            f"--- HERITAGE SITE RECORD #{site.id} ---\n"
            f"Monument Name: {site.name}\n"
            f"Location: {site.location_name} (Coordinates: {site.latitude}, {site.longitude})\n"
            f"Historical Period: {site.historical_period}\n"
            f"Architectural Style: {site.architectural_style}\n"
            f"Description: {site.description}\n"
            f"Significance: {site.significance or 'N/A'}\n"
            f"Verified Archival Sources: {site.sources or 'ASI / UNESCO'}\n"
        )
        context_blocks.append(block)

    for doc in selected_docs:
        doc_text = doc.corrected_text or doc.extracted_text or "No text content."
        if len(doc_text) > 800:
            doc_text = doc_text[:800] + " ... [archival text truncated]"
        block = (
            f"--- ARCHIVAL DIGITIZED DOCUMENT #{doc.id} ---\n"
            f"Document Title: {doc.title}\n"
            f"Associated Monument: {doc.site.name if doc.site else 'General Archive'}\n"
            f"Extracted/Corrected Content:\n{doc_text}\n"
        )
        context_blocks.append(block)

    context_str = "\n".join(context_blocks) if context_blocks else "NO MATCHING ARCHIVAL RECORDS FOUND."
    return context_str, sources


def call_omnirouter_api(
    question: str,
    context_text: str,
    api_key: str,
    base_url: str,
    model: str,
) -> str:
    """
    Execute grounded chat completion against Omnirouter API.
    """
    endpoint = f"{base_url.rstrip('/')}/chat/completions"

    system_prompt = (
        "You are the HeritageLens Cultural Heritage Research Assistant, dedicated to researching and "
        "presenting India's architectural, epigraphic, and historical monuments.\n\n"
        "STRICT GROUNDING RULES:\n"
        "1. Base your answer EXCLUSIVELY on the verified archival records provided in the context.\n"
        "2. If the context does not contain enough information to answer the question, clearly state: "
        "'The HeritageLens archive does not currently contain documented records to verify this query. "
        "Please consult official Archaeological Survey of India (ASI) or UNESCO documentation.'\n"
        "3. NEVER fabricate dates, dynasties, architectural styles, or primary citations.\n"
        "4. Explicitly reference the monument names and verified sources cited in the context.\n"
        "5. Provide an insightful, historically rigorous, and elegant response."
    )

    user_prompt = (
        f"USER QUESTION:\n{question}\n\n"
        f"VERIFIED HERITAGELENS ARCHIVAL RECORDS:\n{context_text}\n\n"
        "Provide a factual, source-grounded answer based strictly on the above records."
    )

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.2,
        "max_tokens": 800,
    }

    req_data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        endpoint,
        data=req_data,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "HeritageLens-Assistant/1.0",
        },
        method="POST",
    )

    with urllib.request.urlopen(req, timeout=20) as response:
        res_bytes = response.read()
        res_json = json.loads(res_bytes.decode("utf-8"))
        answer = res_json["choices"][0]["message"]["content"]
        return answer.strip()


def build_fallback_synthesis(question: str, context_text: str, sources: List[SourceReference]) -> str:
    """
    Synthesize a clean, factual answer directly from retrieved SQLite records
    when AI API credentials are unconfigured or provider is unreachable.
    """
    if not sources or "NO MATCHING ARCHIVAL RECORDS FOUND" in context_text:
        return (
            "The HeritageLens archive does not currently contain documented records to verify this query. "
            "Please consult official Archaeological Survey of India (ASI) or UNESCO documentation."
        )

    lines = [
        f"Based on verified records preserved in the HeritageLens archive regarding \"{question}\":\n"
    ]

    blocks = [b.strip() for b in context_text.split("--- ") if b.strip()]
    for b in blocks[:3]:
        lines_b = b.splitlines()
        name_line = ""
        for line in lines_b:
            if line.startswith("Monument Name:"):
                name_line = line.replace("Monument Name:", "").strip()
                break
            elif line.startswith("Document Title:"):
                name_line = line.replace("Document Title:", "").strip()
                break
        if not name_line and lines_b:
            name_line = lines_b[0].replace("---", "").strip()

        desc_lines = [l for l in lines_b if l.startswith("Description:") or l.startswith("Extracted/Corrected Content:")]
        sig_lines = [l for l in lines_b if l.startswith("Significance:") or l.startswith("Historical Period:")]
        
        lines.append(f"• **{name_line}**:")
        if sig_lines:
            lines.append(f"  {sig_lines[0]}")
        if desc_lines:
            content_snippet = desc_lines[0].replace("Description:", "").replace("Extracted/Corrected Content:", "").strip()
            if len(content_snippet) > 280:
                content_snippet = content_snippet[:280] + "..."
            lines.append(f"  {content_snippet}")
        lines.append("")

    return "\n".join(lines).strip()


def answer_heritage_query(
    question: str,
    conversation_id: str,
    db: Session,
) -> ChatResponse:
    """
    Main entry point for AI Heritage Assistant chat inquiries.
    """
    clean_q = question.strip()
    if not clean_q:
        return ChatResponse(
            answer="Please enter a question regarding India's cultural or architectural heritage.",
            conversation_id=conversation_id,
            sources=[],
            mode="archive_fallback",
            provider_status="operational",
        )

    # 1. Retrieve grounded context from database
    context_text, sources = retrieve_relevant_heritage_data(clean_q, db)

    # 2. Check Omnirouter API configuration
    api_key = os.getenv("OMNIROUTER_API_KEY", "").strip()
    base_url = os.getenv("OMNIROUTER_BASE_URL", "https://api.omnirouter.com/v1").strip()
    model = os.getenv("OMNIROUTER_MODEL", "google/gemini-2.0-flash").strip()

    if not api_key:
        logger.info("OMNIROUTER_API_KEY is not configured. Serving grounded archive synthesis.")
        fallback_answer = build_fallback_synthesis(clean_q, context_text, sources)
        return ChatResponse(
            answer=fallback_answer,
            conversation_id=conversation_id,
            sources=sources,
            mode="archive_fallback",
            provider_status="unconfigured",
            warning=(
                "Omnirouter API credentials are not configured in backend/.env. "
                "Serving factual data directly from the HeritageLens SQLite archive."
            ),
        )

    # 3. Call Omnirouter API with graceful error handling
    try:
        ai_answer = call_omnirouter_api(
            question=clean_q,
            context_text=context_text,
            api_key=api_key,
            base_url=base_url,
            model=model,
        )
        return ChatResponse(
            answer=ai_answer,
            conversation_id=conversation_id,
            sources=sources,
            mode="omnirouter_ai",
            provider_status="operational",
            warning=None,
        )
    except urllib.error.HTTPError as http_err:
        logger.warning(f"Omnirouter HTTP error: {http_err.code} - {http_err.reason}")
        fallback_answer = build_fallback_synthesis(clean_q, context_text, sources)
        return ChatResponse(
            answer=fallback_answer,
            conversation_id=conversation_id,
            sources=sources,
            mode="archive_fallback",
            provider_status="error",
            warning=f"Omnirouter AI provider returned HTTP {http_err.code}. Reverted to local archive synthesis.",
        )
    except Exception as e:
        logger.warning(f"Omnirouter request failed: {e}")
        fallback_answer = build_fallback_synthesis(clean_q, context_text, sources)
        return ChatResponse(
            answer=fallback_answer,
            conversation_id=conversation_id,
            sources=sources,
            mode="archive_fallback",
            provider_status="error",
            warning=f"AI provider communication error ({str(e)}). Reverted to local archive synthesis.",
        )
