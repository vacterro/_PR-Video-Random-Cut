@echo off
color 0A
echo ===================================================
echo _PR Video Random Cut Installer
echo ===================================================
echo.
echo Installing panel...
powershell -NoProfile -ExecutionPolicy Bypass -Command "& '%~dp0install.ps1'"
echo.
echo Installation complete! You can now close this window.
pause
