@echo off
TITLE Sensesys Survey App Setup
echo ===================================================
echo   Sensesys Survey App - Automated Setup & Start
echo ===================================================
echo.
echo [1/3] Checking for Node.js...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Node.js is not installed or not in your PATH.
    echo Please install Node.js from https://nodejs.org/ and try again.
    pause
    exit /b
)
echo Node.js is detected.
echo.
echo [2/3] Installing dependencies (this may take a minute)...
call npm install
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to install dependencies. Check your internet connection.
    pause
    exit /b
)
echo Dependencies installed successfully.
echo.
echo [3/3] Starting the application...
echo The app will open in your browser shortly.
echo Press Ctrl+C in this window to stop the server when done.
echo.
call npm run dev
pause
