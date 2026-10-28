import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3131,
    proxy: {
      '/api': 'http://localhost:5151',
      // live chat: Socket.io connects to the same address as the page
      '/socket.io': { target: 'http://localhost:5151', ws: true },
    },
  },
})