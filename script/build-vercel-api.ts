import { build as esbuild } from "esbuild";
import { mkdir, readFile, writeFile } from "fs/promises";
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
    // esbuild emits CJS; ensure Vercel's runtime sees both a callable
    // `module.exports` and `module.exports.default` so either dispatch
    // convention works.
    footer: {
      js: "if (module.exports && module.exports.default) { const h = module.exports.default; module.exports = h; module.exports.default = h; }",
    },
  });

  // The repo-level package.json declares `"type": "module"`, which would
  // make Node load `api/index.js` as ESM and blow up on our CJS output.
  // A local package.json in the api/ folder overrides that for this file.
  await mkdir("api", { recursive: true });
  await writeFile(
    path.join("api", "package.json"),
    JSON.stringify({ type: "commonjs" }, null, 2) + "\n",
  );
}

buildVercelApi().catch((err) => {
  console.error(err);
  process.exit(1);
});
