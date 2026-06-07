#!/usr/bin/env bash
# Ativa o build gate (pre-commit). Rode UMA vez por clone do repo:
#   bash scripts/setup-hooks.sh
set -euo pipefail
cd "$(dirname "$0")/.."

git config core.hooksPath .githooks
chmod +x .githooks/pre-commit 2>/dev/null || true
echo "✅ core.hooksPath = .githooks (build gate ativo)"
echo "   Commits que tocam apps/web ou o Dockerfile agora rodam 'docker compose build web' antes."
echo "   Docker Desktop precisa estar rodando. Para desativar: git config --unset core.hooksPath"
