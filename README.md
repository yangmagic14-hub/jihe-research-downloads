# 籍合研究检索台

Public download page for the Jihe research desktop prototype.

- Download page: GitHub Pages deploys the `site/` directory.
- Desktop app source: `jihe-desktop/`.
- The Windows application is distributed as a GitHub Release asset.
- The public repository contains only this app and its download page, not the separate research workspace.
- The app does not store library credentials or cookies. Users authenticate themselves in the official website window.

The Windows portable build and macOS DMG/ZIP packages are built by GitHub Actions for each release tag. Every package bundles Electron and does not require a separate Node.js installation. The macOS packages are not signed or notarized, so macOS may ask the user to approve opening the app.
