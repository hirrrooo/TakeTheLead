#!/bin/sh
set -eu

pnpm install --frozen-lockfile
pnpm db:push
pnpm db:generate

exec pnpm dev --host 0.0.0.0
