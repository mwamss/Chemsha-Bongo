@echo off
cd /d "%~dp0"
title Chemsha Bongo Mindful Game Suite
echo ========================================================
echo   Chemsha Bongo - Full-Stack Mindful Brain Suite
echo ========================================================
echo.
if not exist "frontend\dist\index.html" (
    echo Frontend build not found. Building production assets...
    pushd frontend
    call npm run build
    popd
    echo Frontend build complete!
    echo.
)
echo Starting FastAPI Full-Stack Server on all network interfaces...
echo (Serving React Mobile Responsive Frontend + REST API)
echo.
set "LOCAL_IP=localhost"
for /f "tokens=*" %%i in ('python -c "import socket; print(socket.gethostbyname(socket.gethostname()))" 2^>nul') do set "LOCAL_IP=%%i"

echo ========================================================
echo  Computer Browser:     http://localhost:8000
echo  Mobile Phone Access:  http://%LOCAL_IP%:8000
echo  (Connect your phone to the same Wi-Fi network)
echo ========================================================
echo.
start http://localhost:8000
python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
pause

