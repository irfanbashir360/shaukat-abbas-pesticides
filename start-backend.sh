#!/bin/bash
# Starts the backend with the Homebrew library path (required for WeasyPrint/Pango on macOS)
cd "$(dirname "$0")/backend"
source venv/bin/activate
DYLD_LIBRARY_PATH=/opt/homebrew/lib uvicorn main:app --port 8000 --reload
