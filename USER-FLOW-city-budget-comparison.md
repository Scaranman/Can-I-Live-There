# City-to-City Budget Comparison Tool — User Flow

*Single active comparison · Multi-city (≥2) · Local-only storage · No login*

---

## Principles

- **One comparison at a time:** There is no separate “start comparison” step; the default screen is the comparison workspace.
- **Privacy:** User data is stored **locally** on the device (browser storage). No accounts.
- **Fast path:** User should reach meaningful results in **under ~2 minutes** for typical inputs.

---

## Entry point

### Comparison workspace (default)

When the user opens the product:

1. Load the **current comparison** from local storage if one exists; otherwise show an **empty** comparison scaffold (still requiring ≥2 cities before full results).

Primary chrome:

- **Export JSON** — full-fidelity snapshot of the comparison.
- **Export CSV** — spreadsheet-friendly; **one row per city**.
- **Import JSON** — replaces the current comparison with file contents.
- **Reset** — clears local comparison after confirmation.

---

## Primary happy path

### Step 1 — Select cities (Google Places)

1. User searches for **baseline city** via **Places autocomplete** input.
2. User adds **one or more comparison cities** via additional Places inputs (**Add another city**).
3. Constraints:
   - Minimum **2** cities total.
   - Removing a city is blocked when only **2** remain.

Persist per selected city:

- Display label (locality + region as appropriate).
- **`place_id`** and structured location components needed for tax jurisdiction mapping.

### Step 2 — Set baseline

1. User designates exactly **one baseline city** (explicit control, e.g. **Set as baseline**).
2. All **Δ vs baseline** metrics reference this city.

### Step 3 — Column layout — per-city inputs

Cities render as **side-by-side columns** with aligned rows so users can scan differences quickly.

For **each city column**:

#### Income (per city)

- Gross annual salary  
- Bonus (optional)  
- Additional income (optional)  

Optional accelerator:

- **Copy baseline income to all cities**

#### Housing (per city)

User-entered only:

- **Monthly rent** *or* **monthly mortgage** (mutually exclusive).
- Optional: utilities, HOA fees, property taxes.

### Step 4 — Pre-tax payroll contributions (global)

These affect **taxable wages** per city according to tax provider capabilities:

- **401(k)/403(b)** — either:
  - **Fixed amount** + period **Monthly** or **Annual**, **or**
  - **Percent of salary** — applied to **that city’s** salary (deferral dollars may differ when salaries differ).
- **HSA** (optional) — amount + Monthly/Annual.
- **FSA** (optional) — amount + Monthly/Annual.

### Step 5 — Tax settings (global)

- Filing status: **Single**, **Married**, or **Head of household**.

### Step 6 — Monthly expenses (global, line-by-line)

User builds a list of recurring monthly expenses:

- Each row: **Expense name** (free text) + **Monthly amount** (numeric).
- Rows can be added, edited, or removed.
- System shows **total monthly expenses** = sum of all lines.

These expenses apply to **every city’s** monthly budget (same total unless the product later adds per-city overrides — **not part of this flow**).

### Step 7 — Calculate

1. User triggers calculation via **Calculate** and/or **debounced auto-calculate** (implementation choice).

For **each city**, the system:

1. Applies **pre-tax payroll contributions** to payroll/tax inputs as supported.
2. Calls **PayrollTaxAPI** → federal/state/local (if applicable), FICA, Medicare, effective rate, **estimated net pay**.
3. Computes budget:

   - **Take-home (monthly)**  
   - **Housing (monthly)**  
   - **Total monthly expenses** (sum of line items)  
   - **Leftover (monthly)** ≈ take-home − housing − expenses  
   - **Estimated annual savings** — per product/engineering definition (must match UI labels).

4. Computes **Δ vs baseline** for key outputs.

5. Calls **OpenAI** for insights using **only**:

   - user inputs,
   - computed outputs,
   - Places/tax jurisdiction metadata,

   with **no** invented external statistics.

---

## Results experience

### Comparison summary

- Rank or highlight **best / worst** cities for **monthly leftover** and/or **annual savings** (against baseline framing — clarify in UI).
- **Table or cards**: per-city take-home, expenses, leftover, annual savings, **Δ vs baseline**.

### Visualizations

- Income vs expenses by city.
- Leftover / savings comparison across cities.
- Budget breakdown (baseline + selectable city or per-city toggle).

### AI insights panel

- Short bullets: overall summary, risks, opportunities, major tradeoffs (taxes vs housing vs income).
- Must remain tethered to displayed numbers.

---

## Secondary flows

### Persistence (automatic)

- Autosave the **single** comparison continuously to local storage:
  - Places selections + metadata  
  - Per-city income + housing  
  - Global tax settings + pre-tax contributions  
  - Expense line items  
  - Optional: last computed snapshot + timestamp  

### Export JSON

- Downloads structured data for backup or re-import.

### Export CSV

- Flat file: **one row per city**, columns for inputs + outputs + deltas vs baseline (exact columns per engineering spec).

### Import JSON

- Replaces current comparison.
- Show confirmation banner to **recalculate** if taxes/insights depend on fresh API calls.

### Reset

- Confirm dialog → clears local comparison → user starts fresh (still must pick ≥2 cities).

---

## Error & recovery flows

| Situation | Expected UX |
|-----------|-------------|
| Places API unavailable | Banner + retry; pause completion of city selection if needed |
| Tax API fails for one city | Partial results; inline error on that column; **Retry** |
| Tax API fails globally | Clear error; **Retry**; avoid fake tax numbers |
| AI unavailable | Show deterministic results only; **Retry insights** |
| Corrupt / incompatible import | Error message; keep prior local state or offer revert (implementation choice) |

---

## Mobile / narrow viewport (behavioral notes)

- Columns **collapse** to stacked city sections or accordions.
- Export/import/reset may live under a **More** menu.
- Comparison table may become **scrollable** or **card list**.

---

## Related documents

- **PRD:** `PRD-city-to-city-budget-comparison.md`
- **Low-fi wireframes:** `wireframes-city-budget-tool.txt`
