/**
 * Merchant-to-category mapping engine.
 *
 * Each entry: canonical display name, category ID, suggested remarks, and
 * one or more name patterns (lowercased substrings or regex) that match
 * raw GPay merchant strings.
 *
 * Category IDs match your existing category_master table:
 *   21 = Home > Groceries
 *   22 = Home > Milk & Dairy
 *   23 = Home > Utilities
 *   24 = Home > Maintenance
 *   26 = Transport > Activa (general)
 *   29 = Transport > Metro
 *   30 = Transport > Cab & Auto
 *   34 = Shopping > Household Items
 *   42 = Leisure > Entertainment
 *   44 = Leisure > Travel
 *   46 = Transport > Activa > Petrol
 *   48 = Transport > Activa > Maintenance
 *   50 = Home > Misc
 *   57 = Food & Dining > Personal Meals > Dinner
 *   59 = Food & Dining > Personal Meals > Fast food
 *   63 = Food & Dining > Outside with Wife
 *   66 = Shopping > Wife's Shopping > Cloths
 *   68 = Personal Wellbeing > Health > Medical Sickness
 */

export type MerchantMatch = {
  categoryId: number;
  canonicalName: string;
  remarks: string;
  confidence: 'high' | 'medium' | 'low';
  isTransfer?: boolean; // credit card bills, personal transfers — flag for Finance
  financeSubtype?: 'credit_card_bill' | 'emi' | 'personal_transfer';
};

type MerchantRule = MerchantMatch & {
  patterns: (string | RegExp)[];
};

const RULES: MerchantRule[] = [
  // ── Groceries ──────────────────────────────────────────────────────────────
  {
    categoryId: 21, canonicalName: 'Star Bazaar', remarks: 'Groceries',
    confidence: 'high',
    patterns: ['starbazaar', 'star bazaar'],
  },
  {
    categoryId: 21, canonicalName: 'DMart (Avenue Supermarts)', remarks: 'Groceries',
    confidence: 'high',
    patterns: ['avenuesupermartsltd', 'avenue supermarts'],
  },
  {
    categoryId: 21, canonicalName: 'Blinkit', remarks: 'Groceries',
    confidence: 'high',
    patterns: ['blinkit'],
  },
  {
    categoryId: 21, canonicalName: 'Zepto', remarks: 'Groceries',
    confidence: 'high',
    patterns: ['zeptomarketplace', 'zepto'],
  },
  {
    categoryId: 21, canonicalName: 'Swiggy Instamart', remarks: 'Groceries',
    confidence: 'high',
    patterns: ['swiggy limited', 'swiggy', 'bundl technologies'],
  },
  {
    categoryId: 21, canonicalName: 'OSIA Hyper Retail', remarks: 'Groceries',
    confidence: 'high',
    patterns: ['osiahyperretail', 'osia hyper retail'],
  },
  {
    categoryId: 21, canonicalName: 'Chamunda General Store', remarks: 'Groceries',
    confidence: 'high',
    patterns: ['chamundageneralstore', 'chamunda general store'],
  },
  {
    categoryId: 21, canonicalName: 'Vishwa Provision Store', remarks: 'Groceries',
    confidence: 'high',
    patterns: ['vishwaprovisionstore', 'vishwa provision'],
  },
  {
    categoryId: 21, canonicalName: 'Rational Handloom', remarks: 'Groceries',
    confidence: 'high',
    patterns: ['rationalhandloom', 'rational handloom', 'm/s.rational'],
  },
  {
    categoryId: 21, canonicalName: 'BFT Fruit Traders', remarks: 'Fruits',
    confidence: 'high',
    patterns: ['bftfruittraders', 'bft fruit', 'bftfurit'],
  },

  // ── Milk & Dairy ────────────────────────────────────────────────────────────
  {
    categoryId: 22, canonicalName: 'Krishna Dairy', remarks: 'Milk',
    confidence: 'high',
    patterns: ['krishnadairy', 'krishna dairy'],
  },
  {
    categoryId: 22, canonicalName: 'Milk Vendor (Himmatsih)', remarks: 'Milk',
    confidence: 'high',
    patterns: ['himmatsihbherusih', 'himmatsih', 'mr himmatsih'],
  },
  {
    categoryId: 22, canonicalName: 'Amul', remarks: 'Milk',
    confidence: 'high',
    patterns: ['amul'],
  },
  {
    categoryId: 22, canonicalName: 'Gopi Sweet Dairy Parlour', remarks: 'Milk',
    confidence: 'high',
    patterns: ['gopi sweet dairy', 'gopi dairy'],
  },

  // ── Utilities ───────────────────────────────────────────────────────────────
  {
    categoryId: 23, canonicalName: 'Adani Gas', remarks: 'Gas cylinder',
    confidence: 'high',
    patterns: ['adanigaslimited', 'adani gas'],
  },
  {
    categoryId: 23, canonicalName: 'Vi Mobile Recharge', remarks: 'Mobile recharge',
    confidence: 'high',
    patterns: ['vi prepaid', 'vodafone idea'],
  },
  {
    categoryId: 23, canonicalName: 'AMC (Municipal)', remarks: 'Municipal tax',
    confidence: 'high',
    patterns: ['ahmedabad municipal', 'municipal corporation'],
  },

  // ── Home Maintenance ────────────────────────────────────────────────────────
  {
    categoryId: 24, canonicalName: 'Giriraj Vasan Bhandar', remarks: 'Utensils',
    confidence: 'high',
    patterns: ['girirajvasanbhandar', 'giriraj vasan'],
  },
  {
    categoryId: 24, canonicalName: 'Darshan Developers', remarks: 'Society maintenance',
    confidence: 'medium',
    patterns: ['darshandevelopers', 'darshan developers'],
  },

  // ── Transport: Petrol ───────────────────────────────────────────────────────
  {
    categoryId: 46, canonicalName: 'Arjun Petroleum', remarks: 'Petrol',
    confidence: 'high',
    patterns: ['arjunpetroleum', 'arjun petroleum'],
  },
  {
    categoryId: 46, canonicalName: 'Purnima Motors', remarks: 'Petrol',
    confidence: 'high',
    patterns: ['purnimamotors', 'purnima motors'],
  },

  // ── Transport: Metro ────────────────────────────────────────────────────────
  {
    categoryId: 29, canonicalName: 'Airtel NCMC (Metro)', remarks: 'Metro recharge',
    confidence: 'high',
    patterns: ['airtelncmc', 'airtel ncmc'],
  },
  {
    categoryId: 29, canonicalName: 'Gujarat Metro Rail', remarks: 'Metro ticket',
    confidence: 'high',
    patterns: ['gujaratmetrorailc', 'gujarat metro rail'],
  },

  // ── Transport: Cab & Auto ───────────────────────────────────────────────────
  {
    categoryId: 30, canonicalName: 'Rapido', remarks: 'Rapido',
    confidence: 'high',
    patterns: ['rapido', 'roppentransportation', 'roppen transportation'],
  },

  // ── Food & Dining: Outside with Wife ───────────────────────────────────────
  {
    categoryId: 63, canonicalName: 'Zomato', remarks: 'Zomato order',
    confidence: 'high',
    patterns: ['zomato'],
  },
  {
    categoryId: 63, canonicalName: 'Vadilal Ice Cream', remarks: 'Ice cream with Nilu',
    confidence: 'medium',
    patterns: ['vadilalscoopshop', 'vadilal scoop', 'vadilal'],
  },

  // ── Food & Dining: Fast food ────────────────────────────────────────────────
  {
    categoryId: 59, canonicalName: 'New Karnavati Fast Food', remarks: 'Fast food',
    confidence: 'high',
    patterns: ['newkarnavatifastfood', 'new karnavati fast food', 'new karnavati'],
  },
  {
    categoryId: 59, canonicalName: 'Maharaj Sandwich', remarks: 'Sandwich',
    confidence: 'high',
    patterns: ['maharajsandwich', 'maharaj sandwich'],
  },
  {
    categoryId: 59, canonicalName: 'Balaji Pauva House', remarks: 'Pauva',
    confidence: 'high',
    patterns: ['balajipauvahouse', 'balaji pauva'],
  },
  {
    categoryId: 59, canonicalName: 'Das Live Dhokla', remarks: 'Dhokla',
    confidence: 'high',
    patterns: ['daslivedhokl', 'das live dhokl'],
  },
  {
    categoryId: 59, canonicalName: 'Jalaram Kathiyawadi Dhaba', remarks: 'Dinner',
    confidence: 'high',
    patterns: ['jalaram kathiyawadi'],
  },
  {
    categoryId: 59, canonicalName: 'SAHARSH EXECUTIVE', remarks: 'Canteen meal',
    confidence: 'high',
    patterns: ['saharsh executive'],
  },
  {
    categoryId: 59, canonicalName: 'Day Night Dabeli Vastral', remarks: 'Dabeli',
    confidence: 'high',
    patterns: ['day night dabeli'],
  },
  {
    categoryId: 59, canonicalName: 'Mangleshwar Bakery', remarks: 'Bakery',
    confidence: 'high',
    patterns: ['mangleshwar bakery'],
  },

  // ── Shopping: Wife's Clothes ────────────────────────────────────────────────
  {
    categoryId: 66, canonicalName: 'Rudra Fashion', remarks: 'Nilu na Kapda',
    confidence: 'high',
    patterns: ['rudra fashion'],
  },
  {
    categoryId: 66, canonicalName: 'Trends (Trent)', remarks: 'Nilu na Kapda',
    confidence: 'high',
    patterns: ['trends ahmedabad', 'trentlimited', 'westside'],
  },

  // ── Shopping: Household Items ───────────────────────────────────────────────
  {
    categoryId: 34, canonicalName: 'Rajeshwari Agarbati', remarks: 'Agarbatti',
    confidence: 'high',
    patterns: ['rajeshwari agarbati'],
  },
  {
    categoryId: 34, canonicalName: 'Nageshvari Flour Mill', remarks: 'Flour mill',
    confidence: 'high',
    patterns: ['nageshvari floor', 'nageshvari flour'],
  },
  {
    categoryId: 34, canonicalName: 'Shree Ram Mobile Cover House', remarks: 'Mobile cover',
    confidence: 'high',
    patterns: ['shree ram mobile cover'],
  },

  // ── Health / Medical ────────────────────────────────────────────────────────
  {
    categoryId: 68, canonicalName: 'Shreya Medical Store', remarks: 'Medicine',
    confidence: 'high',
    patterns: ['shreyamedicalstore', 'shreya medical'],
  },
  {
    categoryId: 68, canonicalName: 'Ambika Medical Store', remarks: 'Medicine',
    confidence: 'high',
    patterns: ['ambika medical'],
  },
  {
    categoryId: 68, canonicalName: 'Kathvadiya Bhaveshkumar (Medicine)', remarks: 'Medicine',
    confidence: 'high',
    patterns: ['kathvadiyabhaveshkumar', 'kathvadiya bhaveshkumar'],
  },
  {
    categoryId: 68, canonicalName: 'Aayush Medical', remarks: 'Medicine',
    confidence: 'high',
    patterns: ['aayushmedical', 'aayush medical'],
  },

  // ── Personal Wellbeing: Grooming ────────────────────────────────────────────
  {
    categoryId: 68, canonicalName: 'Vishal Salon', remarks: 'Haircut / grooming',
    confidence: 'medium',
    patterns: ['vishaltheunisexsalon', 'vishal salon', 'unisex salon'],
  },

  // ── Home: Misc (domestic help) ──────────────────────────────────────────────
  {
    categoryId: 50, canonicalName: 'Suresh Dhobi', remarks: 'Dhobi / laundry',
    confidence: 'high',
    patterns: ['suresh dhobi'],
  },
  {
    categoryId: 50, canonicalName: 'Domestic Help', remarks: 'Maid salary',
    confidence: 'medium',
    patterns: ['prajapati tarabenBharatbha', 'prajapatitaraben'],
  },

  // ── Leisure: Entertainment ──────────────────────────────────────────────────
  {
    categoryId: 42, canonicalName: 'Balvatika / Kankariya', remarks: 'Outing with Isha',
    confidence: 'high',
    patterns: ['balvatika fun carnival', 'kankariya'],
  },

  // ── Finance: Credit Card Bills / EMI / Transfers ────────────────────────────
  {
    categoryId: 0, canonicalName: 'SBI Credit Card Bill', remarks: 'SBI card bill payment',
    confidence: 'high', isTransfer: true, financeSubtype: 'credit_card_bill',
    patterns: ['sbicardsandpaymentservices', 'sbi cards and payment'],
  },
  {
    categoryId: 0, canonicalName: 'Bajaj Finance EMI', remarks: 'Bajaj Finance EMI',
    confidence: 'high', isTransfer: true, financeSubtype: 'emi',
    patterns: ['bajajfinanceltd', 'bajaj finance'],
  },
];

/**
 * Normalise a raw merchant/userName string for matching.
 * Remove spaces, lowercase, strip common prefixes like Mr/Mrs/M/S.
 */
function normalise(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/^(mr\.?|mrs\.?|ms\.?|m\/s\.?|m\/s\s*)/i, '')
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export function matchMerchant(userName: string, remarks?: string): MerchantMatch | null {
  const haystack = normalise(userName) + ' ' + normalise(remarks ?? '');

  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      const normalPat =
        typeof pattern === 'string' ? normalise(pattern) : pattern;
      const matched =
        typeof normalPat === 'string'
          ? haystack.includes(normalPat)
          : normalPat.test(haystack);

      if (matched) {
        return {
          categoryId: rule.categoryId,
          canonicalName: rule.canonicalName,
          remarks: rule.remarks,
          confidence: rule.confidence,
          isTransfer: rule.isTransfer,
          financeSubtype: rule.financeSubtype,
        };
      }
    }
  }
  return null;
}

/** Large-amount thresholds that suggest a transfer/bill rather than an expense */
export const TRANSFER_AMOUNT_THRESHOLD = 5000;
