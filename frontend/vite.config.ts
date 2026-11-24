import fs from "fs"
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv, type Plugin } from "vite"
import { VitePWA } from "vite-plugin-pwa"
import { tanstackRouter } from '@tanstack/router-plugin/vite'

/**
 * `public/dev-login-*.html` é um atalho de login só para desenvolvimento (guarda um token local).
 * O Vite copia tudo de `public/` para o build; este plugin apaga esses arquivos do `dist/`, para
 * nenhum deploy feito desta máquina publicá-los.
 */
function stripDevLoginPages(): Plugin {
  let outDir = "dist"
  return {
    name: "strip-dev-login-pages",
    apply: "build",
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      if (!fs.existsSync(outDir)) return
      for (const file of fs.readdirSync(outDir)) {
        if (/^dev-login.*\.html$/.test(file)) {
          fs.rmSync(path.join(outDir, file))
        }
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "")

  return {
    plugins: [
      tanstackRouter({
        target: 'react',
        autoCodeSplitting: true,
      }),
      react(),
      tailwindcss(),
      stripDevLoginPages(),
      // App instalável: service worker com o app em cache (abre rápido e sem rede mostra a
      // interface). A API fica fora do cache: em produção é outro domínio, e no dev o /api é
      // excluído do fallback. O manifesto é o de public/manifest.webmanifest.
      VitePWA({
        registerType: "prompt",
        injectRegister: false,
        manifest: false,
        workbox: {
          globPatterns: ["**/*.{js,css,html,svg,png,ico,webmanifest,woff2}"],
          globIgnores: ["**/dev-login*.html"],
          navigateFallback: "/index.html",
          navigateFallbackDenylist: [/^\/api\//, /^\/dev-login/],
          cleanupOutdatedCaches: true,
        },
      }),
    ],
    server: {
      host: true,
      proxy: {
        "/api": {
          target: env.VITE_API_PROXY_TARGET,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  }
})
