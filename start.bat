@echo off
setlocal EnableDelayedExpansion
REM ANVILPOINT launcher — Windows 11. Local-first, no admin rights needed.
cd /d "%~dp0"

echo ============================================
echo  ANVILPOINT - Open-Source Project Readiness Workbench
echo ============================================

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found on PATH.
  echo Install the free LTS release from https://nodejs.org/ (v20 or newer^), then re-run start.bat.
  pause
  exit /b 1
)

for /f "tokens=1 delims=v" %%a in ('node --version') do set NODEVER=%%a
echo [OK] Node %NODEVER% detected.

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm was not found. Reinstall Node.js LTS from https://nodejs.org/.
  pause
  exit /b 1
)

if not exist "package.json" (
  echo [ERROR] package.json not found. Run start.bat from the ANVILPOINT project folder.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo [INFO] Installing dependencies from package-lock.json (one-time setup^)...
  call npm ci
  if errorlevel 1 (
    echo [ERROR] Dependency install failed. See TROUBLESHOOTING in README.md.
    pause
    exit /b 1
  )
) else (
  echo [OK] Dependencies already installed.
)

echo [INFO] Starting development server...
echo [INFO] Open http://localhost:5173 in your browser.
call npm run dev
pause
