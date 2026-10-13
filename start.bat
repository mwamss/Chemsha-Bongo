@echo off
title Chemsha Bongo Mindful Game Suite
echo ========================================================
echo   Chemsha Bongo - Full-Stack Mindful Brain Suite
echo ========================================================
echo.
echo Starting FastAPI Full-Stack Server on http://127.0.0.1:8000 ...
echo (Serving React Frontend + REST API + PostgreSQL Storage)
echo.
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
pause
