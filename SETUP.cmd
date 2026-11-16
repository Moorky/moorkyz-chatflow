@echo off
setlocal
pushd "%~dp0src" || exit /b 1
node -e "const [major,minor]=process.versions.node.split('.').map(Number);if(major<22||(major===22&&minor<18)){console.error('Node 24 recommended; Node 22.18+ required.');process.exit(1)}"
if errorlevel 1 goto failed
call npm ci
if errorlevel 1 goto failed
call npm run build
if errorlevel 1 goto failed
popd
echo.
echo Build ready. Open chrome://extensions, enable Developer mode,
echo choose Load unpacked, and select:
echo %~dp0Extension
echo.
echo The ZIP and checksum are in %~dp0Downloads
exit /b 0
:failed
popd
echo.
echo Setup failed. Read the error above. No account or release was changed.
exit /b 1
