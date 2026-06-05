"""
GPay PDF Statement → CSV Converter
Outputs columns: id, date, amount, account, category, note, userName
Compatible with the app's bulk expense import format.
"""

import pdfplumber
import csv
import re
import os
import sys

# ── Config ────────────────────────────────────────────────────────────────────

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PDF_PATH   = os.path.join(SCRIPT_DIR, "gpay_statement_20260501_20260531.pdf")
OUT_PATH   = os.path.join(SCRIPT_DIR, "gpay_may_2026_expenses.csv")

MONTH_MAP = {
    "Jan": "01", "Feb": "02", "Mar": "03", "Apr": "04",
    "May": "05", "Jun": "06", "Jul": "07", "Aug": "08",
    "Sep": "09", "Oct": "10", "Nov": "11", "Dec": "12",
}

# Map raw "PaidBy" tokens → readable account names you can match in the app
ACCOUNT_MAP = [
    (r"HDFCBankXX(\d+)",            lambda m: f"HDFC Credit Card XX{m.group(1)}"),
    (r"StateBankofIndiaXX(\d+)",    lambda m: f"SBI Credit Card XX{m.group(1)}"),
    (r"BankofBaroda(\d+)",          lambda m: f"Bank of Baroda {m.group(1)}"),
    (r"FederalBank(\d+)",           lambda m: f"Federal Bank {m.group(1)}"),
    (r"AxisBank(\w+)",              lambda m: f"Axis Bank {m.group(1)}"),
    (r"ICICIBank(\w+)",             lambda m: f"ICICI Bank {m.group(1)}"),
]

# Lines to discard (page headers / footers)
SKIP_RE = re.compile(
    r"^(Transaction statement|Transactionstatementperiod|Date&time"
    r"|Note:|Page\d+of\d+"
    r"|\d{10},?"
    r"|tusharpanchal"
    r"|01April2026.*30April2026"
    r"|Sent\s+Received)$",
    re.IGNORECASE,
)

# ── Helpers ───────────────────────────────────────────────────────────────────

def fmt_date(raw: str) -> str:
    """'01Apr,2026' → '2026-04-01'"""
    m = re.match(r"(\d{2})([A-Za-z]{3}),(\d{4})", raw)
    if not m:
        return raw
    day, mon, year = m.groups()
    return f"{year}-{MONTH_MAP.get(mon.capitalize(), '00')}-{day}"


def fmt_amount(raw: str) -> str:
    """'₹1,597.40' → '1597.40'"""
    return raw.replace("₹", "").replace(",", "").strip()


def fmt_account(raw: str) -> str:
    for pattern, formatter in ACCOUNT_MAP:
        m = re.search(pattern, raw)
        if m:
            return formatter(m)
    # Fallback: clean up the raw string a little
    cleaned = raw.split("|")[0].strip()
    return cleaned


# ── PDF parsing ───────────────────────────────────────────────────────────────

# Line 1:  "01Apr,2026 PaidtoKrishnaDairy ₹68"
LINE1_RE = re.compile(
    r"^(\d{2}[A-Za-z]{3},\d{4})\s+(Paidto|Selftransfer)(.*?)\s+(₹[\d,]+(?:\.\d+)?)$"
)

# Line 2:  "08:28AM UPITransactionID:645800827361"
LINE2_RE = re.compile(r"^\d{1,2}:\d{2}[AP]M\s+UPITransactionID:(\d+)$")

# Line 3:  "PaidbyStateBankofIndiaXX76|RuPaycreditcard"
LINE3_RE = re.compile(r"^Paidby(.+)$")


def extract_transactions(pdf_path: str) -> list[dict]:
    raw_lines: list[str] = []

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            for line in text.splitlines():
                line = line.strip()
                if line and not SKIP_RE.match(line):
                    raw_lines.append(line)

    transactions = []
    i = 0
    while i < len(raw_lines):
        m1 = LINE1_RE.match(raw_lines[i])
        if not m1:
            i += 1
            continue

        date_raw, tx_type, recipient, amount_raw = m1.groups()
        upi_id  = ""
        account = ""

        # Line 2 – UPI ID
        if i + 1 < len(raw_lines):
            m2 = LINE2_RE.match(raw_lines[i + 1])
            if m2:
                upi_id = m2.group(1)
                i += 1

        # Line 3 – Paid by
        if i + 1 < len(raw_lines):
            m3 = LINE3_RE.match(raw_lines[i + 1])
            if m3:
                account = fmt_account(m3.group(1))
                i += 1

        transactions.append({
            "date":            fmt_date(date_raw),
            "amount":          fmt_amount(amount_raw),
            "account":         account,
            "category":        "",
            "note":            f"UPI:{upi_id}" if upi_id else "",
            "userName":        recipient,
            "is_self_transfer": tx_type.lower() == "selftransfer",
        })

        i += 1

    return transactions


# ── CSV writer ────────────────────────────────────────────────────────────────

FIELDS = ["id", "date", "amount", "account", "category", "note", "userName"]


def write_csv(transactions: list[dict], out_path: str) -> None:
    kept    = [t for t in transactions if not t["is_self_transfer"]]
    skipped = len(transactions) - len(kept)

    with open(out_path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDS, extrasaction="ignore")
        writer.writeheader()
        for t in kept:
            writer.writerow(t)

    print(f"✓ {len(kept)} transactions written → {out_path}")
    if skipped:
        print(f"  (skipped {skipped} self-transfer row(s))")

    # Print a summary of unique accounts found
    accounts = sorted({t["account"] for t in kept if t["account"]})
    print("\nAccounts detected (match these to your app account names):")
    for a in accounts:
        print(f"  • {a}")


# ── Main ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    if not os.path.exists(PDF_PATH):
        print(f"ERROR: PDF not found at {PDF_PATH}", file=sys.stderr)
        sys.exit(1)

    txns = extract_transactions(PDF_PATH)
    write_csv(txns, OUT_PATH)
