"""
SBI Credit Card PDF Statement → CSV Converter
Outputs columns: id, date, amount, account, category, note, userName
Compatible with the app's bulk expense import format.

Handles: UPI transactions, ASSPL IN (Amazon), and similar debit entries.
Skips: PAYMENT RECEIVED (credits), EMI instalments (M), Interest, IGST charges.
"""

import pdfplumber
import csv
import glob
import re
import os
import sys

# ── Config ────────────────────────────────────────────────────────────────────

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

ACCOUNT_NAME = "SBI Credit Card XX76"


def select_pdf() -> tuple[str, str]:
    """
    List every *.pdf sitting next to this script, let the user pick one by
    index, and return (pdf_path, csv_path). The CSV always takes the chosen
    PDF's own name with a .csv extension.
    """
    pdfs = sorted(glob.glob(os.path.join(SCRIPT_DIR, "*.pdf")))

    if not pdfs:
        print(f"ERROR: no PDF files found in {SCRIPT_DIR}", file=sys.stderr)
        sys.exit(1)

    print(f"\nPDF files in {os.path.basename(SCRIPT_DIR)}:\n")
    for idx, p in enumerate(pdfs, start=1):
        print(f"  [{idx}] {os.path.basename(p)}")

    while True:
        try:
            raw = input(f"\nSelect a file to process [1-{len(pdfs)}] (q to quit): ").strip()
        except EOFError:
            print("\nNo selection (stdin closed). Aborting.", file=sys.stderr)
            sys.exit(1)

        if raw.lower() in ("q", "quit", "exit"):
            print("Aborted.")
            sys.exit(0)

        if raw.isdigit() and 1 <= int(raw) <= len(pdfs):
            chosen = pdfs[int(raw) - 1]
            return chosen, os.path.splitext(chosen)[0] + ".csv"

        print(f"  Invalid choice: enter a number between 1 and {len(pdfs)}.")


MONTH_MAP = {
    "Jan": "01", "Feb": "02", "Mar": "03", "Apr": "04",
    "May": "05", "Jun": "06", "Jul": "07", "Aug": "08",
    "Sep": "09", "Oct": "10", "Nov": "11", "Dec": "12",
}

# Lines to skip (page headers / footers / boilerplate)
SKIP_RE = re.compile(
    r"^(GSTIN|PANCHAL TUSHAR|XXXX XXXX|Total Amount Due|incl\. EMI"
    r"|PLACE OF SUPPLY|Minimum Amount Due|STMT No\.|CKYC No\.|Pay Now"
    r"|Credit Limit|Available Credit|ACCOUNT SUMMARY|Additions|Payments,"
    r"|Previous Balance|Redeemed/Expired|SHOP & SMILE|Date\s+Transaction"
    r"|for Statement Period|Transactions highlighted|C=Credit|Transaction Details"
    r"|Amount \( .* \)|TRANSACTIONS FOR)"
    , re.IGNORECASE,
)

# ── Helpers ───────────────────────────────────────────────────────────────────

def fmt_date(raw: str) -> str:
    """'15 Apr 26' → '2026-04-15'"""
    m = re.match(r"(\d{2})\s+([A-Za-z]{3})\s+(\d{2})$", raw.strip())
    if not m:
        return raw.strip()
    day, mon, yr = m.groups()
    return f"20{yr}-{MONTH_MAP.get(mon.capitalize(), '00')}-{day}"


def fmt_amount(raw: str) -> str:
    """'1,597.00' → '1597.00'"""
    return raw.replace(",", "").strip()


def clean_merchant(raw: str) -> str:
    """'UPI-ARJUN PETROLEUM' → 'ARJUN PETROLEUM'"""
    raw = raw.strip()
    if raw.upper().startswith("UPI-"):
        return raw[4:].strip()
    return raw


# ── Transaction line regex ────────────────────────────────────────────────────
#
# Example lines:
#   '04 Apr 26 UPI-ARJUN PETROLEUM 252.95 D'
#   '13 Apr 26 ASSPL IN 794.00 D'
#   '04 May 26 FP EMI 03/03(EXCL TAX 13.28) 5,360.07 M'
#   '15 Apr 26 PAYMENT RECEIVED 000000000CKT54261HIB8TF 20,803.00 C'
#
# We capture:   date | description | amount | flag (D/C/M)

TX_RE = re.compile(
    r"^(\d{2}\s+[A-Za-z]{3}\s+\d{2})\s+(.+?)\s+([\d,]+\.\d{2})\s+([DCM])$"
)

# ── PDF parsing ───────────────────────────────────────────────────────────────

def extract_transactions(pdf_path: str) -> list[dict]:
    transactions = []

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            for line in text.splitlines():
                line = line.strip()
                if not line or SKIP_RE.match(line):
                    continue

                m = TX_RE.match(line)
                if not m:
                    continue

                date_raw, desc, amount_raw, flag = m.groups()

                # Skip credits (C) and EMI instalments (M)
                if flag in ("C", "M"):
                    continue

                # Skip interest / tax lines (no UPI prefix, contain known keywords)
                desc_upper = desc.upper()
                if any(kw in desc_upper for kw in (
                    "INTEREST ON EMI", "IGST", "ANNUAL FEE",
                    "TRANSFER TO MERCHANT EMI", "GST",
                )):
                    continue

                merchant = clean_merchant(desc)

                transactions.append({
                    "date":    fmt_date(date_raw),
                    "amount":  fmt_amount(amount_raw),
                    "account": ACCOUNT_NAME,
                    "category": "",
                    "note":    desc,
                    "userName": merchant,
                })

    return transactions


# ── CSV writer ────────────────────────────────────────────────────────────────

FIELDS = ["id", "date", "amount", "account", "category", "note", "userName"]


def write_csv(transactions: list[dict], out_path: str) -> None:
    with open(out_path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDS, extrasaction="ignore")
        writer.writeheader()
        for t in transactions:
            writer.writerow(t)

    print(f"OK {len(transactions)} transactions written -> {out_path}")


# ── Main ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    pdf_path, out_path = select_pdf()

    print(f"\nProcessing {os.path.basename(pdf_path)} ...")
    txns = extract_transactions(pdf_path)
    write_csv(txns, out_path)
