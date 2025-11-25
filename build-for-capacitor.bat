@echo off
REM Build script for Capacitor - Windows
echo Creating www directory for Capacitor...

REM Remove old www directory if it exists
if exist www rmdir /s /q www

REM Create www directory
mkdir www

REM Copy essential files
echo Copying files...
copy index.html www\
copy app.js www\
copy styles.css www\
copy manifest.json www\
copy service-worker.js www\
copy firebase-config.js www\
copy firebase-broadcast.js www\
copy blank-character-v2.json www\
copy favicon.ico www\

REM Copy directories
echo Copying directories...
xcopy /E /I icons www\icons
xcopy /E /I images www\images
xcopy /E /I characters www\characters

echo.
echo Build complete! www directory ready for Capacitor.
echo Run: npx cap sync android
