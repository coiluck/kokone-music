import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { version } from './package.json'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    define: {
      'APP_VERSION': JSON.stringify(version)
    }
  }
})
