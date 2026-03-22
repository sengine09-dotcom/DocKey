import "dotenv/config";
import { defineConfig, env } from "prisma/config";

if (!process.env.DATABASE_URL && process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME) {
  const password = process.env.DB_PASSWORD ? `:${process.env.DB_PASSWORD}` : "";
  const port = process.env.DB_PORT || "3306";

  process.env.DATABASE_URL = `mysql://${process.env.DB_USER}${password}@${process.env.DB_HOST}:${port}/${process.env.DB_NAME}`;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
