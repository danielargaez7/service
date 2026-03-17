#!/bin/bash
set -euo pipefail

echo "============================================"
echo "  ServiceCore API Client Generator"
echo "============================================"
echo ""

# Wait for Kimai to be healthy
echo "⏳ Waiting for Kimai API to be available..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:8001/api/doc.json > /dev/null 2>&1; then
    echo "✅ Kimai API is ready"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "❌ Kimai API not available after 30 attempts. Skipping."
  fi
  sleep 2
done

# Wait for TimeTrex to be healthy
echo "⏳ Waiting for TimeTrex API to be available..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:8002/api/v1/doc.json > /dev/null 2>&1; then
    echo "✅ TimeTrex API is ready"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "❌ TimeTrex API not available after 30 attempts. Skipping."
  fi
  sleep 2
done

echo ""
echo "📦 Generating Kimai TypeScript client..."
npx nswag openapi2tsclient \
  /input:http://localhost:8001/api/doc.json \
  /output:libs/api-client/src/kimai.ts \
  /generateClientClasses:true \
  /template:Angular || echo "⚠️  Kimai client generation failed (service may not be running)"

echo ""
echo "📦 Generating TimeTrex TypeScript client..."
npx nswag openapi2tsclient \
  /input:http://localhost:8002/api/v1/doc.json \
  /output:libs/api-client/src/timetrex.ts \
  /generateClientClasses:true \
  /template:Angular || echo "⚠️  TimeTrex client generation failed (service may not be running)"

echo ""
echo "============================================"
echo "  ✅ API client generation complete"
echo "  ⚠️  DO NOT EDIT generated files manually"
echo "============================================"
