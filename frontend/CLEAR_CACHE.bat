@echo off
echo Clearing browser cache and restarting dev server...
echo.

REM Kill any existing npm processes
taskkill /F /IM node.exe 2>nul

REM Clear node_modules cache
echo Clearing npm cache...
call npm cache clean --force 2>nul

REM Remove build folder
echo Removing build folder...
rmdir /s /q build 2>nul

REM Remove .next folder if it exists
rmdir /s /q .next 2>nul

REM Start fresh build
echo Starting fresh build...
call npm run build

echo.
echo Build complete! Now:
echo 1. Hard refresh your browser (Ctrl+Shift+R or Cmd+Shift+R)
echo 2. Or clear your browser cache manually
echo 3. Then restart the dev server with: npm start
pause
