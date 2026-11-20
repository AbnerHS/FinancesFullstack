import fs from "fs"
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv, type Plugin } from "vite"
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
