#!/usr/bin/env bash

git pull

npm run build

docker compose up --build -d

./scripts/latest_caprover_deployment.sh
