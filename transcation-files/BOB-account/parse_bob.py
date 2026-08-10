"""
Bank of Baroda (BOB) Account PDF Statement -> CSV Converter
Outputs columns: id, date, amount, account, category, note, userName
Compatible with the app's bulk expense import format.

BOB PDF layout (3 lines per UPI transaction):
  Line A  UPI/<ref>/<time>/UPI/<vpa-prefix>
  Line B  DD-MM-YYYY  <withdrawal>  <balance> Cr
  Line C  <vpa-suffix>                              (remainder of VPA, truncated by PDF)

Single-line entries (ATM, NEFT, PRCR, REVERSAL) have the narration embedded in Line B.

Only WITHDRAWAL (debit) rows become expenses.
Credits (salary NEFT, reversals, interest) are skipped.
"""

import pdfplumber
import csv
import glob
import re
import os
import sys

# ── Config ─────────────────────────────────────────────────────────────────────

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

ACCOUNT_NAME = "Bank of Baroda 9136"


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

# Keywords whose presence means the row is a credit (deposit), not an expense
CREDIT_KEYWORDS = (
    "NEFT-KKBK",   # salary inward NEFT
    "REVERSAL",    # UPI reversal (refund)
    "Int.Pd",      # bank interest
    "84120100009136:Int",  # interest line with account number prefix
    "tusharpanchal",       # self-transfer out from own UPI
)

# ── Regex patterns ──────────────────────────────────────────────────────────────

# Line A: UPI narration prefix
#   'UPI/609183475135/11:47:25/UPI/9313980346-2'
UPI_A_RE = re.compile(r"^UPI/(\d+)/\d{2}:\d{2}:\d{2}/(.+)$")

# Line B (amount-only): date + single amount + balance
#   '02-04-2026 25.00 27901.13 Cr'
DATA_AMT_RE = re.compile(r"^(\d{2}-\d{2}-\d{4})\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+Cr$")

# Line B (inline narration): date + narration + amount + balance
#   '18-04-2026 ATM/CASH/610809000513/XXXXXXXXXXXX8344 2000.00 30230.23 Cr'
#   '19-04-2026 UPI/610939740049/16:47:23/REVERSAL 200.00 30210.23 Cr'
#   '25-04-2026 PRCR/ONE97 COMMUNICATIONS L/NOIDA 1607.55 11345.68 Cr'
DATA_INLINE_RE = re.compile(r"^(\d{2}-\d{2}-\d{4})\s+(.+?)\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+Cr$")

# Opening / Closing balance lines — skip entirely
BALANCE_LINE_RE = re.compile(r"^\d{2}-\d{2}-\d{4}\s+(Opening Balance|Closing Balance)")

# Page header / footer / address lines to discard
SKIP_RE = re.compile(
    r"^(MR\.|CUSTOMER ID|Your Account|A summary|Relationship Type|SAVINGS ACCOUNT INR"
    r"|TOTAL \(INR\)|Statement of|PANCHAL TUSHAR|DATE\s+NARRATION|A \d+|BUNGALOW"
    r"|AHMEDABAD|GUJARAT,INDIA|\(CKYC No\.|Page \d+|1800 5[07]00|https://www)",
    re.IGNORECASE,
)

# ── Helpers ─────────────────────────────────────────────────────────────────────

def fmt_date(raw: str) -> str:
    """'02-04-2026' -> '2026-04-02'"""
    dd, mm, yyyy = raw.split("-")
    return f"{yyyy}-{mm}-{dd}"


def fmt_amount(raw: str) -> str:
    return raw.replace(",", "").strip()


def is_credit(text: str) -> bool:
    t = text.upper()
    return any(kw.upper() in t for kw in CREDIT_KEYWORDS)


def vpa_to_name(vpa: str) -> str:
    """
    Turn a UPI VPA like 'paytmqr6rz3hi@ptys' into something readable.
    We keep the full VPA as userName — it's the best identifier we have
    for BOB since merchant names aren't embedded in the narration.
    """
    return vpa.strip("/").strip()


def inline_narr_to_user(narr: str) -> str:
    narr = narr.strip()
    if narr.startswith("ATM/CASH/"):
        return "ATM Cash Withdrawal"
    if narr.startswith("NEFT-"):
        # NEFT-KKBKH26093749365-CEPHEI INFOTECH PRIVATE LIMI
        parts = narr.split("-", 2)
        return parts[2].strip() if len(parts) > 2 else narr
    if narr.startswith("PRCR/"):
        parts = narr.split("/")
        return parts[1].strip() if len(parts) > 1 else narr
    return narr


# ── PDF parsing ─────────────────────────────────────────────────────────────────

def load_lines(pdf_path: str) -> list[str]:
    lines = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            for line in text.splitlines():
                line = line.strip()
                if line and not SKIP_RE.match(line):
                    lines.append(line)
    return lines


def extract_transactions(pdf_path: str) -> list[dict]:
    lines = load_lines(pdf_path)
    transactions = []
    i = 0

    while i < len(lines):
        line = lines[i]

        # Skip opening/closing balance
        if BALANCE_LINE_RE.match(line):
            i += 1
            continue

        # ── UPI multi-line block ───────────────────────────────────────────────
        # Pattern:
        #   i+0  UPI/<ref>/<time>/UPI/<vpa-prefix>
        #   i+1  DD-MM-YYYY <amount> <balance> Cr
        #   i+2  <vpa-suffix>
        m_a = UPI_A_RE.match(line)
        if m_a:
            ref = m_a.group(1)
            vpa_prefix = m_a.group(2)  # e.g. 'UPI/9313980346-2' or 'gpay-toll@okp'

            # Next line should be the data row
            if i + 1 < len(lines) and DATA_AMT_RE.match(lines[i + 1]):
                m_b = DATA_AMT_RE.match(lines[i + 1])
                date_raw, amount_raw, balance = m_b.groups()

                # Line after data row is the VPA suffix (if it's not a new UPI/date line)
                vpa_suffix = ""
                if (i + 2 < len(lines)
                        and not UPI_A_RE.match(lines[i + 2])
                        and not DATA_AMT_RE.match(lines[i + 2])
                        and not DATA_INLINE_RE.match(lines[i + 2])
                        and not BALANCE_LINE_RE.match(lines[i + 2])):
                    vpa_suffix = lines[i + 2]
                    i += 3
                else:
                    i += 2

                # Reconstruct full VPA: prefix ends mid-word, suffix is the rest
                full_vpa = (vpa_prefix + vpa_suffix).strip()

                # Determine if credit
                if is_credit(full_vpa):
                    continue

                transactions.append({
                    "date":     fmt_date(date_raw),
                    "amount":   fmt_amount(amount_raw),
                    "account":  ACCOUNT_NAME,
                    "category": "",
                    "note":     f"UPI:{ref}",
                    "userName": vpa_to_name(full_vpa),
                })
                continue

        # ── Inline single-line entry ───────────────────────────────────────────
        # '18-04-2026 ATM/CASH/... 2000.00 30230.23 Cr'
        # '19-04-2026 UPI/.../REVERSAL 200.00 30210.23 Cr'
        # '25-04-2026 PRCR/ONE97... 1607.55 11345.68 Cr'
        m_inline = DATA_INLINE_RE.match(line)
        if m_inline:
            date_raw, narr, amount_raw, balance = m_inline.groups()

            if is_credit(narr):
                i += 1
                continue

            transactions.append({
                "date":     fmt_date(date_raw),
                "amount":   fmt_amount(amount_raw),
                "account":  ACCOUNT_NAME,
                "category": "",
                "note":     narr.strip(),
                "userName": inline_narr_to_user(narr),
            })
            i += 1
            continue

        # ── NEFT multi-line (narration wraps to next line) ────────────────────
        # 'NEFT-KKBKH26093749365-CEPHEI INFOTECH'
        # '03-04-2026 57800.00 81106.95 Cr'
        # 'PRIVATE LIMI'
        if line.startswith("NEFT-") and i + 1 < len(lines) and DATA_AMT_RE.match(lines[i + 1]):
            m_b = DATA_AMT_RE.match(lines[i + 1])
            date_raw, amount_raw, balance = m_b.groups()
            neft_line = line

            suffix = ""
            if (i + 2 < len(lines)
                    and not UPI_A_RE.match(lines[i + 2])
                    and not DATA_AMT_RE.match(lines[i + 2])
                    and not DATA_INLINE_RE.match(lines[i + 2])
                    and not BALANCE_LINE_RE.match(lines[i + 2])):
                suffix = lines[i + 2]
                i += 3
            else:
                i += 2

            full_narr = (neft_line + " " + suffix).strip()

            # NEFT salary credits — skip
            if is_credit(full_narr):
                continue

            transactions.append({
                "date":     fmt_date(date_raw),
                "amount":   fmt_amount(amount_raw),
                "account":  ACCOUNT_NAME,
                "category": "",
                "note":     full_narr,
                "userName": inline_narr_to_user(full_narr),
            })
            continue

        # ── Interest / account-number lines (no recognisable pattern) — skip ──
        i += 1

    return transactions


# ── CSV writer ──────────────────────────────────────────────────────────────────

FIELDS = ["id", "date", "amount", "account", "category", "note", "userName"]


def write_csv(transactions: list[dict], out_path: str) -> None:
    with open(out_path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDS, extrasaction="ignore")
        writer.writeheader()
        for t in transactions:
            writer.writerow(t)

    print(f"OK {len(transactions)} transactions written -> {out_path}")

    print("\nSample rows (userName | note):")
    for t in transactions[:10]:
        print(f"  {t['date']}  {t['amount']:>10}  {t['userName'][:40]}")


# ── Main ────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    pdf_path, out_path = select_pdf()

    print(f"\nProcessing {os.path.basename(pdf_path)} ...")
    txns = extract_transactions(pdf_path)
    write_csv(txns, out_path)
