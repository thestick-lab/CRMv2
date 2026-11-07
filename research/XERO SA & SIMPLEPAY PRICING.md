Published ZAR pricing for **Xero South Africa** (reflecting the 1 November 2026 rate revision) and **SimplePay South Africa** (verified via SimplePay's live pricing API endpoint `api.payroll.simplepay.cloud/v1/static_site/za/cost` and calculation script) is detailed below.

---

### 1. Xero South Africa Published Pricing (ZAR)

On **1 November 2026**, Xero South Africa implemented a subscription price increase across all base tiers and discontinued its multi-organisation discount. Xero publishes its South African rates **inclusive of 15% VAT**; the exclusive figures below are derived at the statutory 15% VAT rate ($\text{Price}_{\text{excl}} = \text{Price}_{\text{incl}} \div 1.15$).

| Plan Tier | Regular Monthly (Excl. 15% VAT) | Regular Monthly (Incl. 15% VAT) | Promo: First 3 Months (Incl. VAT)* | Prior Rate (Pre-1 Nov 2026 Incl. VAT) |
| --- | --- | --- | --- | --- |
| **Starter** | R421.74 | **R485.00** | R97.00 | R450.00 |
| **Standard** | R745.22 | **R857.00** | R171.40 | R795.00 |
| **Premium** | R1,039.13 | **R1,195.00** | R239.00 | R1,095.00 |

**Promotional Note: Xero offers new South African customers 80% off the base subscription for the first 3 months (promo code `DC8032614GL`), after which standard monthly auto-renewal rates apply.*

**Plan Scope & Optional Add-on Rates (Incl. 15% VAT):**

* **Starter:** Capped at sending 20 invoices/quotes and entering 5 bills per month; includes 30-day cash flow forecasting.
* **Standard:** Unlimited invoices, quotes, and bill entries, bulk transaction reconciliation, auto-reconcile, and 60-day cash flow forecasting.
* **Premium:** Everything in Standard plus multi-currency support, KPI analysis, industry benchmarking, and 180-day cash flow forecasting.
* **Optional Add-ons:** Auto-reconcile on Starter is **R100.00/mo** (R86.96 excl. VAT); Employee Expense & Mileage Claims starts from **R69.00/mo** (R60.00 excl. VAT); Xero Projects (time and cost tracking) starts from **R120.75/mo** (R105.00 excl. VAT).

---

### 2. SimplePay South Africa Per-Employee Pricing Tiers ("The One Plan")

SimplePay operates a single all-inclusive tier (**"The One Plan"**) billed monthly per active employee on a marginal bracket (sliding-scale) structure. SimplePay quotes all base and per-employee rates **exclusive of 15% VAT**.

Per SimplePay's live pricing configuration (`[https://api.payroll.simplepay.cloud/v1/static_site/za/cost](https://api.payroll.simplepay.cloud/v1/static_site/za/cost)`), the JSON parameters are:

```json
{
  "y_intercept": 70.0,
  "gradients": {
    "5": 19.5,
    "10": 13.6,
    "300": 11.0,
    "100000": 8.75
  }
}

```

#### Marginal Pricing Table (ZAR)

| Fee Component / Employee Bracket | Bracket Capacity | Rate Excl. 15% VAT | Rate Incl. 15% VAT | Max Bracket Subtotal (Excl. VAT) | Cumulative Total at Bracket Cap (Excl. / Incl. VAT) |
| --- | --- | --- | --- | --- | --- |
| **Base Price** (`y_intercept`) | Fixed monthly base | **R70.00** / month | **R80.50** / month | R70.00 | R70.00 / R80.50 |
| **Tier 1:** Employees 1 to 5 | 5 employees | **R19.50** / emp | **R22.425** / emp | R97.50 | R167.50 / R192.63 |
| **Tier 2:** Employees 6 to 10 | 5 employees | **R13.60** / emp | **R15.64** / emp | R68.00 | R235.50 / R270.83 |
| **Tier 3:** Employees 11 to 300 | 290 employees | **R11.00** / emp | **R12.65** / emp | R3,190.00 | R3,425.50 / R3,939.33 |
| **Tier 4:** Employees 301+ | Unlimited (slider max 500) | **R8.75** / emp | **R10.0625** / emp | Variable | Variable |

---

### 3. Standard Billing Formula for Payrolls Exceeding 50 Employees

Because SimplePay's third marginal tier spans **11 to 300 employees** at **R11.00 per employee (excl. VAT)**, any payroll between **11 and 300 active employees** (including payrolls exceeding 50 employees up to 300) follows a linear cost function.

#### A. Cost Anchor at Exactly 50 Employees

For $n = 50$ active employees:

* **Base Fee:** $\text{R70.00}$
* **First 5 Employees (1–5):** $5 \times \text{R19.50} = \text{R97.50}$
* **Next 5 Employees (6–10):** $5 \times \text{R13.60} = \text{R68.00}$
* **Next 40 Employees (11–50):** $40 \times \text{R11.00} = \text{R440.00}$
* **Total at 50 Employees (Excl. VAT):** $\text{R70.00} + \text{R97.50} + \text{R68.00} + \text{R440.00} = \mathbf{R675.50}$ (averaging $\text{R13.51}$ per employee)
* **Total at 50 Employees (Incl. 15% VAT):** $\text{R675.50} \times 1.15 = \mathbf{R776.83}$ ($\text{R776.825}$)

#### B. Billing Formulas for $50 < n \le 300$ Employees

Expressed relative to the 50-employee threshold or simplified into slope-intercept form ($y = mx + c$):

$$\text{Monthly Total (Excl. VAT)} = \text{R675.50} + \text{R11.00} \times (n - 50)$$

$$\text{Monthly Total (Excl. VAT)} = \text{R125.50} + (\text{R11.00} \times n)$$

$$\text{Monthly Total (Incl. 15\% VAT)} = \left[\text{R125.50} + (\text{R11.00} \times n)\right] \times 1.15 = \text{R144.325} + (\text{R12.65} \times n)$$

*(For example, at $n = 75$ employees: $\text{R125.50} + (\text{R11.00} \times 75) = \mathbf{R950.50\text{ excl. VAT}}$ or $\mathbf{R1,093.08\text{ incl. VAT}}$; at $n = 100$ employees: $\mathbf{R1,225.50\text{ excl. VAT}}$ or $\mathbf{R1,409.33\text{ incl. VAT}}$).*

#### C. Billing Formulas for $n > 300$ Employees

For payrolls exceeding 300 employees (where the first 300 employees cost $\text{R3,425.50 excl. VAT}$, and each employee from 301 onwards is billed at $\text{R8.75 excl. VAT}$):

$$\text{Monthly Total (Excl. VAT)} = \text{R3,425.50} + \text{R8.75} \times (n - 300) = \text{R800.50} + (\text{R8.75} \times n)$$

$$\text{Monthly Total (Incl. 15\% VAT)} = \left[\text{R800.50} + (\text{R8.75} \times n)\right] \times 1.15 = \text{R920.575} + (\text{R10.0625} \times n)$$

*(Note: Multiple legal entities/companies are billed separately on SimplePay and cannot pool employee headcount across organisations. For headcount exceeding 500 employees or accounting bureaus, SimplePay also provides custom enterprise/bureau quoting).*

---

### References & Citations

1. **Xero South Africa Official Pricing Plans:** `[https://www.xero.com/za/pricing-plans/](https://www.xero.com/za/pricing-plans/)` — Verified Starter (R485 incl. VAT), Standard (R857 incl. VAT), Premium (R1,195 incl. VAT), 80% 3-month promotional rates, and optional add-on pricing.
2. **Xero South Africa Nov 2026 Price Update Notice:** `[https://www.xero.com/za/pricing-plans/update/](https://www.xero.com/za/pricing-plans/update/)` — Confirmed effective date of 1 November 2026 for rate increases (Starter +R35, Standard +R62, Premium +R100) and removal of the multi-organisation discount.
3. **SimplePay South Africa Official Pricing Page:** `[https://www.simplepay.co.za/pricing](https://www.simplepay.co.za/pricing)` — Verified "The One Plan" structure, VAT-exclusive quoting basis, and separate per-company billing rule.
4. **SimplePay South Africa Live Pricing API:** `[https://api.payroll.simplepay.cloud/v1/static_site/za/cost](https://api.payroll.simplepay.cloud/v1/static_site/za/cost)` — Retrieved live JSON pricing vector (`y_intercept: 70.0`, `gradients: {"5": 19.5, "10": 13.6, "300": 11.0, "100000": 8.75}`).
5. **SimplePay Client Calculation Bundle:** `[https://www.simplepay.co.za/assets/js/theme.86430450.bundle.js](https://www.simplepay.co.za/assets/js/theme.86430450.bundle.js)` — Verified the exact piecewise linear gradient accumulation algorithm used by SimplePay's interactive pricing calculator.
