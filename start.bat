@echo off
title Shaukat Abbas Pesticides

echo Starting Shaukat Abbas Pesticides...

cd /d "%~dp0backend"

call venv\Scripts\activate.bat

start "" cmd /c "timeout /t 3 >nul && start http://localhost:8000"

echo App is running at http://localhost:8000
echo Close this window to stop the app.
uvicorn main:app --port 8000

pause
