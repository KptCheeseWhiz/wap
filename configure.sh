#!/bin/bash

if ! command -v npm &>/dev/null; then
  echo "Missing npm, please install nodejs"
  exit 1
fi

cd ./electron
[ ! -d "./node_modules" ] && npm i
[ ! -f "./src/.env" ] && cp ./src/.env.template ./src/.env
cd - 1>/dev/null

cd ./server/backend
[ ! -d "./node_modules" ] && npm i
[ ! -f "./src/.env" ] && cp ./src/.env.template ./src/.env
cd - 1>/dev/null

cd ./server/frontend
[ ! -d "./node_modules" ] && npm i
cd - 1>/dev/null