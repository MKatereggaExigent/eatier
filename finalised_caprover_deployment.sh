#!/usr/bin/env bash

git pull

npm run build

docker compose up --build -d

./latest_caprover_deployment.sh
