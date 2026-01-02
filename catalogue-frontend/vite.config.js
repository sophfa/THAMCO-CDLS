import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const keepConsole =
    mode !== 'production' || process.env.VITE_KEEP_CONSOLE === 'true'

  return {
    plugins: [vue()],
    build: {
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: !keepConsole,
        },
      },
    },
  }
})
