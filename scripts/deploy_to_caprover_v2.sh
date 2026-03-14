#!/usr/bin/env bash
./scripts/deploy_all.sh
caprover deploy --caproverName aidoc-server --caproverApp itiyum --tarFile ~/itiyum-frontend.tar.gz
