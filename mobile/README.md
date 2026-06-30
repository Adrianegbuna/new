# RenewableZmart Mobile

This is the new Expo React Native customer app scaffold for Android.

## Current scope

- Customer auth flow
- Home screen
- Product browsing
- Product details
- Cart
- Orders
- Profile

## Run

1. Open the `mobile` directory.
2. Install dependencies with `npm install`.
3. Start Expo with `npm run start`.
4. For Android emulator local backend access, keep:

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:4000/api
```

5. For a physical device, replace `10.0.2.2` with your computer's LAN IP.
6. To run on Android, you still need either:

- a connected Android phone with USB debugging enabled, or
- an Android Studio emulator/AVD created on this machine

## Notes

- This mobile app talks to the existing backend.
- MFA, checkout payments, wishlist, reviews, and address management are not finished yet.
- The initial goal is the customer shopping flow first.
- The mobile app now persists auth and cart data locally between launches.
