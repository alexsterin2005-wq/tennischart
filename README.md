# TennisChart — iOS build

Capacitor wrapper around `www/index.html`. No backend.

## For Aaron: ship to TestFlight / App Store

Requirements: Mac with Xcode 15+, CocoaPods, Node 18+.

```bash
npm install
npx cap sync ios
npx cap open ios
```

In Xcode:
1. Select the **App** target → **Signing & Capabilities** → Team = BaselineBook LLC. Bundle ID is `com.baselinebook.tennischart`.
2. **General** → Display Name `TennisChart`, Version `1.0.0`, Build `1`.
3. **Product → Archive** → **Distribute App** → App Store Connect → Upload.

In App Store Connect:
- New app, Bundle ID `com.baselinebook.tennischart`, SKU `tennischart`.
- Category: Sports. Age rating: 4+.
- Privacy: "Data Not Collected" (true — nothing leaves the device).
- Privacy Policy URL: host `PRIVACY.md` anywhere public (GitHub Pages is fine).
- Screenshots: 6.7" and 6.1" iPhone. Capture from the Simulator: setup screen, live scoring, break point, stats table, report image.
- Listing copy is in `STORE.md`.

## Updating the app
Edit `www/index.html` → `npx cap sync ios` → bump Build number → Archive → Upload. That's it.

## Quick local test
`npx cap run ios` launches it in the Simulator. Haptics only work on a real device.
