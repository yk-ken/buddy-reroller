#!/bin/bash
# 一键发版：同步 PRO secrets → 打 tag → 推送触发 CI
set -e
cd "$(dirname "$0")/.."
VERSION="${1:?Usage: ./scripts/release.sh v1.2.0}"

# 1. 同步 PRO secrets
bash scripts/sync-pro-secrets.sh

# 2. 创建 tag 并推送
git tag "$VERSION"
git push origin "$VERSION"
echo "✅ Released $VERSION"
