# backend/pdf_generator.py
import os
import io
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph,
    Spacer, HRFlowable
)
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
from database import get_data_dir
from models import BusinessSettings

# ── Palette ──────────────────────────────────────────────────────────────────
C_DARK   = colors.HexColor("#1e293b")   # slate-800  – header/footer bg
C_ACCENT = colors.HexColor("#2563eb")   # blue-600   – table header, totals
C_LIGHT  = colors.HexColor("#eff6ff")   # blue-50    – alt row tint
C_BORDER = colors.HexColor("#e2e8f0")   # slate-200  – dividers
C_MUTED  = colors.HexColor("#64748b")   # slate-500  – label text
C_WHITE  = colors.white
C_TEXT   = colors.HexColor("#0f172a")   # slate-900  – body text


def _safe(value, fallback=""):
    return value if value else fallback


def _para(text, style):
    return Paragraph(str(text), style)


def generate_invoice_pdf(invoice, db) -> bytes:
    # ── Business settings ─────────────────────────────────────────────────────
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

    # ── Styles ────────────────────────────────────────────────────────────────
    s_biz_name = ParagraphStyle("bizName",
        fontName="Helvetica-Bold", fontSize=18,
        textColor=C_WHITE, leading=22)
    s_tagline = ParagraphStyle("tagline",
        fontName="Helvetica", fontSize=9,
        textColor=colors.HexColor("#93c5fd"), leading=13)
    s_header_right = ParagraphStyle("hdrRight",
        fontName="Helvetica", fontSize=9,
        textColor=colors.HexColor("#cbd5e1"), leading=14, alignment=TA_RIGHT)
    s_section_title = ParagraphStyle("secTitle",
        fontName="Helvetica-Bold", fontSize=8,
        textColor=C_MUTED, leading=12,
        spaceAfter=4, textTransform="uppercase", letterSpacing=1)
    s_body = ParagraphStyle("body",
        fontName="Helvetica", fontSize=10,
        textColor=C_TEXT, leading=15)
    s_body_bold = ParagraphStyle("bodyBold",
        fontName="Helvetica-Bold", fontSize=11,
        textColor=C_TEXT, leading=15)
    s_label = ParagraphStyle("label",
        fontName="Helvetica", fontSize=9,
        textColor=C_MUTED, leading=13)
    s_invoice_num = ParagraphStyle("invNum",
        fontName="Helvetica-Bold", fontSize=15,
        textColor=C_ACCENT, leading=20)
    s_th = ParagraphStyle("th",
        fontName="Helvetica-Bold", fontSize=9,
        textColor=C_WHITE, leading=12)
    s_td = ParagraphStyle("td",
        fontName="Helvetica", fontSize=9,
        textColor=C_TEXT, leading=13)
    s_td_right = ParagraphStyle("tdRight",
        fontName="Helvetica", fontSize=9,
        textColor=C_TEXT, leading=13, alignment=TA_RIGHT)
    s_td_center = ParagraphStyle("tdCenter",
        fontName="Helvetica", fontSize=9,
        textColor=C_TEXT, leading=13, alignment=TA_CENTER)
    s_total_label = ParagraphStyle("totLabel",
        fontName="Helvetica-Bold", fontSize=11,
        textColor=C_MUTED, leading=16, alignment=TA_RIGHT)
    s_total_value = ParagraphStyle("totVal",
        fontName="Helvetica-Bold", fontSize=14,
        textColor=C_ACCENT, leading=20, alignment=TA_RIGHT)
    s_footer = ParagraphStyle("footer",
        fontName="Helvetica", fontSize=9,
        textColor=colors.HexColor("#cbd5e1"), leading=14)
    s_footer_italic = ParagraphStyle("footerItalic",
        fontName="Helvetica-Oblique", fontSize=9,
        textColor=colors.HexColor("#93c5fd"), leading=14, alignment=TA_RIGHT)

    # ── Invoice data ──────────────────────────────────────────────────────────
    sale     = invoice.sale
    customer = sale.customer
    issued   = invoice.issued_date.strftime("%d %b %Y")
    due      = invoice.payment_due_date.strftime("%d %b %Y")
    valid_until = invoice.validity_expiry_date.strftime("%d %b %Y")

    # ── Page setup ────────────────────────────────────────────────────────────
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=1.5*cm, rightMargin=1.5*cm,
        topMargin=1.5*cm, bottomMargin=1.5*cm,
    )
    W = A4[0] - 3*cm   # usable width
    story = []

    # ═══════════════════════════════════════════════════════════════════════════
    # HEADER BAND
    # ═══════════════════════════════════════════════════════════════════════════
    biz_name_str = _safe(biz.business_name, "Shaukat Abbas Pesticides")
    left_cells = [_para(biz_name_str, s_biz_name)]
    if biz.tagline:
        left_cells.append(_para(biz.tagline, s_tagline))

    right_lines = []
    if biz.address:
        right_lines.append(biz.address)
    if biz.phone:
        right_lines.append(biz.phone)
    ntn_parts = []
    if biz.ntn:  ntn_parts.append(f"NTN: {biz.ntn}")
    if biz.strn: ntn_parts.append(f"STRN: {biz.strn}")
    if ntn_parts:
        right_lines.append("  |  ".join(ntn_parts))
    right_content = _para("<br/>".join(right_lines), s_header_right) if right_lines else _para("", s_header_right)

    # Try to load logo
    logo_image = None
    if biz.logo_filename:
        logo_path = os.path.join(get_data_dir(), "logo.png")
        if os.path.exists(logo_path):
            from reportlab.platypus import Image
            logo_image = Image(logo_path, width=2.5*cm, height=1.6*cm, kind="proportional")

    if logo_image:
        left_content = Table(
            [[logo_image, [_para(biz_name_str, s_biz_name)] + ([_para(biz.tagline, s_tagline)] if biz.tagline else [])]],
            colWidths=[2.8*cm, None]
        )
        left_content.setStyle(TableStyle([
            ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
            ("LEFTPADDING", (0,0), (-1,-1), 0),
            ("RIGHTPADDING", (0,0), (-1,-1), 8),
        ]))
    else:
        left_content = Table([[c] for c in left_cells], colWidths=[W * 0.6])
        left_content.setStyle(TableStyle([
            ("LEFTPADDING", (0,0), (-1,-1), 0),
            ("TOPPADDING", (0,0), (-1,-1), 1),
            ("BOTTOMPADDING", (0,0), (-1,-1), 1),
        ]))

    header_table = Table(
        [[left_content, right_content]],
        colWidths=[W * 0.6, W * 0.4],
    )
    header_table.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), C_DARK),
        ("TOPPADDING",    (0,0), (-1,-1), 14),
        ("BOTTOMPADDING", (0,0), (-1,-1), 14),
        ("LEFTPADDING",   (0,0), (-1,-1), 16),
        ("RIGHTPADDING",  (0,0), (-1,-1), 16),
        ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
        ("ROUNDEDCORNERS", [6,6,0,0]),
    ]))
    story.append(header_table)

    # ═══════════════════════════════════════════════════════════════════════════
    # INFO BLOCK  (Bill To | Invoice Details)
    # ═══════════════════════════════════════════════════════════════════════════
    bill_to = [
        _para("Bill To", s_section_title),
        _para(customer.name, s_body_bold),
    ]
    if customer.phone:
        bill_to.append(_para(f"Phone: {customer.phone}", s_label))
    if customer.address:
        bill_to.append(_para(f"Address: {customer.address}", s_label))

    inv_details = [
        _para("Invoice Details", s_section_title),
        _para(invoice.invoice_number, s_invoice_num),
        _para(f"Issued: {issued}", s_label),
        _para(f"Payment Due: {due}", s_label),
        _para(f"Valid Until: {valid_until}", s_label),
    ]

    info_table = Table(
        [[bill_to, inv_details]],
        colWidths=[W * 0.5, W * 0.5],
    )
    info_table.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,-1), C_WHITE),
        ("TOPPADDING",    (0,0), (-1,-1), 14),
        ("BOTTOMPADDING", (0,0), (-1,-1), 14),
        ("LEFTPADDING",   (0,0), (-1,-1), 16),
        ("RIGHTPADDING",  (0,0), (-1,-1), 16),
        ("VALIGN",        (0,0), (-1,-1), "TOP"),
        ("LINEBELOW",     (0,0), (-1,-1), 1.2, C_BORDER),
        ("LINEAFTER",     (0,0), (0,-1), 1,   C_BORDER),
        ("BOX",           (0,0), (-1,-1), 1,   C_BORDER),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 0.4*cm))

    # ═══════════════════════════════════════════════════════════════════════════
    # LINE ITEMS TABLE
    # ═══════════════════════════════════════════════════════════════════════════
    col_widths = [
        W * 0.05,   # #
        W * 0.30,   # Product
        W * 0.18,   # Category
        W * 0.13,   # Qty
        W * 0.17,   # Unit Price
        W * 0.17,   # Total
    ]
    headers = [
        _para("#",          s_th),
        _para("Product",    s_th),
        _para("Category",   s_th),
        _para("Qty",        s_th),
        _para("Unit Price", s_th),
        _para("Total",      s_th),
    ]
    rows = [headers]
    for idx, item in enumerate(sale.items, start=1):
        line_total = item.quantity * item.unit_price
        bg = C_LIGHT if idx % 2 == 0 else C_WHITE
        rows.append([
            _para(str(idx),                                  s_td_center),
            _para(item.product.name,                         s_td),
            _para(item.product.category.value.title(),       s_td),
            _para(f"{item.quantity} {item.product.unit}",    s_td_center),
            _para(f"PKR {item.unit_price:,.2f}",             s_td_right),
            _para(f"PKR {line_total:,.2f}",                  s_td_right),
        ])

    items_table = Table(rows, colWidths=col_widths, repeatRows=1)
    style_cmds = [
        # Header row
        ("BACKGROUND",    (0,0), (-1,0),  C_ACCENT),
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
    # Alternating row backgrounds
    for i in range(1, len(rows)):
        if i % 2 == 0:
            style_cmds.append(("BACKGROUND", (0,i), (-1,i), C_LIGHT))
    items_table.setStyle(TableStyle(style_cmds))
    story.append(items_table)
    story.append(Spacer(1, 0.5*cm))

    # ═══════════════════════════════════════════════════════════════════════════
    # GRAND TOTAL
    # ═══════════════════════════════════════════════════════════════════════════
    total_table = Table(
        [[_para("Grand Total", s_total_label), _para(f"PKR {sale.total_amount:,.2f}", s_total_value)]],
        colWidths=[W * 0.75, W * 0.25],
    )
    total_table.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,-1), C_LIGHT),
        ("TOPPADDING",    (0,0), (-1,-1), 10),
        ("BOTTOMPADDING", (0,0), (-1,-1), 10),
        ("LEFTPADDING",   (0,0), (-1,-1), 16),
        ("RIGHTPADDING",  (0,0), (-1,-1), 16),
        ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
        ("BOX",           (0,0), (-1,-1), 1.5, C_ACCENT),
        ("ROUNDEDCORNERS", [4,4,4,4]),
    ]))
    story.append(total_table)
    story.append(Spacer(1, 0.5*cm))

    # ═══════════════════════════════════════════════════════════════════════════
    # FOOTER BAND
    # ═══════════════════════════════════════════════════════════════════════════
    bank_parts = []
    if biz.bank_name:    bank_parts.append(f"Bank: {biz.bank_name}")
    if biz.bank_account: bank_parts.append(f"Account: {biz.bank_account}")
    if biz.bank_iban:    bank_parts.append(f"IBAN: {biz.bank_iban}")
    bank_str = "   |   ".join(bank_parts) if bank_parts else ""

    footer_note = _safe(biz.footer_note, "Thank you for your business!")
    footer_left  = _para(bank_str, s_footer)
    footer_right = _para(footer_note, s_footer_italic)

    footer_table = Table(
        [[footer_left, footer_right]],
        colWidths=[W * 0.6, W * 0.4],
    )
    footer_table.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,-1), C_DARK),
        ("TOPPADDING",    (0,0), (-1,-1), 12),
        ("BOTTOMPADDING", (0,0), (-1,-1), 12),
        ("LEFTPADDING",   (0,0), (-1,-1), 16),
        ("RIGHTPADDING",  (0,0), (-1,-1), 16),
        ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
        ("ROUNDEDCORNERS", [0,0,6,6]),
    ]))
    story.append(footer_table)

    # ── Build ─────────────────────────────────────────────────────────────────
    doc.build(story)
    return buf.getvalue()
