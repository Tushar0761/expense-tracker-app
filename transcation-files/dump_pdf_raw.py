import pdfplumber

def dump_pdf(path, label, max_pages=4):
    print(f"\n{'='*70}")
    print(f"=== {label} ===")
    print('='*70)
    with pdfplumber.open(path) as pdf:
        for i, page in enumerate(pdf.pages[:max_pages]):
            print(f"\n--- PAGE {i+1} (of {len(pdf.pages)}) ---")
            text = page.extract_text() or ""
            for line in text.splitlines():
                print(repr(line))

dump_pdf(
    r"c:\Users\Public\Tushar Panchal - personal\Personal Projects\expense-tracker-app\transcation-files\SBI-credit-card\sbi-apr-2026.pdf",
    "SBI APR"
)
dump_pdf(
    r"c:\Users\Public\Tushar Panchal - personal\Personal Projects\expense-tracker-app\transcation-files\BOB-account\bob-apr-2026.pdf",
    "BOB APR"
)
