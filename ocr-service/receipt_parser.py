"""
Parses raw OCR text from a receipt into structured line items.

Strategy:
- Split text into lines
- Look for lines that contain a price pattern (digits with optional decimal)
- Treat the non-price part of that line as the item name
- Skip lines that look like headers, totals, tax, dates, or store info
"""

import re

# Price pattern: optional currency symbol, digits, optional decimal (e.g. 25, 25.50, ₹25.50, Rs25)
PRICE_RE = re.compile(r"(?:rs\.?|₹|inr)?\s*(\d{1,6}(?:[.,]\d{1,2})?)\s*$", re.IGNORECASE)

# Lines to skip — totals, tax, headers, etc.
SKIP_PATTERNS = [
    re.compile(p, re.IGNORECASE)
    for p in [
        r"^\s*total",
        r"^\s*sub[\s\-]?total",
        r"^\s*grand[\s\-]?total",
        r"^\s*tax",
        r"^\s*gst",
        r"^\s*sgst",
        r"^\s*cgst",
        r"^\s*igst",
        r"^\s*discount",
        r"^\s*savings",
        r"^\s*you saved",
        r"^\s*balance",
        r"^\s*change",
        r"^\s*cash",
        r"^\s*card",
        r"^\s*upi",
        r"^\s*invoice",
        r"^\s*bill",
        r"^\s*receipt",
        r"^\s*thank",
        r"^\s*welcome",
        r"^\s*date",
        r"^\s*time",
        r"^\s*phone",
        r"^\s*address",
        r"^\s*gstin",
        r"^\s*mrp",
        r"^\s*qty\b",
        r"^\s*quantity\b",
        r"^\s*item\b",
        r"^\s*description\b",
        r"^\s*rate\b",
        r"^\s*amount\b",
        r"^\s*\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}",  # date lines
        r"^\s*\*+\s*$",  # separator lines
        r"^\s*-+\s*$",
        r"^\s*=+\s*$",
    ]
]

# Lines that are very short or only punctuation — not useful
MIN_NAME_LENGTH = 2


def _should_skip(line: str) -> bool:
    stripped = line.strip()
    if not stripped:
        return True
    for pat in SKIP_PATTERNS:
        if pat.search(stripped):
            return True
    return False


def _clean_name(raw: str) -> str:
    # Remove leading item numbers like "1.", "01 ", "#1 "
    name = re.sub(r"^[\d#]+[.\s]+", "", raw).strip()
    # Remove trailing punctuation except alphanumerics
    name = re.sub(r"[^\w\s()]+$", "", name).strip()
    return name


def parse_receipt_text(text: str) -> list[dict]:
    """
    Returns a list of {"name": str, "amount": float} dicts.
    """
    items = []
    lines = text.splitlines()

    for line in lines:
        if _should_skip(line):
            continue

        # Try to find a price at the end of the line
        match = PRICE_RE.search(line)
        if not match:
            continue

        price_str = match.group(1).replace(",", ".")
        try:
            amount = float(price_str)
        except ValueError:
            continue

        # Skip implausibly tiny or huge amounts (likely noise)
        if amount <= 0 or amount > 100000:
            continue

        # Name is everything before the price match
        raw_name = line[: match.start()].strip()
        name = _clean_name(raw_name)

        if len(name) < MIN_NAME_LENGTH:
            continue

        items.append({"name": name, "amount": amount})

    return items
