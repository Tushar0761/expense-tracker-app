# Data Imports

Put your transaction files here before importing through the Data Clinic (`/clinic`).

## GPay CSV Format

Download the template from the Clinic page (**Download CSV Template** button) or use this structure:

```
id,date,amount,account,category,note,userName
,2026-05-01,250,SBI Credit Card XX76,,Petrol,ARJUNPETROLEUM
,2026-05-01,68,SBI Credit Card XX76,,Milk,KrishnaDairy
```

| Column | Required | Format | Example |
|--------|----------|--------|---------|
| `id` | No | Leave blank | *(empty)* |
| `date` | Yes | `yyyy-MM-dd` | `2026-05-01` |
| `amount` | Yes | Number | `250` |
| `account` | Yes | Must match an account name in the app | `SBI Credit Card XX76` |
| `category` | No | Leave blank — auto-assigned by merchant map | *(empty)* |
| `note` | No | Free text | `Petrol` |
| `userName` | Yes | Merchant/payee name from GPay | `ARJUNPETROLEUM` |

### How to export from GPay
1. Open Google Pay app
2. Go to **All transactions** 
3. Use the **Statement** or **Download** option (PDF or CSV)
4. Copy the data into this format — the `note` column is the UPI transaction reference, `userName` is the merchant name

### Auto-assigned merchants (no manual category needed)
These merchant names are recognised automatically with **high confidence**:

| Merchant (userName) | Category assigned | Remarks |
|---|---|---|
| KrishnaDairy | Home > Milk & Dairy | Milk |
| STARBAZAAR / AVENUESUPERMARTSLTD | Home > Groceries | Groceries |
| ARJUNPETROLEUM / PURNIMAMOTORS | Transport > Activa > Petrol | Petrol |
| Rapido / ROPPENTRANSPORTATIONSERVICESPRIVATELIMITED | Transport > Cab & Auto | Rapido |
| AirtelNCMC | Transport > Metro | Metro recharge |
| GUJARATMETRORAILC | Transport > Metro | Metro ticket |
| Zomato | Food & Dining > Outside with Wife | Zomato order |
| SHREYAMEDICALSTORE / KATHVADIYABHAVESHKUMAR | Personal Wellbeing > Health | Medicine |
| RUDRA FASHION / WESTSIDEUNITOFTRENTLIMITED | Shopping > Wife's Shopping | Nilu na Kapda |
| Blinkit / ZEPTOMARKETPLACEPRIVATELIMITED | Home > Groceries | Groceries |
| Adanigaslimited | Home > Utilities | Gas cylinder |
| BAJAJFINANCELTD | Finance (flagged) | Bajaj Finance EMI |
| SBIcardsandPaymentservicesPvtLtd | Finance (flagged) | Credit card bill |

### Special cases — Finance entries
The following are **flagged for review** and not imported as regular expenses:
- `SBIcardsandPaymentservicesPvtLtd` — credit card bill payment (double-counting risk)
- `BAJAJFINANCELTD` — EMI repayment
- Large person-to-person transfers (UtsavPandya, RajShah, etc.)

Use the **Skip** checkbox in the import preview to exclude these.

---

## Files in this folder

| File | Purpose |
|---|---|
| `categories_reference.csv` | All your categories with IDs, hierarchy, and which merchants belong where |
| `README.md` | This file |

Put monthly GPay exports here as: `gpay_YYYY_MM.csv` (e.g. `gpay_2026_04.csv`)
