// Generates an scrypt hash for the admin password.
// Usage: node scripts/hash-password.mjs "minha-senha-forte"
import { scryptSync, randomBytes } from "node:crypto";

const password = process.argv[2];
if (!password) {
  console.error('Uso: node scripts/hash-password.mjs "sua-senha"');
  process.exit(1);
}

const salt = randomBytes(16);
const hash = scryptSync(password, salt, 64);
console.log(`${salt.toString("hex")}:${hash.toString("hex")}`);
