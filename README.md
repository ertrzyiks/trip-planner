# trip-planner

Fresh Astro site scaffolded for deployment to GitHub Pages.

## Development

```bash
npm install
npm run dev
```

## Deployment

Pushes to `main` trigger `.github/workflows/deploy.yml`, which builds the Astro site and deploys the contents of `dist/` to GitHub Pages.