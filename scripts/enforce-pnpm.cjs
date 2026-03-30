const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const userAgent = process.env.npm_config_user_agent || "";

for (const lockFile of ["package-lock.json", "yarn.lock"]) {
  const lockPath = path.join(rootDir, lockFile);
  if (fs.existsSync(lockPath)) {
    fs.rmSync(lockPath, { force: true });
  }
}

if (!userAgent.startsWith("pnpm/")) {
  console.error("Use pnpm instead");
  process.exit(1);
}
