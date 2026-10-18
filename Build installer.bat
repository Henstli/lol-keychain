@echo off
cd /d "%~dp0"
call npm install
call npm run dist > build-log.txt 2>&1
type build-log.txt
echo.
if exist "dist\LoL Keychain Setup*.exe" (echo Done. The installer is in the dist folder.) else (echo The installer was NOT created. Send the last lines of build-log.txt.)
pause
