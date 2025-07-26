import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/Automated-Nematode-Egg-Detection/', // 必须以 / 开头和结尾不要漏
  plugins: [react()],
})
