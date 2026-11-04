import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { basename, resolve } from 'node:path';
import { copyFile } from 'node:fs/promises';
import { readRelease } from './scripts/release.mjs';

/**
 * One place describes the release: the APK file itself. Version, version code, package, size and
 * SHA-256 are read from it on every build and written into the page, so the numbers can never drift
 * from the file the buttons serve.
 */
const releasePlugin = (release, root) => ({
  name: 'nexusos-release',
  transformIndexHtml(html) {
    const tokens = {
      '%APK_FILE%': release.apkFile,
      '%VERSION_LABEL%': release.versionLabel,
      '%VERSION%': release.version,
      '%SIZE%': release.sizeLabel,
      '%SHA256%': release.sha256,
      '%PACKAGE%': release.packageName ?? 'Unknown'
    };
    return Object.entries(tokens).reduce((page, [token, value]) => page.split(token).join(value), html);
  },
  async closeBundle() {
    const outDir = resolve(root, 'dist');
    // The APK and PNG icons can live at the repo root, outside public/, so publish them here.
    for (const file of [release.apkPath, resolve(root, 'icon-192.png'), resolve(root, 'icon-512.png')]) {
      try {
        await copyFile(file, resolve(outDir, basename(file)));
      } catch {
        // Already published through public/ — nothing to copy.
      }
    }
  }
});

export default defineConfig(async () => {
  const root = fileURLToPath(new URL('.', import.meta.url));
  const release = await readRelease(root);

  return {
    root,
    plugins: [react(), releasePlugin(release, root)],
    define: { __APK_FILE__: JSON.stringify(release.apkFile) },
    publicDir: 'public',
    // This site ships plain CSS; skip the parent project's PostCSS/Tailwind config.
    css: { postcss: { plugins: [] } },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      target: 'es2020'
    }
  };
});
