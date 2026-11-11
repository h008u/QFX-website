#!/usr/bin/env bash
# يطبّق الـ migrations والبيانات التجريبية على قاعدة PostgreSQL فارغة ثم يشغّل اختبارات RLS.
# الاستخدام: DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres supabase/tests/run.sh
set -euo pipefail
cd "$(dirname "$0")/.."
URL="${DATABASE_URL:?set DATABASE_URL}"
psql "$URL" -v ON_ERROR_STOP=1 -q -c "drop database if exists qfx_test" -c "create database qfx_test"
TEST_URL="$(printf %s "$URL" | sed -E 's#/[^/?]+(\?|$)#/qfx_test\1#')"
psql "$TEST_URL" -v ON_ERROR_STOP=1 -q -f tests/00_supabase_stub.sql 2>&1 | grep -v "wal_level\|^HINT" || true
for f in migrations/*.sql; do psql "$TEST_URL" -v ON_ERROR_STOP=1 -q -f "$f"; done
psql "$TEST_URL" -v ON_ERROR_STOP=1 -q -f seed.sql
psql "$TEST_URL" -v ON_ERROR_STOP=1 -q -o /dev/null -f tests/rls_test.sql
