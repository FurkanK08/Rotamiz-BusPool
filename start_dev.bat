@echo off
echo ==========================================
echo   Servis Takip Uygulamasi Baslatiliyor
echo ==========================================

echo 1. Backend Baslatiliyor...
start "Backend Server" cmd /k "cd backend && npx nodemon index.js"

echo 2. Frontend (Expo) Baslatiliyor...
start "Frontend App" cmd /k "npm start -c"

echo ==========================================
echo   Islem Tamam!
echo   Lutfen acilan pencereleri kontrol edin.
echo ==========================================
pause
