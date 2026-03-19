#!/bin/sh
set -e

echo "[entrypoint] Running Prisma migrations..."
npx prisma migrate deploy --schema=apps/backend-api/prisma/schema.prisma 2>&1 || echo "[entrypoint] Migration warning (may already be applied)"

echo "[entrypoint] Checking if database needs seeding..."
# Simple check: if employees table is empty, run seed
NEEDS_SEED=$(node -e "
const{PrismaClient}=require('@prisma/client');
const{PrismaPg}=require('@prisma/adapter-pg');
const a=new PrismaPg({connectionString:process.env.DATABASE_URL});
const p=new PrismaClient({adapter:a});
p.employee.count().then(c=>{console.log(c===0?'yes':'no');p.\$disconnect()}).catch(()=>{console.log('yes')});
" 2>/dev/null || echo "yes")

if [ "$NEEDS_SEED" = "yes" ]; then
  echo "[entrypoint] Seeding database..."
  node dist/apps/backend-api/apps/backend-api/prisma/seed.js 2>&1 || echo "[entrypoint] Seed warning"
else
  echo "[entrypoint] Database already seeded (${NEEDS_SEED} employees found)"
fi

echo "[entrypoint] Starting server..."
exec node dist/apps/backend-api/main.js
