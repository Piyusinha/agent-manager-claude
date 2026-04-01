#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
DESKTOP="$REPO_ROOT/desktop"
OUT="$DESKTOP/dist-app"

echo "╔══════════════════════════════════════╗"
echo "║   Agent Manager — macOS Build        ║"
echo "╚══════════════════════════════════════╝"

# ── 1. Kill any running dev instance ────────────────────────────────────────
echo ""
echo "▶ Stopping dev processes..."
pkill -f "electron ." 2>/dev/null || true
pkill -f "vite"       2>/dev/null || true
sleep 0.5

# ── 2. Install deps ──────────────────────────────────────────────────────────
echo "▶ Installing desktop dependencies..."
cd "$DESKTOP"
npm install --silent

echo "▶ Installing server dependencies..."
cd "$REPO_ROOT"
npm install --silent

# ── 3. Build renderer ────────────────────────────────────────────────────────
echo "▶ Building renderer (Vite)..."
cd "$DESKTOP"
npx vite build

# ── 4. Package with electron-builder ─────────────────────────────────────────
echo "▶ Packaging macOS app..."
cd "$DESKTOP"
npx electron-builder --mac --config electron-builder.yml

# ── 5. Done ──────────────────────────────────────────────────────────────────
echo ""
echo "✅ Build complete!"
echo ""
echo "Output:"
ls -lh "$OUT"/*.dmg 2>/dev/null || true
echo ""
echo "📦 DMG location: $OUT"
echo ""
echo "To install: open the DMG and drag Agent Manager to Applications."
