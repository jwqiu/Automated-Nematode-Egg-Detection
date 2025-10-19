// frontend/vite.config.js
// @ts-ignore
import { defineConfig } from 'vite'
// @ts-ignore
import react from '@vitejs/plugin-react'

// 桌面构建用相对路径(file:// 可加载)，网页仍用你的子路径
export default defineConfig(() => {
  const isDesktop = process.env.VITE_DESKTOP === '1'
  return {
    plugins: [react()],
    base: isDesktop ? './' : '/Automated-Nematode-Egg-Detection/', // 两端都覆盖到
  }
})
