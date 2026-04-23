import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

const firebaseMessagingSwDevPlugin = (): Plugin => ({
  name: 'firebase-messaging-sw-dev',
  configureServer(server) {
    server.middlewares.use('/firebase-messaging-sw.js', async (_req, res, next) => {
      try {
        const result = await server.transformRequest('/src/firebase-messaging-sw.ts')
        if (!result) {
          next()
          return
        }

        res.statusCode = 200
        res.setHeader('Content-Type', 'application/javascript')
        res.end(result.code)
      } catch (err) {
        next(err)
      }
    })
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), firebaseMessagingSwDevPlugin()],
  build: {
    rollupOptions: {
      input: {
        app: fileURLToPath(new URL('./index.html', import.meta.url)),
        'firebase-messaging-sw': fileURLToPath(new URL('./src/firebase-messaging-sw.ts', import.meta.url)),
      },
      output: {
        entryFileNames: (chunkInfo) =>
          chunkInfo.name === 'firebase-messaging-sw'
            ? 'firebase-messaging-sw.js'
            : 'assets/[name]-[hash].js',
        manualChunks(id) {
          if (!id.includes('node_modules')) return

          if (id.includes('firebase')) return 'firebase'
          if (
            id.includes('react-hook-form') ||
            id.includes('@hookform/resolvers') ||
            id.includes('zod')
          ) {
            return 'forms'
          }
          if (id.includes('react') || id.includes('scheduler')) return 'react-vendor'

          return 'vendor'
        },
      },
    },
  },
})
