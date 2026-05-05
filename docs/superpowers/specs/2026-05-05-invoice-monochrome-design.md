# Invoice Monochrome Redesign

**Date:** 2026-05-05

## Summary

Redesign the invoice PDF to a professional monochrome (black/white only) style and remove the Export PDF button from the InvoiceDetail page.

## Changes

### `backend/pdf_generator.py`
- Replace all colors with black/white/gray only
- Header band: pure black background, white text
- Table header row: black background, white text
- Remove alternating row tints — all rows white
- Borders: thin black lines only
- Grand total: bold black text, simple black border box (no colored background)
- Footer band: black background, white text
- Remove all blue/accent/tinted color values

### `frontend/src/pages/InvoiceDetail.jsx`
- Remove `handlePdf` function
- Remove "Export PDF" button

## Out of Scope
- No changes to invoice data or API
- No changes to how the PDF is generated or served
- No changes to the Invoices list page
