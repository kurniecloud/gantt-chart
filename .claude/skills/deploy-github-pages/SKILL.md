---
name: deploy-github-pages
description: Set up, check or fix deployment of the static build to GitHub Pages via GitHub Actions — Vite base path, the deploy workflow, repository Pages settings, and common 404/blank-page problems. Use when asked to deploy, publish, or when the live site is broken.
---

# Deploy to GitHub Pages

The site is served at `https://<user>.github.io/gantt-chart/`, so everything must work under
the `/gantt-chart/` sub-path.

## 1. Vite config

```ts
// vite.config.ts
export default defineConfig({
  base: '/gantt-chart/', // must match the repository name
  plugins: [react()],
  build: { outDir: 'dist', sourcemap: true },
});
```

- Reference assets via imports or `import.meta.env.BASE_URL`, never absolute `/foo.png`.
- If routing is added, use hash routing (`#/project/123`) — Pages has no SPA rewrites.
- Copy `dist/index.html` to `dist/404.html` in the build step as a safety net.

## 2. Workflow `.github/workflows/deploy.yml`

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version-file: .nvmrc
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run test -- --run
      - run: npm run build
      - run: cp dist/index.html dist/404.html
      - uses: actions/configure-pages@v6
      - uses: actions/upload-pages-artifact@v5
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v5
```

Check for newer major versions of these actions when creating the file.
A separate `ci.yml` should run the same checks (plus Playwright) on pull requests.

## 3. Repository settings (the user does this once)

GitHub → repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
This is a settings change on the user's account — tell them the exact steps; don't do it
for them.

## 4. Verify locally before pushing

```bash
npm run build && npm run preview
```

Open `http://localhost:4173/gantt-chart/` and check: page loads, no 404s in the network tab,
create a task, reload → it persists (IndexedDB).

## Troubleshooting

| Symptom                                         | Cause                                                                          |
| ----------------------------------------------- | ------------------------------------------------------------------------------ |
| Blank page, 404 on `/assets/*.js`               | `base` missing or doesn't match repo name                                      |
| Works at root, 404 on refresh of a sub-route    | using history routing — switch to hash routing                                 |
| Workflow fails at deploy with permissions error | missing `pages: write` / `id-token: write`, or Pages source not set to Actions |
| Old version still showing                       | browser/PWA cache — hard reload; bump service-worker version                   |
