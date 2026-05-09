# City-to-City Budget Comparison Tool  
## Product Requirements Document (PRD) — Revised

*Aligned with updated MVP user flow: multi-city comparison, Google Places, per-city income, line-item expenses, pre-tax payroll contributions (including %‑based 401(k)), local-only storage, and CSV/JSON export.*

---

## 1. Product Summary

### Overview

The **City-to-City Budget Comparison Tool** helps users compare how their **personal finances** would look across **multiple cities** at once—not generic cost-of-living averages.

Users:

- Select **two or more cities** using **Google Places** search (locality-based selection with structured place metadata).
- Enter **income per city** (to support different offers or scenarios).
- Configure **housing per city**.
- Enter **global recurring monthly expenses** as **custom line items** (name + amount).
- Optionally specify **pre-tax payroll contributions** (401(k)/403(b), HSA, FSA), including **percentage-based** 401(k).

The product computes (per city):

- Post-tax income (via integrated tax engine).
- Total monthly expenses (housing + line-item expenses).
- Monthly leftover (“disposable”) income and estimated annual savings.
- **Relative differences vs a user-chosen baseline city.**

It also generates **AI-powered insights** that explain tradeoffs using **only** user inputs, computed outputs, and known tax/location context.

**Core question:** *“How does my actual budget change if I’m in City A vs City B vs City C?”*

### MVP posture

- **No login.** No cloud user profiles for MVP.
- **One active comparison at a time**, persisted **locally** on the device (browser storage).
- **Fast time-to-value:** meaningful results in **under ~2 minutes** for typical inputs.

---

## 2. Problem Statement

Most cost-of-living calculators:

- Rely on generalized averages.
- Ignore realistic taxes (federal/state/local/FICA/Medicare).
- Fail to reflect **user-specific** recurring expenses.
- Struggle with **multi-city** comparisons beyond two locations.

Users evaluating relocation or competing offers need:

- **Personalized** affordability comparisons grounded in **their** budget lines.
- **Per-city income** when offers differ by location.
- **Multi-city** ranking and deltas vs a baseline.
- **Explainable** outputs and actionable narrative insights.

---

## 3. Goals & Non-Goals

### Goals

- Compare monthly budgets across **N cities** (minimum **2**).
- Support **Places-backed city selection** with durable identifiers (`place_id`) and display labels.
- Calculate realistic **post-tax income** per city using a payroll/tax provider.
- Present **side-by-side (column) inputs** for cities for fast scanning.
- Support **pre-tax payroll contributions**, including **401(k) as % of salary** or fixed amount (monthly/annual).
- Capture expenses as **line-by-line** monthly items (name + amount).
- Show differences in disposable income and savings vs **baseline**.
- Generate **AI insights** grounded strictly in inputs + computed results + location/tax context.
- Allow **export** of the single comparison as **JSON** (full fidelity) and **CSV** (spreadsheet-friendly).

### Non-Goals (MVP)

- Apartment search / listings.
- Housing intelligence, neighborhood analysis, real estate analytics.
- Investment planning, banking integrations, credit integrations.
- Multi-user collaboration, accounts, or synced history across devices.
- Contractor / 1099 taxes, international comparisons *(future)*.

---

## 4. Target Users

### Primary users

- Remote workers comparing locations.
- Professionals considering relocation.
- Candidates comparing **multiple offers / metros**.
- Freelancers evaluating relocation feasibility *(still W‑2-oriented tax scope for MVP unless expanded later)*.

---

## 5. MVP Scope

### 5.1 Inputs

#### A. Cities (via Google Places)

- User selects **baseline city** and **one or more comparison cities**.
- Minimum **2** cities total; remove actions disabled when at minimum.
- Selecting a city stores:

  - Display label (city/locality + region as appropriate).
  - `place_id` and structured components needed for tax jurisdiction mapping.

#### B. Income (per city)

For **each city column**:

- Gross annual salary.
- Bonus income (optional).
- Additional income (optional).

**Accelerator (optional UX):** “Copy baseline income to all cities.”

#### C. Pre-tax payroll contributions (global)

Applies to tax calculations **per city** (pre-tax reduces taxable wages as supported by the tax provider/API inputs):

- **401(k)/403(b)** contribution:

  - **Fixed amount** with period **Monthly** or **Annual**, **or**
  - **Percent of salary**, computed against **that city’s** gross salary (and optionally bonus rules—product must define consistently and disclose in UI copy).

- **HSA** contribution (optional): amount + Monthly/Annual.
- **FSA** contribution (optional): amount + Monthly/Annual.

**Note:** If salaries differ by city, **percentage-based 401(k)** yields **different dollar deferrals** per city by design.

#### D. Tax settings (global)

- Filing status:

  - Single  
  - Married  
  - Head of household  

#### E. Housing (per city)

User-entered only:

- Monthly rent **or** mortgage payment (mutually exclusive selection).
- Optional: utilities, HOA fees, property taxes.

#### F. Monthly expenses (global, line-by-line)

A repeatable list of rows:

- **Expense name** (free text)
- **Monthly amount** (numeric)

System derives:

- **Total monthly expenses** = sum of line items (same total applied to each city’s monthly budget unless future per-city overrides are introduced—**not in MVP unless explicitly added later**).

---

### 5.2 Outputs

#### Financial outputs (per city)

- Estimated take-home pay (**monthly** and/or annual—pick one primary display, keep the other accessible).
- Housing total (monthly).
- Total monthly expenses (line items).
- Monthly leftover income.
- Estimated annual savings (define formula explicitly in engineering spec; e.g., leftover × 12, unless savings goals are modeled separately—**MVP uses leftover-based proxy unless PRD amended**).
- **Delta vs baseline** for key metrics (take-home, expenses, leftover, annual savings).

#### Visual outputs

- Budget breakdown charts (per city and/or selectable city).
- Income vs expenses comparison across cities.
- Savings / leftover comparison across cities.

#### AI insights

Examples (illustrative):

- “Your leftover cash is highest in **City X** primarily due to lower housing vs **baseline**, despite higher taxes.”
- “A higher salary in **City Y** is partly offset by taxes and housing—net leftover changes by ~$Z/month.”

**Hard constraint:** insights must only reference:

- user inputs,
- computed outputs,
- known tax/location metadata,

…and must not invent external statistics.

---

## 6. User Experience & Primary Flow

### 6.1 Entry & persistence

- Default screen is the **Comparison Workspace** for the **single active comparison**.
- Autosave locally (localStorage and/or IndexedDB—engineering decision).
- Header actions: **Export JSON**, **Export CSV**, **Import JSON** (replace current), **Reset** (confirm destructive clear).

### 6.2 Layout principle

- Cities are represented as **columns** with aligned rows for Income, Housing, and output previews.

### 6.3 Primary flow

1. User selects cities via **Places search fields**; adds additional cities until satisfied (≥ 2).
2. User sets **baseline** city (explicit control).
3. User enters **per-city income** and **per-city housing**.
4. User configures **global filing status** and **pre-tax payroll contributions** (including optional **% 401(k)**).
5. User adds **monthly expense lines** (name + amount).
6. User triggers calculation (manual button and/or debounced auto-calc—engineering choice).
7. System computes taxes per city and aggregates expenses; displays comparison table/cards/charts.
8. System generates AI insights.
9. User exports **CSV** and/or **JSON** as needed.

### 6.4 Error & edge handling (UX requirements)

- Places unavailable: clear banner + retry; block city selection completion gracefully.
- Tax provider failure **for a city**: show partial results + per-city retry; do not silently substitute guessed taxes.
- AI failure: show deterministic results + retry insights.

---

## 7. Functional Requirements

### 7.1 Tax engine

**Provider:** PayrollTaxAPI (or equivalent—maintain provider abstraction).

Must compute per city (as supported by provider inputs):

- Federal income tax  
- State income tax  
- Local/city tax (when applicable)  
- FICA  
- Medicare  
- Effective tax rate  
- Estimated net pay  

Must incorporate **pre-tax payroll contributions** according to provider capabilities and documented assumptions.

### 7.2 Expense comparison engine

- Sum line-item monthly expenses globally.
- For each city:

  \[
  \text{leftover}_{\text{month}} \approx \text{net pay}_{\text{month}} - \text{housing}_{\text{month}} - \text{expenses}_{\text{month}}
  \]

  (Exact definitions belong in eng spec; align UI labels to math.)

### 7.3 AI insight service

**Provider:** OpenAI Platform.

Requirements:

- Summarize affordability differences across cities vs baseline.
- Identify budget risks/opportunities grounded in user-provided expenses and computed deltas.
- Explain major tradeoffs (taxes vs housing vs income differences).

### 7.4 Places service

**Provider:** Google Places API (Autocomplete + Place Details as needed).

Requirements:

- Restrict/typeahead to city/locality resolution appropriate for tax mapping.
- Persist stable identifiers for reproducibility and exports.

### 7.5 Export

#### JSON export

Full-fidelity representation of the single comparison:

- Cities + Places metadata  
- Per-city income + housing  
- Global tax settings + pre-tax contributions configuration  
- Expense line items  
- Optional embedded last computed snapshot + timestamps  

#### CSV export

Flattened, spreadsheet-friendly export:

- **One row per city**
- Columns include baseline flag, inputs, computed outputs, deltas vs baseline (exact column list defined in eng spec).

---

## 8. UI Framework & Accessibility

- **React** + **Next.js** + **Tailwind CSS**
- Component interactions built with **React Aria** for accessibility baseline.

---

## 9. Technical Architecture (MVP-aligned)

### Frontend

- Next.js (React) SPA/pages for the workspace UI.
- Client-side persistence for the active comparison (local storage).

### Backend / services

- **Node.js + TypeScript** for API routes/services that:

  - Proxy/sign requests to PayrollTaxAPI (secrets not exposed to browser).
  - Proxy/sign requests to OpenAI (prompt assembly server-side).
  - Optionally proxy Places if keys must remain server-side.

### Data stores

- **PostgreSQL** is **not required for MVP** unless product adds server-side saved comparisons/analytics.  
  If KPI tracking is needed pre-Postgres, use privacy-preserving analytics or defer.

*(Keep Postgres in roadmap if you anticipate accounts/history later.)*

---

## 10. Success Metrics (Product KPIs)

- Completed comparisons (device-local completion events if telemetry exists and is permitted).
- Return sessions within 7 days (cookie/local heuristic or optional telemetry—privacy review required).
- AI insight engagement (expand/copy/regenerate if offered).
- Export usage (CSV vs JSON).
- Average session duration/time-to-first-result.

---

## 11. Future Opportunities

- Scenario history across sessions (requires accounts or encrypted sync—outside MVP).
- Shared comparisons (links) with explicit consent.
- Optional rent autofill (still non-goal for MVP intelligence marketplace).
- Contractor/1099 tax mode.
- International comparisons.
- Per-city overrides for specific expense lines.

---

## 12. Product Principles

### Personalized over generic

Prioritize **user-entered** recurring expenses and **location-specific** tax treatment over averages.

### Fast time-to-value

Optimize for sub‑2‑minute completion for typical cases.

### Simplicity first

Stay focused on affordability comparison—not a full financial suite.

### Explainability

Users should understand **what changed** and **why** (metrics + optional calculation breakdown + cautious AI narrative tied to numbers).

---

## 13. Key Differentiator

Compared to typical COL calculators:

- **Multi-city**, **Places-grounded** selections.
- **Per-city income** for realistic offer comparisons.
- **Line-item expenses** reflecting real budgets.
- **Pre-tax contributions**, including **percent-based 401(k)**.
- **Realistic net pay** via payroll/tax APIs.
- **Local-first privacy posture** for MVP (no login).

---

## 14. Companion Artifact

Low-fi wireframes reflecting column layout and export actions live alongside this document:

- `wireframes-city-budget-tool.txt`
