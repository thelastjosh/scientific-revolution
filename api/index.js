// Thin wrapper committed to satisfy Vercel's `functions` glob in vercel.json.
// The real handler is the CJS bundle produced by `npm run build:vercel-api`
// (see `script/build-vercel-api.ts`). Do not edit — both the wrapper and the
// local `package.json` (type: commonjs) are intentionally minimal.
module.exports = require("./_bundle.cjs");
