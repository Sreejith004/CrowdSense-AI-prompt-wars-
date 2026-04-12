"""Input sanitization utilities."""
from __future__ import annotations

import re


def sanitize_text(text: str, max_length: int = 500) -> str:
    """Strip dangerous chars and limit length."""
    text = text[:max_length]
    text = re.sub(r"[<>{}]", "", text)
    return text.strip()


def sanitize_id(value: str) -> str:
    """Allow only alphanumeric, hyphens, underscores."""
    return re.sub(r"[^a-zA-Z0-9_\-]", "", value)[:64]
