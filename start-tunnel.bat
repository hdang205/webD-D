@echo off
echo ========================================================
echo   D^&D FASHION ERP - KHOI DONG CLOUDFLARE PUBLIC TUNNEL
echo ========================================================
echo.
echo Dang mo Cloudflare Tunnel toi http://127.0.0.1:3000...
echo Hay copy duong link ket thuc bang .trycloudflare.com ben duoi gui cho team:
echo.

where cloudflared >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    cloudflared tunnel --url http://127.0.0.1:3000
) else (
    "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://127.0.0.1:3000
)

pause
