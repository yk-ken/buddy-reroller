#!/bin/bash
# 同步 gitignored 的 PRO 文件到 GitHub Secrets
# 用法: bun run sync-secrets
set -e
cd "$(dirname "$0")/.."
gh secret set PRO_IMPL_TS < src/pro/pro-impl.ts
gh secret set PRO_SEARCH_IMPL_TS < src/pro/pro-search-impl.ts
gh secret set PRO_SECRET_KEY_TS < src/pro/secret-key.ts
echo "✅ Synced 3 PRO secrets to GitHub"
