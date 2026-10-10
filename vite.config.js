import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { copyFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'

// GitHub Pages serves files, not routes: /r/K7M2QX9 is not a file, so Pages
// answers with 404.html. Publishing index.html as 404.html as well means a
// referral link loads the app, which reads the code out of the URL. Copied after
// the build so it always points at the same hashed assets.
const spaFallback = () => ({
  name: 'spa-404-fallback',
  apply: 'build',
  closeBundle() {
    const out = resolve(process.cwd(), 'dist')
    copyFileSync(resolve(out, 'index.html'), resolve(out, '404.html'))
  },
})

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    spaFallback(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png', 'fonts/*.woff2'],
      manifest: {
        name: 'Sri Raja Bags Partners',
        short_name: 'SRB Partners',
        description: 'Earn by connecting businesses to our bag factory.',
        theme_color: '#05386b',
        background_color: '#f7f9fb',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        orientation: 'portrait',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // The Firebase chunks only matter to affiliates; precaching them would
        // make every buyer who opens a referral link download them too.
        // version.json says which build is deployed, so it must always come from
        // the network: precached, the app would compare itself against a copy of
        // its own build and conclude it was up to date forever.
        globIgnores: ['**/firebase-*.js', '**/version.json'],
        runtimeCaching: [{
          urlPattern: ({ url }) => /\/assets\/firebase-.*\.js$/.test(url.pathname),
          handler: 'CacheFirst',
          options: { cacheName: 'firebase-chunks', expiration: { maxEntries: 10 } },
        }],
      },
    }),
  ],
  server: {
    proxy: {
      // Local preview only: the browser reaches a local referral proxy through
      // the dev server's own port, so only one port has to be forwarded. The
      // Origin is set explicitly because a same-origin GET carries none, and the
      // proxy turns away requests without its allowed origin.
      '/api': {
        target: 'http://localhost:8787',
        rewrite: (path) => path.replace(/^\/api/, ''),
        headers: { origin: 'http://localhost:5173' },
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Named so the service worker rule above can recognise them.
        manualChunks: (id) => (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')
          ? 'firebase' : undefined),
      },
    },
  },
})
