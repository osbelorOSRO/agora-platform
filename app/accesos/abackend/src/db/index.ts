import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config(); // Carga las variables del archivo .env

const pool = new Pool({
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT || "5432"),
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  ssl: false // ← como es red Docker interna, NO se usa SSL
});

export default pool;
