#!/bin/bash
set -e

echo "🏃 TryAthlete setup"
echo "=================="

# Install deps
echo "→ Installing dependencies..."
npm install

# Generate Prisma client + migrate DB
echo "→ Setting up database..."
npx prisma generate
npx prisma db push

echo ""
echo "✅ Setup complete!"
echo ""
echo "Start the dev server:"
echo "  npm run dev"
echo ""
echo "Open: http://localhost:3000"
