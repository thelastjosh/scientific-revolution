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
    // Output to _bundle.cjs; api/index.js is a committed wrapper that
    // `require`s this file. Keeps git diffs small across builds and makes
    // Vercel's function glob match a stable committed file.
    outfile: "api/_bundle.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
    alias: {
      "@shared": path.join(root, "shared"),
    },
    // esbuild's CJS output sets `module.exports.default = handler`; expose
    // the handler directly on `module.exports` too so Vercel accepts it
    // under either dispatch convention.
    footer: {
      js: "if (module.exports && module.exports.default) { const h = module.exports.default; module.exports = h; module.exports.default = h; }",
    },
  });

  // The repo root has `"type": "module"`; without this override Node would
  // load the .cjs bundle through the ESM loader in some dispatch paths.
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
