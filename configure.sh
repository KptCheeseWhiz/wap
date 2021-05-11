#!/bin/bash

if ! command -v npm &>/dev/null; then
  echo "Missing npm, please install nodejs"
  exit 1
fi

cd ./electron
npm i
[ ! -f "./src/.env" ] && cp ./src/.env.template ./src/.env
cd - 1>/dev/null

cd ./server/backend
npm i
[ ! -f "./src/.env" ] && cp ./src/.env.template ./src/.env
cd - 1>/dev/null

cd ./server/frontend
npm i
cd - 1>/dev/null