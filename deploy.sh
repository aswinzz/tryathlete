#!/usr/bin/env bash
set -e

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO_DIR"
PROJECT="proj_cmqqp82r901ax2lf4c00qioaz"
CLI="bunx @prisma/cli@latest"
# Fallback to npx if bun not available
command -v bun &>/dev/null || CLI="npx @prisma/cli@latest"

echo "=== TryAthlete → Prisma Compute Deploy ==="
echo "    Project: $PROJECT"
echo ""

# ── 1. Remove stale git lock ──────────────────────────────────────────────────
[ -f ".git/index.lock" ] && rm -f .git/index.lock && echo "→ Removed stale git lock"

# ── 1b. Regenerate package-lock.json so it reflects current package.json ──────
echo "→ Refreshing package-lock.json..."
rm -f package-lock.json
npm install --package-lock-only --ignore-scripts 2>/dev/null || true

# ── 2. Initial commit ─────────────────────────────────────────────────────────
if ! git log --oneline -1 &>/dev/null; then
  echo "→ Creating initial git commit..."
  git config user.email "aswinvb.aswin6@gmail.com"
  git config user.name "Aswin"
  git add -A
  git commit -m "Initial commit: TryAthlete Next.js app

- Next.js 16 App Router, TypeScript, Tailwind CSS v4
- NextAuth v5 (credentials + JWT)
- Prisma ORM with PostgreSQL + initial migration
- Garmin Connect integration (activities + splits)
- Receipt-style shareable workout cards
- Screens: dashboard, activity detail, share, connect, profile"
  echo "✓ Committed"
else
  git add -A
  git diff-index --quiet HEAD -- || git commit -m "chore: deployment prep"
  echo "✓ Git up to date"
fi

# ── 3. Authenticate ───────────────────────────────────────────────────────────
echo ""
echo "→ Checking auth..."
if $CLI auth whoami --json 2>/dev/null | grep -q '"signed out"'; then
  echo "→ Opening browser for Prisma login (complete it, then come back here)..."
  $CLI auth login
fi
echo "✓ Authenticated as: $($CLI auth whoami -q 2>/dev/null | head -1)"

# ── 4. Get DATABASE_URL from project's primary database ───────────────────────
echo ""
echo "→ Listing databases in project..."
DB_JSON=$($CLI database list --project "$PROJECT" --json 2>/dev/null || echo "{}")
DB_ID=$(echo "$DB_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
dbs = data.get('databases', data) if isinstance(data, dict) else data
if isinstance(dbs, list) and dbs:
    print(dbs[0].get('id',''))
" 2>/dev/null || echo "")

if [ -n "$DB_ID" ]; then
  echo "→ Creating connection for database $DB_ID..."
  CONN_JSON=$($CLI database connection create "$DB_ID" --project "$PROJECT" --json -y 2>/dev/null || echo "{}")
  DATABASE_URL=$(echo "$CONN_JSON" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(data.get('url', data.get('connectionUrl', data.get('databaseUrl', ''))))
" 2>/dev/null || echo "")
fi

if [ -z "$DATABASE_URL" ]; then
  echo ""
  echo "⚠  Could not auto-fetch DATABASE_URL from project."
  echo "   Paste your Prisma Postgres connection string (prisma+postgres://...):"
  read -r DATABASE_URL
fi
echo "✓ DATABASE_URL ready"

# ── 5. Generate NEXTAUTH_SECRET ───────────────────────────────────────────────
NEXTAUTH_SECRET=$(openssl rand -hex 32)

# Write temp env file
cat > /tmp/tryathlete.env <<EOF
DATABASE_URL=$DATABASE_URL
NEXTAUTH_SECRET=$NEXTAUTH_SECRET
EOF

# ── 6. Deploy ─────────────────────────────────────────────────────────────────
echo ""
echo "→ Deploying to branch: main..."
$CLI app deploy \
  --project "$PROJECT" \
  --branch main \
  --framework nextjs \
  --http-port 3000 \
  --env /tmp/tryathlete.env \
  --yes

rm -f /tmp/tryathlete.env

# ── 7. Show result ────────────────────────────────────────────────────────────
echo ""
echo "=== Deploy complete ==="
$CLI app show --project "$PROJECT" 2>/dev/null || true
