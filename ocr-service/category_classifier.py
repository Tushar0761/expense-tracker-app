"""
A simple Naive Bayes text classifier that maps item names -> category IDs.

Training data comes from your expense history (remarks + categoryId).
The model is saved to disk so it persists between restarts.

Why Naive Bayes:
- Works great on short text (item names, remarks)
- Trains instantly even on thousands of examples
- Explainable — easy to understand what it learned
- Ideal first ML model to learn from
"""

import json
import os
import re

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline

MODEL_PATH = os.path.join(os.path.dirname(__file__), "model_data.json")


def _preprocess(text: str) -> str:
    """Lowercase and strip special chars — simple but effective for item names."""
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


class CategoryClassifier:
    def __init__(self):
        self._pipeline: Pipeline | None = None
        self._category_map: dict[str, str] = {}  # id -> name
        self._classes: list[int] = []
        self._load()

    def _load(self):
        if not os.path.exists(MODEL_PATH):
            return
        with open(MODEL_PATH, "r") as f:
            data = json.load(f)
        self._category_map = data.get("category_map", {})
        training_texts = data.get("texts", [])
        training_labels = data.get("labels", [])
        if training_texts and training_labels:
            self._fit(training_texts, training_labels)

    def train(self, examples: list[dict]) -> dict:
        """
        examples: [{"text": "bread milk", "categoryId": 5, "categoryName": "Groceries"}, ...]
        Returns training stats.
        """
        if not examples:
            return {"status": "no_data", "count": 0}

        texts = [_preprocess(e["text"]) for e in examples]
        labels = [e["categoryId"] for e in examples]
        cat_map = {str(e["categoryId"]): e["categoryName"] for e in examples}

        self._category_map = cat_map
        self._fit(texts, labels)

        # Persist training data + category map so we can re-fit on restart
        with open(MODEL_PATH, "w") as f:
            json.dump(
                {"texts": texts, "labels": labels, "category_map": cat_map}, f
            )

        return {
            "status": "trained",
            "count": len(texts),
            "categories": len(set(labels)),
        }

    def _fit(self, texts: list[str], labels: list[int]):
        self._pipeline = Pipeline(
            [
                (
                    "tfidf",
                    TfidfVectorizer(
                        analyzer="char_wb",  # character n-grams — handles typos and partial matches well
                        ngram_range=(2, 4),
                        min_df=1,
                        max_features=5000,
                    ),
                ),
                ("clf", MultinomialNB(alpha=0.5)),
            ]
        )
        self._pipeline.fit(texts, labels)
        self._classes = list(set(labels))

    def predict(self, item_name: str, top_k: int = 3) -> list[dict]:
        """
        Returns top_k predictions: [{"categoryId": int, "categoryName": str, "confidence": float}]
        Returns empty list if model not trained yet.
        """
        if self._pipeline is None:
            return []
        text = _preprocess(item_name)
        proba = self._pipeline.predict_proba([text])[0]
        classes = self._pipeline.classes_

        top_indices = np.argsort(proba)[::-1][:top_k]
        results = []
        for idx in top_indices:
            cat_id = int(classes[idx])
            confidence = float(proba[idx])
            cat_name = self._category_map.get(str(cat_id), "Unknown")
            results.append(
                {
                    "categoryId": cat_id,
                    "categoryName": cat_name,
                    "confidence": round(confidence, 4),
                }
            )
        return results

    def is_trained(self) -> bool:
        return self._pipeline is not None


# Singleton — one classifier instance for the whole service lifetime
classifier = CategoryClassifier()
