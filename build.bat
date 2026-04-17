@echo off
echo === Shaukat Abbas Pesticides Build ===

echo [1/3] Building frontend...
cd frontend
call npm run build
if errorlevel 1 ( echo Frontend build failed & pause & exit /b 1 )
cd ..

echo [2/3] Copying frontend to backend/static...
if exist backend\static rmdir /s /q backend\static
xcopy /s /e /i /q frontend\dist backend\static

echo [3/3] Building Windows executable...
cd backend
call venv\Scripts\activate
pyinstaller SAP.spec --noconfirm
cd ..

echo.
echo Done! Executable: backend\dist\ShaukatAbbasPesticides.exe
pause
