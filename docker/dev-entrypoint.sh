#!/bin/sh
set -eu

export CI=true

pnpm --config.store-dir=/pnpm/store install --frozen-lockfile
pnpm --config.store-dir=/pnpm/store db:push
pnpm --config.store-dir=/pnpm/store db:generate

exec pnpm --config.store-dir=/pnpm/store dev --host 0.0.0.0
