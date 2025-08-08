import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      //'/ephemeris': 'http://ec2-54-174-228-131.compute-1.amazonaws.com:8080',
      //'/ephemeris' : 'http://localhost:8080',
      '/ephemeris': 'https://yairalonapp.alephclass.com/',
    }
  }
})
