# Android Google Play Publication Audit Report

## 🚨 Critical Issues (Must Fix)

### 1. Package Name is Default (`com.anonymous`)
- **Location**: `app.config.js`, `android/app/build.gradle`, `android/app/src/main/AndroidManifest.xml`
- **Current Value**: `com.anonymous.DomGoMobile`
- **Problem**: `com.anonymous` is the default placeholder used by Expo. Google Play will likely reject this, and it cannot be changed after the first upload.
- **Recommendation**: Change this to a unique identifier, e.g., `com.domgo.mobile` or `ru.domgo.app`.

### 2. Build Type is APK (AAB Required)
- **Location**: `eas.json` (production profile)
- **Current Value**: `"buildType": "apk"`
- **Problem**: Google Play Console **requires** Android App Bundles (.aab) for all new apps. APKs are no longer accepted for new releases.
- **Recommendation**: Change `"buildType": "apk"` to `"buildType": "app-bundle"` (or remove it to use default) in the `production` profile.

### 3. Google Maps API Key Placeholder
- **Location**: `android/app/src/main/AndroidManifest.xml`
- **Current Value**: `android:value="YOUR_GOOGLE_MAPS_API_KEY"`
- **Problem**: The native manifest contains a placeholder. While `app.config.js` is set up to inject the key from environment variables, if the native project is not properly synced or if `npx expo prebuild` is not run before build, this placeholder might remain, causing Maps to fail in production.
- **Recommendation**: Ensure `npx expo prebuild` is run or manually update this value in the manifest to reference the injected string resource or the actual key (though env var injection is better).

## ⚠️ Warnings & Recommendations

### 1. Version Code
- **Location**: `android/app/build.gradle`
- **Current Value**: `1`
- **Recommendation**: Ensure your CI/CD or EAS Build process increments this for every upload. Google Play requires a unique Version Code for every artifact.

### 2. Permissions & Privacy
- **Location**: `AndroidManifest.xml`
- **Permissions**: `ACCESS_FINE_LOCATION`, `READ_MEDIA_IMAGES`
- **Recommendation**: You must have a valid Privacy Policy URL in the Google Play Console. You will also need to complete the "Location Permissions" declaration form explaining why you need precise location.

### 3. Signing Configuration
- **Location**: `android/app/build.gradle`
- **Observation**: The release build type uses `signingConfig signingConfigs.debug`.
- **Context**: If you are using EAS Build, this is usually ignored as EAS signs the artifact on their servers. However, for local release builds, this is incorrect.

## Action Plan

1.  **Update Package Name**: Rename the package in all files.
2.  **Update EAS Config**: Switch production build to AAB.
3.  **Verify Maps Key**: Ensure the API key is correctly propagated.
4.  **Build & Test**: Run a new build with these fixes.
