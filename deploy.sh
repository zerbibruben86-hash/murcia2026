#!/bin/bash
set -e

echo ""
echo "🔨  Build local (génère .vercel/output/)..."
npx vercel build --prod 2>&1

echo ""
echo "🚀  Déploiement sur Vercel (sans rebuild en ligne)..."
DEPLOY_URL=$(npx vercel deploy --prebuilt --prod 2>/dev/null | grep -oE 'https://murcia2026-[^"[:space:]]+' | tail -1)

if [ -z "$DEPLOY_URL" ]; then
  echo "❌  Impossible de récupérer l'URL de déploiement."
  exit 1
fi

echo "✅  Déployé sur : $DEPLOY_URL"
echo ""

echo "🔗  Mise à jour des alias..."
npx vercel alias set "$DEPLOY_URL" murcia2026.vercel.app
npx vercel alias set "$DEPLOY_URL" camurce.vercel.app

echo ""
echo "🎉  Terminé !"
echo "   → https://murcia2026.vercel.app"
echo "   → https://camurce.vercel.app"
echo "   pointent maintenant sur : $DEPLOY_URL"
