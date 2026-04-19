@echo off
title Shaukat Abbas Pesticides

echo Starting Shaukat Abbas Pesticides...

cd /d "%~dp0backend"

:: Create virtual environment if it doesn't exist
if not exist "venv" (
    echo Setting up for first time, please wait...
    python -m venv venv
    call venv\Scripts\activate.bat
    pip install -r requirements.txt
) else (
    call venv\Scripts\activate.bat
)

:: Open browser after 2 seconds
start "" timeout /t 2 >nul && start http://localhost:8000

:: Start the server
echo App is running at http://localhost:8000
echo Close this window to stop the app.
uvicorn main:app --port 8000

pause
