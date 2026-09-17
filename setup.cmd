@echo off
set "PATH=C:\Users\PrasanthS\Documents\Quadra assest management system\.runtime\node-v24.20.0-win-x64;%PATH%"
cd /d "C:\Users\PrasanthS\Documents\STT"
echo [SETUP] Using Node from:
where node
echo [SETUP] Running npm install...
call npm install
echo [SETUP] Exit code: %ERRORLEVEL%
