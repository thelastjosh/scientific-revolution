import { build as esbuild } from "esbuild";
import { readFile } from "fs/promises";
import path from "path";

/** Match `script/build.ts` so the Vercel bundle behaves like `dist/index.cjs`. */
const allowlist = [
  "bcryptjs",
  "cookie-parser",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "jose",
  "nanoid",
  "pg",
  "zod",
  "zod-validation-error",
];

async function buildVercelApi() {
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));
  const root = path.resolve(import.meta.dirname, "..");

  await esbuild({
    entryPoints: ["vercel/api-handler.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "api/index.js",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
    alias: {
      "@shared": path.join(root, "shared"),
    },
  });
}

buildVercelApi().catch((err) => {
  console.error(err);
  process.exit(1);
});
