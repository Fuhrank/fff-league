#!/bin/bash
# FFF League sync trigger — hits /api/cron/sync to refresh scores/points/wagers.
set -e
source ~/fff-league/.env.local
curl -sS --max-time 25 -H "Authorization: Bearer $CRON_SECRET" \
  https://fff-league.vercel.app/api/cron/sync
