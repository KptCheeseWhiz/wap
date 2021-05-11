@echo off

cmd /C "npm -v >nul 2>&1"
if %ERRORLEVEL% NEQ 0 (
	echo Missing npm, please install nodejs
	exit 1
)

pushd electron\
cmd /C "npm i"
if not exist src\.env copy src\.env.template src\.env
popd

pushd server\backend\
cmd /C "npm i"
if not exist src\.env copy src\.env.template src\.env
popd

pushd server\frontend\
cmd /C "npm i"
popd