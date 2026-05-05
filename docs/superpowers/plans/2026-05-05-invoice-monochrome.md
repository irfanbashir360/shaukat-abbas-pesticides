# Invoice Monochrome Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all colors in the invoice PDF with black/white only, and remove the Export PDF button from the InvoiceDetail page.

**Architecture:** Two isolated changes — update the color palette and table styles in `pdf_generator.py`, and remove one button and its handler from `InvoiceDetail.jsx`.

**Tech Stack:** Python/ReportLab (PDF), React/JSX (frontend)

---

### Task 1: Redesign PDF to monochrome

**Files:**
- Modify: `backend/pdf_generator.py`

- [ ] **Step 1: Replace the color palette**

In `backend/pdf_generator.py`, replace the entire `# ── Palette` block (lines 17–23) with:

```python
# ── Palette ──────────────────────────────────────────────────────────────────
C_BLACK  = colors.HexColor("#000000")   # pure black – header/footer bg, borders
C_WHITE  = colors.white                 # white – body background
C_GRAY   = colors.HexColor("#f5f5f5")   # very light gray – unused (kept for reference)
C_MUTED  = colors.HexColor("#555555")   # dark gray – label/muted text
C_TEXT   = colors.HexColor("#111111")   # near-black – body text
C_BORDER = colors.HexColor("#000000")   # black – all borders
```

- [ ] **Step 2: Update text styles to remove blue**

Replace `s_tagline`, `s_header_right`, `s_invoice_num`, `s_footer_italic` styles — change all colored text to white or gray:

```python
s_tagline = ParagraphStyle("tagline",
    fontName="Helvetica", fontSize=9,
    textColor=colors.HexColor("#cccccc"), leading=13)
s_header_right = ParagraphStyle("hdrRight",
    fontName="Helvetica", fontSize=9,
    textColor=colors.HexColor("#cccccc"), leading=14, alignment=TA_RIGHT)
s_invoice_num = ParagraphStyle("invNum",
    fontName="Helvetica-Bold", fontSize=15,
    textColor=C_TEXT, leading=20)
s_footer_italic = ParagraphStyle("footerItalic",
    fontName="Helvetica-Oblique", fontSize=9,
    textColor=colors.HexColor("#cccccc"), leading=14, alignment=TA_RIGHT)
s_total_value = ParagraphStyle("totVal",
    fontName="Helvetica-Bold", fontSize=14,
    textColor=C_TEXT, leading=20, alignment=TA_RIGHT)
```

- [ ] **Step 3: Update header band to black**

In the `header_table.setStyle(...)` call, change `C_DARK` to `C_BLACK`:

```python
header_table.setStyle(TableStyle([
    ("BACKGROUND", (0,0), (-1,-1), C_BLACK),
    ("TOPPADDING",    (0,0), (-1,-1), 14),
    ("BOTTOMPADDING", (0,0), (-1,-1), 14),
    ("LEFTPADDING",   (0,0), (-1,-1), 16),
    ("RIGHTPADDING",  (0,0), (-1,-1), 16),
    ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
    ("ROUNDEDCORNERS", [6,6,0,0]),
]))
```

- [ ] **Step 4: Update items table — black header, no alternating rows**

Replace the `style_cmds` list and the alternating row loop:

```python
style_cmds = [
    # Header row
    ("BACKGROUND",    (0,0), (-1,0),  C_BLACK),
    ("TOPPADDING",    (0,0), (-1,0),  8),
    ("BOTTOMPADDING", (0,0), (-1,0),  8),
    # Data rows
    ("TOPPADDING",    (0,1), (-1,-1), 7),
    ("BOTTOMPADDING", (0,1), (-1,-1), 7),
    ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
    ("LINEBELOW",     (0,1), (-1,-1), 0.5, C_BORDER),
    ("BOX",           (0,0), (-1,-1), 1,   C_BORDER),
    ("LEFTPADDING",   (0,0), (-1,-1), 8),
    ("RIGHTPADDING",  (0,0), (-1,-1), 8),
]
# No alternating row backgrounds — remove the loop entirely
items_table.setStyle(TableStyle(style_cmds))
```

Delete the alternating row loop:
```python
# DELETE these lines:
for i in range(1, len(rows)):
    if i % 2 == 0:
        style_cmds.append(("BACKGROUND", (0,i), (-1,i), C_LIGHT))
```

- [ ] **Step 5: Update grand total block — black border, no background**

```python
total_table.setStyle(TableStyle([
    ("BACKGROUND",    (0,0), (-1,-1), C_WHITE),
    ("TOPPADDING",    (0,0), (-1,-1), 10),
    ("BOTTOMPADDING", (0,0), (-1,-1), 10),
    ("LEFTPADDING",   (0,0), (-1,-1), 16),
    ("RIGHTPADDING",  (0,0), (-1,-1), 16),
    ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
    ("BOX",           (0,0), (-1,-1), 1.5, C_BLACK),
]))
```

- [ ] **Step 6: Update footer band to black**

In `footer_table.setStyle(...)`, change `C_DARK` to `C_BLACK`:

```python
footer_table.setStyle(TableStyle([
    ("BACKGROUND",    (0,0), (-1,-1), C_BLACK),
    ("TOPPADDING",    (0,0), (-1,-1), 12),
    ("BOTTOMPADDING", (0,0), (-1,-1), 12),
    ("LEFTPADDING",   (0,0), (-1,-1), 16),
    ("RIGHTPADDING",  (0,0), (-1,-1), 16),
    ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
    ("ROUNDEDCORNERS", [0,0,6,6]),
]))
```

- [ ] **Step 7: Commit**

```bash
git add backend/pdf_generator.py
git commit -m "feat: redesign invoice PDF to monochrome black/white"
```

---

### Task 2: Remove Export PDF button from InvoiceDetail

**Files:**
- Modify: `frontend/src/pages/InvoiceDetail.jsx`

- [ ] **Step 1: Remove the handlePdf function and button**

In `frontend/src/pages/InvoiceDetail.jsx`:

Remove line 37:
```js
// DELETE:
const handlePdf = () => window.open(getInvoicePdfUrl(inv.id), '_blank')
```

Remove the import if `getInvoicePdfUrl` is no longer used. Change line 3:
```js
// BEFORE:
import { getInvoice, markInvoicePaid, getInvoicePdfUrl } from '../api/client'

// AFTER:
import { getInvoice, markInvoicePaid } from '../api/client'
```

Remove the Export PDF button (line 53):
```jsx
// DELETE:
<button className="sap-btn sap-btn-ghost" onClick={handlePdf}>Export PDF</button>
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/InvoiceDetail.jsx
git commit -m "feat: remove Export PDF button from InvoiceDetail"
```
