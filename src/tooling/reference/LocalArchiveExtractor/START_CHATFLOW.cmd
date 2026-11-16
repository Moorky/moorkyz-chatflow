@echo off
setlocal
cd /d "%~dp0"
set /p "SOURCE=Path to ChatGPT export ZIP or conversations.json: "
set "SOURCE=%SOURCE:"=%"
py -3 "%~dp0chatflow_extract.py" "%SOURCE%" --out "%~dp0chatflow-output"
if errorlevel 1 pause
