import path from "node:path"
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [
    cloudflareTest(async () => ({
      main: "./src/index.ts",
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        bindings: {
          TEST_MIGRATIONS: await readD1Migrations(path.join(import.meta.dirname, "migrations")),
          // Segredos fixos de teste (base64 de 32 bytes), independentes do .dev.vars.
          JWT_ACCESS_TOKEN_SECRET: "YWNjZXNzLXRlc3Qtc2VjcmV0LTMyLWJ5dGVzLWxvbmch",
          JWT_REFRESH_TOKEN_SECRET: "cmVmcmVzaC10ZXN0LXNlY3JldC0zMi1ieXRlcy1sb25n",
          GOOGLE_OAUTH_CLIENT_ID: "test-client",
          GOOGLE_OAUTH_CLIENT_SECRET: "test",
          GOOGLE_OAUTH_REDIRECT_URI: "https://finances.test/auth/google/callback",
          GOOGLE_OAUTH_TOKEN_URI: "https://google.test/token",
          GOOGLE_OAUTH_USERINFO_URI: "https://google.test/userinfo",
          JWT_REFRESH_COOKIE_SECURE: "false",
          // 1 MB nos testes, para testar o limite sem gerar arquivos grandes.
          TRANSACTION_DOCUMENTS_MAX_FILE_SIZE: "1048576",
        },
      },
    })),
  ],
  test: {
    setupFiles: ["./test/apply-migrations.ts"],
  },
})
