# GitHub Actions Setup Instructions

## Secrets to Add

Go to: https://github.com/angstremoff/domgomobile/settings/secrets/actions

Add these secrets:

### 1. KEYSTORE_BASE64
Copy the content of `release.keystore.base64` file:
```bash
cat release.keystore.base64
```
Paste the entire output as the secret value.

### 2. KEYSTORE_PASSWORD
```
domgo2024release
```

### 3. KEY_ALIAS
```
domgo-release
```

### 4. KEY_PASSWORD
```
domgo2024release
```

## Testing the Workflow

1. Commit changes:
```bash
git add .github/workflows/build-android.yml android/app/build.gradle
git commit -m "ci: add GitHub Actions build workflow"
git push origin main
```

2. Go to: https://github.com/angstremoff/domgomobile/actions

3. Watch the build run!

4. Download AAB from "Artifacts" section after build completes

## Manual Trigger

You can also trigger builds manually:
- Go to Actions tab
- Select "Build Android AAB" workflow
- Click "Run workflow" button
