@echo off
color 0A
echo ===================================================
echo machine_asylum YT Tool Installer
echo ===================================================
echo.
echo Installing panel...
powershell -NoProfile -ExecutionPolicy Bypass -Command "& '%~dp0install.ps1'"
echo.
echo Installation complete! You can now close this window.
pause
