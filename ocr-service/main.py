"""
OCR Receipt Microservice
------------------------
FastAPI service that:
  1. POST /ocr/receipt   — reads a receipt image with Tesseract, parses line items,
                            and predicts categories using the trained ML classifier
  2. POST /ocr/train     — fetches expense history from the NestJS API and re-trains
                            the category classifier
  3. GET  /ocr/status    — health check + training status

Run with:
    uvicorn main:app --reload --port 8000
"""

import io
import os

import pytesseract
import requests
from category_classifier import classifier
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageEnhance, ImageFilter
from receipt_parser import parse_receipt_text

load_dotenv()

# Path to tesseract executable — update this after installing Tesseract on Windows
# Default install path on Windows: C:\Program Files\Tesseract-OCR\tesseract.exe
TESSERACT_CMD = os.getenv(
    "TESSERACT_CMD", r"C:\Program Files\Tesseract-OCR\tesseract.exe"
)
pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD

# NestJS backend URL — used to fetch training data
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:3000")

app = FastAPI(title="Expense Tracker OCR Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://localhost:5174"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _preprocess_image(image: Image.Image) -> Image.Image:
    """
    Improve image quality before passing to Tesseract.
    Steps: convert to grayscale, sharpen, increase contrast.
    This dramatically improves OCR accuracy on phone photos of receipts.
    """
    img = image.convert("L")  # grayscale
    img = img.filter(ImageFilter.SHARPEN)
    enhancer = ImageEnhance.Contrast(img)
    img = enhancer.enhance(2.0)
    return img


@app.post("/ocr/receipt")
async def ocr_receipt(file: UploadFile = File(...)):
    """
    Upload a receipt image. Returns:
    - items: list of {name, amount, predictions (top category suggestions)}
    - total: detected total amount (if found)
    - rawText: full OCR output (useful for debugging)
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    contents = await file.read()
    try:
        image = Image.open(io.BytesIO(contents))
    except Exception:
        raise HTTPException(status_code=400, detail="Could not open image")

    processed = _preprocess_image(image)

    # Run Tesseract — psm 6 = assume a uniform block of text (good for receipts)
    raw_text = pytesseract.image_to_string(
        processed,
        config="--psm 6 --oem 3",
        lang="eng",
    )

    items = parse_receipt_text(raw_text)

    # Attach category predictions to each item
    enriched = []
    for item in items:
        predictions = classifier.predict(item["name"], top_k=3)
        enriched.append(
            {
                "name": item["name"],
                "amount": item["amount"],
                "predictions": predictions,  # top category suggestions with confidence
            }
        )

    # Try to find a "Total" line in the raw text
    total = _extract_total(raw_text)

    return {
        "items": enriched,
        "total": total,
        "rawText": raw_text,
    }


def _extract_total(text: str) -> float | None:
    """Look for a TOTAL line and return its amount."""
    import re

    total_re = re.compile(
        r"(?:grand\s+)?total[:\s]*(?:rs\.?|₹|inr)?\s*(\d{1,6}(?:[.,]\d{1,2})?)",
        re.IGNORECASE,
    )
    for line in text.splitlines():
        m = total_re.search(line)
        if m:
            try:
                return float(m.group(1).replace(",", "."))
            except ValueError:
                continue
    return None


@app.post("/ocr/train")
async def train_classifier():
    """
    Fetch all expenses from the NestJS backend and re-train the category classifier.
    Call this whenever you want to update the model with new data.

    The model learns: "remarks / item name" -> category
    """
    try:
        # Fetch up to 5000 most recent expenses (plenty of training data)
        resp = requests.get(
            f"{BACKEND_URL}/api/expenses",
            params={"limit": 5000, "page": 1, "sortBy": "date", "sortOrder": "desc"},
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        expenses = data.get("data", [])
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Could not fetch expenses from backend: {str(e)}",
        )

    # Build training examples from expense remarks + category
    # We only use expenses that have a remarks field (that's the "item name")
    examples = []
    for exp in expenses:
        text = exp.get("remarks") or ""
        text = text.strip()
        category_id = exp.get("categoryId")
        category_name = exp.get("categoryName") or "Unknown"
        if text and category_id:
            examples.append(
                {"text": text, "categoryId": category_id, "categoryName": category_name}
            )

    if not examples:
        return {
            "status": "no_training_data",
            "message": "No expenses with remarks found. Add some expenses with remarks first.",
        }

    result = classifier.train(examples)
    return result


@app.get("/ocr/status")
async def status():
    return {
        "status": "running",
        "tesseract_cmd": TESSERACT_CMD,
        "model_trained": classifier.is_trained(),
        "backend_url": BACKEND_URL,
    }
