# npm Publishing & Release Checklist

This document guides the package owner through the release and publication of `media-capture-sdk` to npm.

---

## 1. Pre-Publish Verification Checklist

Before publishing, ensure all automated verification checks pass:

- [ ] **Clean Git Working Tree:** Ensure all changes are committed and no untracked or unwanted files remain:
  ```bash
  git status
  ```
- [ ] **Run Code Linter:**
  ```bash
  npm run lint
  ```
- [ ] **Run Unit Tests:**
  ```bash
  npm test
  ```
- [ ] **Run Real Browser Integration Tests:**
  ```bash
  npm run test:browser
  ```
- [ ] **Verify Production Bundles:**
  ```bash
  npm run build
  ```
- [ ] **Inspect npm Package Contents:**
  ```bash
  npm pack --dry-run
  ```
  Ensure only `dist/`, `README.md`, `LICENSE`, `CHANGELOG.md`, and `package.json` are packaged. Verify that `tests/`, `src/`, and `.github/` are excluded.

---

## 2. npm Authentication

Ensure you are logged into your npm account:

```bash
npm whoami
```

If not logged in, authenticate:
```bash
npm login
```

---

## 3. Package Name & Scope

The package name configured in `package.json` is `media-capture-sdk`.
If publishing under a personal or organizational scope (e.g. `@your-org/media-capture-sdk`), update the `name` field in `package.json` accordingly before publishing.

---

## 4. Publishing Step (Owner Action)

When ready to publish version `1.0.0`:

```bash
# If publishing an unscoped public package:
npm publish

# If publishing a scoped public package:
npm publish --access public
```

---

## 5. Post-Publish Verification

Verify that the package can be downloaded from the public npm registry:

```bash
npm view media-capture-sdk
```

Test installing into a clean scratch directory:
```bash
mkdir -p /tmp/test-consumer && cd /tmp/test-consumer
npm init -y
npm install media-capture-sdk
node -e "import('media-capture-sdk').then(m => console.log('Successfully imported media-capture-sdk:', Object.keys(m)))"
```
