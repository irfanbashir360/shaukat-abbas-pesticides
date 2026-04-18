# backend/pdf_generator.py
import os
import base64
from weasyprint import HTML
from database import get_data_dir
from models import BusinessSettings


def _safe(value, fallback=""):
    """Return value if truthy, else fallback."""
    return value if value else fallback


def generate_invoice_pdf(invoice, db) -> bytes:
    # ── Business settings ────────────────────────────────────────────────────
    biz = db.query(BusinessSettings).first()
    if biz is None:
        class _Biz:
            business_name = "Your Business Name"
            tagline = ""
            address = ""
            phone = ""
            ntn = ""
            strn = ""
            bank_name = ""
            bank_account = ""
            bank_iban = ""
            footer_note = "Thank you for your business!"
            logo_filename = None
        biz = _Biz()

    # ── Logo ─────────────────────────────────────────────────────────────────
    logo_html = ""
    if biz.logo_filename:
        logo_path = os.path.join(get_data_dir(), "logo.png")
        if os.path.exists(logo_path):
            with open(logo_path, "rb") as f:
                b64 = base64.b64encode(f.read()).decode()
            logo_html = (
                f'<img src="data:image/png;base64,{b64}" '
                f'style="height:60px;max-width:140px;object-fit:contain;" />'
            )

    # ── Invoice data ─────────────────────────────────────────────────────────
    sale = invoice.sale
    customer = sale.customer

    issued = invoice.issued_date.strftime("%d %b %Y")
    due = invoice.payment_due_date.strftime("%d %b %Y")
    valid_until = invoice.validity_expiry_date.strftime("%d %b %Y")

    # ── Line items ────────────────────────────────────────────────────────────
    rows = ""
    for idx, item in enumerate(sale.items, start=1):
        bg = "#ffffff" if idx % 2 == 1 else "#f0fdf4"
        line_total = item.quantity * item.unit_price
        rows += f"""
        <tr style="background:{bg};">
            <td style="text-align:center;">{idx}</td>
            <td>{item.product.name}</td>
            <td>{item.product.category.value.title()}</td>
            <td style="text-align:center;">{item.quantity} {item.product.unit}</td>
            <td style="text-align:right;">PKR {item.unit_price:,.2f}</td>
            <td style="text-align:right;">PKR {line_total:,.2f}</td>
        </tr>"""

    # ── Bank / footer info ────────────────────────────────────────────────────
    bank_parts = []
    if biz.bank_name:
        bank_parts.append(f"<strong>Bank:</strong> {biz.bank_name}")
    if biz.bank_account:
        bank_parts.append(f"<strong>Account:</strong> {biz.bank_account}")
    if biz.bank_iban:
        bank_parts.append(f"<strong>IBAN:</strong> {biz.bank_iban}")
    bank_info = " &nbsp;|&nbsp; ".join(bank_parts) if bank_parts else ""

    footer_note = _safe(biz.footer_note, "Thank you for your business!")

    # ── NTN / STRN line ───────────────────────────────────────────────────────
    ntn_parts = []
    if biz.ntn:
        ntn_parts.append(f"NTN: {biz.ntn}")
    if biz.strn:
        ntn_parts.append(f"STRN: {biz.strn}")
    ntn_line = " &nbsp;|&nbsp; ".join(ntn_parts)

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<style>
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    font-family: Arial, Helvetica, sans-serif;
    font-size: 12px;
    color: #052e16;
    background: #ffffff;
  }}

  /* ── Header band ── */
  .header-band {{
    background: #0a1f14;
    color: #ffffff;
    padding: 18px 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }}
  .header-left {{
    display: flex;
    align-items: center;
    gap: 16px;
  }}
  .header-left .biz-name {{
    font-size: 20px;
    font-weight: bold;
    color: #ffffff;
    line-height: 1.2;
  }}
  .header-left .tagline {{
    font-size: 11px;
    color: #86efac;
    margin-top: 2px;
  }}
  .header-right {{
    text-align: right;
    font-size: 11px;
    color: #d1fae5;
    line-height: 1.7;
  }}

  /* ── Two-column info block ── */
  .info-block {{
    display: flex;
    border-bottom: 2px solid #d1fae5;
  }}
  .info-col {{
    flex: 1;
    padding: 16px 24px;
    border-right: 1px solid #d1fae5;
  }}
  .info-col:last-child {{ border-right: none; }}
  .info-col h3 {{
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #4b7a5e;
    margin-bottom: 8px;
    border-bottom: 1px solid #d1fae5;
    padding-bottom: 4px;
  }}
  .info-col p {{
    line-height: 1.7;
    color: #052e16;
  }}
  .info-col .label {{
    color: #4b7a5e;
    font-size: 11px;
  }}
  .invoice-number {{
    font-size: 16px;
    font-weight: bold;
    color: #16a34a;
  }}

  /* ── Items table ── */
  .table-wrapper {{
    padding: 0 24px 16px;
  }}
  table {{
    width: 100%;
    border-collapse: collapse;
    margin-top: 16px;
    border: 1px solid #d1fae5;
  }}
  thead tr {{
    background: #16a34a;
    color: #ffffff;
  }}
  thead th {{
    padding: 9px 10px;
    text-align: left;
    font-size: 11px;
    font-weight: bold;
    letter-spacing: 0.03em;
  }}
  thead th.num {{ text-align: center; width: 36px; }}
  thead th.right {{ text-align: right; }}
  tbody td {{
    padding: 8px 10px;
    border-bottom: 1px solid #d1fae5;
    color: #052e16;
  }}

  /* ── Total box ── */
  .total-box {{
    margin: 0 24px 20px;
    text-align: right;
  }}
  .total-inner {{
    display: inline-block;
    background: #f0fdf4;
    border: 2px solid #16a34a;
    border-radius: 4px;
    padding: 10px 20px;
    font-size: 15px;
    font-weight: bold;
    color: #052e16;
  }}
  .total-inner span {{
    color: #16a34a;
    font-size: 17px;
  }}

  /* ── Footer band ── */
  .footer-band {{
    background: #0a1f14;
    color: #d1fae5;
    padding: 14px 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11px;
    margin-top: 12px;
  }}
  .footer-band .bank-info {{
    color: #86efac;
    line-height: 1.7;
  }}
  .footer-band .footer-note {{
    color: #d1fae5;
    font-style: italic;
    text-align: right;
    max-width: 220px;
  }}
</style>
</head>
<body>

<!-- ═══ Header Band ═══ -->
<div class="header-band">
  <div class="header-left">
    {logo_html}
    <div>
      <div class="biz-name">{_safe(biz.business_name, "Shaukat Abbas Pesticides")}</div>
      {f'<div class="tagline">{biz.tagline}</div>' if biz.tagline else ""}
    </div>
  </div>
  <div class="header-right">
    {f'<div>{biz.address}</div>' if biz.address else ""}
    {f'<div>{biz.phone}</div>' if biz.phone else ""}
    {f'<div>{ntn_line}</div>' if ntn_line else ""}
  </div>
</div>

<!-- ═══ Two-column info block ═══ -->
<div class="info-block">
  <div class="info-col">
    <h3>Bill To</h3>
    <p style="font-weight:bold;font-size:13px;">{customer.name}</p>
    {f'<p><span class="label">Phone:</span> {customer.phone}</p>' if customer.phone else ""}
    {f'<p><span class="label">Address:</span> {customer.address}</p>' if customer.address else ""}
  </div>
  <div class="info-col">
    <h3>Invoice Details</h3>
    <p class="invoice-number">{invoice.invoice_number}</p>
    <p><span class="label">Issued:</span> {issued}</p>
    <p><span class="label">Payment Due:</span> {due}</p>
    <p><span class="label">Valid Until:</span> {valid_until}</p>
  </div>
</div>

<!-- ═══ Line Items Table ═══ -->
<div class="table-wrapper">
  <table>
    <thead>
      <tr>
        <th class="num">#</th>
        <th>Product</th>
        <th>Category</th>
        <th style="text-align:center;">Qty</th>
        <th class="right">Unit Price</th>
        <th class="right">Total</th>
      </tr>
    </thead>
    <tbody>
      {rows}
    </tbody>
  </table>
</div>

<!-- ═══ Grand Total ═══ -->
<div class="total-box">
  <div class="total-inner">
    Grand Total: <span>PKR {sale.total_amount:,.2f}</span>
  </div>
</div>

<!-- ═══ Footer Band ═══ -->
<div class="footer-band">
  <div class="bank-info">{bank_info}</div>
  <div class="footer-note">{footer_note}</div>
</div>

</body>
</html>"""

    return HTML(string=html).write_pdf()
