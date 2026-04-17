# backend/pdf_generator.py
from weasyprint import HTML

BUSINESS_NAME = "Shaukat Abbas Pesticides"

def generate_invoice_pdf(invoice) -> bytes:
    sale = invoice.sale
    customer = sale.customer
    rows = "".join(f"""
        <tr>
            <td>{item.product.name}</td>
            <td>{item.product.category.value.title()}</td>
            <td>{item.quantity} {item.product.unit}</td>
            <td>PKR {item.unit_price:,.2f}</td>
            <td>PKR {item.quantity * item.unit_price:,.2f}</td>
        </tr>""" for item in sale.items)

    html = f"""<!DOCTYPE html><html><head><style>
        body{{font-family:Arial,sans-serif;margin:40px;color:#222}}
        h1{{color:#2c5f2e;margin:0}} .header{{border-bottom:3px solid #2c5f2e;padding-bottom:12px;margin-bottom:20px}}
        table{{width:100%;border-collapse:collapse;margin-top:16px}}
        th{{background:#2c5f2e;color:white;padding:8px;text-align:left}}
        td{{padding:8px;border-bottom:1px solid #ddd}}
        .total td{{font-weight:bold;background:#f5f5f5}}
        .meta p{{margin:4px 0}} .dates{{color:#555;font-size:.9em}}
    </style></head><body>
    <div class="header"><h1>{BUSINESS_NAME}</h1></div>
    <h2>Invoice #{invoice.invoice_number}</h2>
    <div class="meta">
        <p><strong>Customer:</strong> {customer.name}</p>
        <p><strong>Phone:</strong> {customer.phone}</p>
        <p><strong>Address:</strong> {customer.address}</p>
    </div>
    <div class="dates">
        <p><strong>Issued:</strong> {invoice.issued_date.strftime('%d %b %Y')}</p>
        <p><strong>Payment Due:</strong> {invoice.payment_due_date.strftime('%d %b %Y')}</p>
        <p><strong>Valid Until:</strong> {invoice.validity_expiry_date.strftime('%d %b %Y')}</p>
    </div>
    <table>
        <thead><tr><th>Product</th><th>Category</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
        <tbody>{rows}</tbody>
        <tfoot><tr class="total"><td colspan="4">Grand Total</td><td>PKR {sale.total_amount:,.2f}</td></tr></tfoot>
    </table>
    </body></html>"""
    return HTML(string=html).write_pdf()
