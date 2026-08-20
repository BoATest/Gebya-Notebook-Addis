import path from "path";
import { fileURLToPath } from "url";
import { build as esbuild } from "esbuild";
import { rm, readFile } from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function buildAll() {
  const distDir = path.resolve(__dirname, "dist");
  await rm(distDir, { recursive: true, force: true });

  console.log("building server (self-contained bundle)...");

  // Bundle EVERYTHING into a single file so the deployed Vercel function does
  // NOT depend on `node_modules` being installed at runtime. Vercel's
  // auto-detected entrypoint keeps bare imports external, and the project's
  // install step is intentionally skipped (`echo Skipping`), so the only robust
  // option is to inline all runtime dependencies here. `pg-native` is an
  // optional, platform-specific binary that is loaded lazily by `pg`; leaving it
  // external lets pg fall back to its JS implementation.
  const externals = ["pg-native"];

  await esbuild({
    entryPoints: [path.resolve(__dirname, "src/main.ts")],
    platform: "node",
    bundle: true,
    format: "esm",
    outfile: path.resolve(distDir, "index.mjs"),
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    banner: {
      js: `import { createRequire as __gbyaRequire } from "module";\nconst require = __gbyaRequire(import.meta.url);\n`,
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });

  console.log("build done");
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
