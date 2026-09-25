import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // In development the API runs on :4000; same-origin /api keeps the auth cookie first-party.
    proxy: { '/api': 'http://localhost:4000' },
  },
})
