"""Mock Firestore – dict-based storage, easily swappable with real Firestore."""
from __future__ import annotations

import copy
from typing import Any

from app.utils.logger import get_logger

log = get_logger("mock_firestore")


class MockFirestore:
    """In-memory document store mimicking Firestore interface."""

    def __init__(self) -> None:
        self._collections: dict[str, dict[str, dict[str, Any]]] = {}

    def collection(self, name: str) -> "CollectionRef":
        if name not in self._collections:
            self._collections[name] = {}
        return CollectionRef(self._collections[name], name)


class CollectionRef:
    def __init__(self, store: dict[str, dict[str, Any]], name: str) -> None:
        self._store = store
        self._name = name

    def document(self, doc_id: str) -> "DocumentRef":
        return DocumentRef(self._store, self._name, doc_id)

    def add(self, doc_id: str, data: dict[str, Any]) -> str:
        self._store[doc_id] = copy.deepcopy(data)
        log.info("Added doc %s/%s", self._name, doc_id)
        return doc_id

    def list_all(self) -> list[dict[str, Any]]:
        return [copy.deepcopy(v) for v in self._store.values()]

    def where(self, field: str, op: str, value: Any) -> list[dict[str, Any]]:
        results = []
        for doc in self._store.values():
            doc_val = doc.get(field)
            if op == "==" and doc_val == value:
                results.append(copy.deepcopy(doc))
            elif op == ">=" and doc_val is not None and doc_val >= value:
                results.append(copy.deepcopy(doc))
            elif op == "<=" and doc_val is not None and doc_val <= value:
                results.append(copy.deepcopy(doc))
        return results


class DocumentRef:
    def __init__(self, store: dict[str, dict[str, Any]], col: str, doc_id: str) -> None:
        self._store = store
        self._col = col
        self._doc_id = doc_id

    def get(self) -> dict[str, Any] | None:
        return copy.deepcopy(self._store.get(self._doc_id))

    def set(self, data: dict[str, Any]) -> None:
        self._store[self._doc_id] = copy.deepcopy(data)

    def update(self, data: dict[str, Any]) -> None:
        existing = self._store.get(self._doc_id, {})
        existing.update(data)
        self._store[self._doc_id] = existing

    def delete(self) -> None:
        self._store.pop(self._doc_id, None)


# ── Global singleton ────────────────────────────────────────────────
db = MockFirestore()
