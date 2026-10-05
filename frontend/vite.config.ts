import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    {
      name: 'reject-unresolved-html-conflicts',
      transformIndexHtml: {
        order: 'pre',
        handler(html) {
          if (/^(?:<<<<<<< |=======\s*$|>>>>>>> )/m.test(html)) {
            throw new Error('Resolve Git conflict markers in index.html before building or serving the app.')
          }
          return html
        },
      },
    },
    react(),
  ],
  server: { proxy: { '/api': 'http://127.0.0.1:8000' } },
})
