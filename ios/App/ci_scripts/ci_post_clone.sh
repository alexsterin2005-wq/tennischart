#!/bin/sh
# Xcode Cloud: install Node deps, sync the web build into the iOS project, install Pods.
set -e
cd "$CI_PRIMARY_REPOSITORY_PATH"
export HOMEBREW_NO_AUTO_UPDATE=1
brew install node cocoapods >/dev/null 2>&1 || true
npm ci --no-audit --no-fund || npm install --no-audit --no-fund
npx cap sync ios
cd ios/App && pod install
