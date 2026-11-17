"""
Bank of Baroda (BOB) Account PDF Statement -> CSV Converter  (v2 layout)
Outputs the same CSV as parse_bob.py: id, date, amount, account, category, note, userName

Use this for statements generated from the "bob World" app from Aug 2026 onward
(header row: "Sr no | Transaction date | Value date | Description | Cheque number |
Debit | Credit | Balance"). Older statements keep using parse_bob.py.

v2 PDF layout, one row per transaction:
  <sr> DD Mon YYYY  DD Mon YYYY  <description>  <debit|->  <credit|->  <balance> CR

When the description is too long it is moved off the data line and wrapped
above and below it, with the data line vertically centred:
  UPI/621885600556/12:11:43/UPI/aryanshinde6039@ok      <- above
  16 06 Aug 2026 06 Aug 2026 10,000.00 - 39,826.54 CR   <- data line
  h                                                     <- below

Wrapped lines are attached to the data line closest to them vertically, so
it does not matter whether neighbouring rows are wrapped or not.

Only DEBIT rows become expenses. Credit rows, and debits that are transfers to
the account holder's own UPI ID, are skipped.
"""

import os
import re
import sys
from datetime import datetime

import pdfplumber

# Shared config/helpers so both parsers produce identical CSVs.
from parse_bob import (
    ACCOUNT_NAME,
    fmt_amount,
    inline_narr_to_user,
    is_credit,
    select_pdf,
    write_csv,
)

# ── Regex patterns ──────────────────────────────────────────────────────────────

DATE = r"\d{2} [A-Z][a-z]{2} \d{4}"
MONEY = r"[\d,]+\.\d{2}"

# '16 06 Aug 2026 06 Aug 2026 10,000.00 - 39,826.54 CR'
# '2 02 Aug 2026 02 Aug 2026 UPI/1037.../UPI/bflautopay@hdfcbank 4,093.00 - 11,253.00 CR'
ROW_RE = re.compile(
    rf"^(?P<sr>\d+)\s+(?P<txn_date>{DATE})\s+(?P<value_date>{DATE})"
    rf"(?:\s+(?P<desc>.*?))?"
    rf"\s+(?P<debit>{MONEY}|-)\s+(?P<credit>{MONEY}|-)"
    rf"\s+(?P<balance>{MONEY})\s+(?P<bal_type>CR|DR)$"
)

# Table boundaries on every page
TABLE_HEADER_RE = re.compile(r"^Sr no\s+Transaction date", re.IGNORECASE)
TABLE_FOOTER_RE = re.compile(r"^(This is a computer-generated|maintained in the bank|Page \d+ of \d+)", re.IGNORECASE)

# 'UPI/621395851257/20:36:05/UPI/pdarshit55.dp@okici'
UPI_RE = re.compile(r"^UPI/(\d+)/\d{2}:\d{2}:\d{2}/(.+)$")


# ── Helpers ─────────────────────────────────────────────────────────────────────

def fmt_date(raw: str) -> str:
    """'01 Aug 2026' -> '2026-08-01'"""
    return datetime.strptime(raw, "%d %b %Y").strftime("%Y-%m-%d")


def to_float(raw: str) -> float:
    return 0.0 if raw == "-" else float(raw.replace(",", ""))


def join_desc(parts: list[str]) -> str:
    """
    UPI VPAs are cut mid-word when they wrap ('gpay-' + 'insurance@okpa'),
    so UPI fragments are glued directly; anything else is joined with spaces
    ('IMPS/P2A/.../Angel One' + 'Limit/W24SPKV4UGC').
    """
    parts = [p for p in parts if p]
    if not parts:
        return ""
    sep = "" if parts[0].startswith("UPI/") else " "
    return sep.join(parts)


# ── PDF parsing ─────────────────────────────────────────────────────────────────

def extract_rows(pdf_path: str) -> list[dict]:
    """Return every table row (debits and credits) with its full description."""
    rows = []

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            lines = page.extract_text_lines()

            # Keep only the lines between the table header and the page footer.
            in_table = False
            table_lines = []
            for ln in lines:
                text = ln["text"].strip()
                if TABLE_HEADER_RE.match(text):
                    in_table = True
                    continue
                if in_table and TABLE_FOOTER_RE.match(text):
                    break
                if in_table and text:
                    table_lines.append((text, (ln["top"] + ln["bottom"]) / 2))

            # Data lines anchor the rows; everything else is a wrapped fragment.
            page_rows = []
            fragments = []
            for text, y in table_lines:
                m = ROW_RE.match(text)
                if m:
                    page_rows.append({**m.groupdict(), "y": y, "above": [], "below": []})
                else:
                    fragments.append((text, y))

            if not page_rows:
                continue

            for text, y in fragments:
                row = min(page_rows, key=lambda r: abs(r["y"] - y))
                (row["above"] if y < row["y"] else row["below"]).append(text)

            for r in page_rows:
                r["desc"] = join_desc(r["above"] + [(r["desc"] or "").strip()] + r["below"])
                rows.append(r)

    return rows


def check_rows(rows: list[dict]) -> None:
    """Warn if serial numbers skip or the running balance doesn't add up."""
    prev = None
    for r in rows:
        if prev is not None:
            if int(r["sr"]) != int(prev["sr"]) + 1:
                print(f"WARNING: serial jumps from {prev['sr']} to {r['sr']} — a row may be missing",
                      file=sys.stderr)
            expected = to_float(prev["balance"]) - to_float(r["debit"]) + to_float(r["credit"])
            if abs(expected - to_float(r["balance"])) > 0.005:
                print(f"WARNING: balance mismatch at row {r['sr']}: expected {expected:.2f}, "
                      f"statement shows {r['balance']}", file=sys.stderr)
        prev = r


def extract_transactions(pdf_path: str) -> list[dict]:
    rows = extract_rows(pdf_path)

    if not rows:
        print("ERROR: no transaction rows found. Is this an older-format statement? "
              "Try parse_bob.py instead.", file=sys.stderr)
        sys.exit(1)

    check_rows(rows)

    transactions = []
    skipped = 0
    for r in rows:
        desc = r["desc"]

        # Credits (salary, refunds, interest, self top-ups) and self-transfers out.
        if r["debit"] == "-" or is_credit(desc):
            skipped += 1
            continue

        m = UPI_RE.match(desc)
        if m:
            note, user = f"UPI:{m.group(1)}", m.group(2).strip()
        else:
            note, user = desc, inline_narr_to_user(desc)

        transactions.append({
            "date":     fmt_date(r["txn_date"]),
            "amount":   fmt_amount(r["debit"]),
            "account":  ACCOUNT_NAME,
            "category": "",
            "note":     note,
            "userName": user,
        })

    print(f"Parsed {len(rows)} rows: {len(transactions)} expenses, {skipped} credits/self-transfers skipped")
    return transactions


# ── Main ────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    pdf_path, out_path = select_pdf()

    print(f"\nProcessing {os.path.basename(pdf_path)} ...")
    txns = extract_transactions(pdf_path)
    write_csv(txns, out_path)
