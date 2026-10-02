import type { Database } from "./db/client.ts"
import type { User } from "./db/schema.ts"

export type AppEnv = {
  Bindings: Env
  Variables: {
    db: Database
    user: User
  }
}
