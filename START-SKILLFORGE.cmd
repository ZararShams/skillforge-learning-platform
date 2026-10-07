@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Please install Node.js 24 LTS from https://nodejs.org/en/download
 echo Then close this window and double-click START-SKILLFORGE.cmd again.
 pause
 exit /b 1
)
node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 24 ? 0 : 1)"
if errorlevel 1 (
 echo Please update Node.js to version 24 LTS or newer.
 pause
 exit /b 1
)
node server.mjs --open
pause
