/**
 * Minimal reference agent: verifies Sail → agent HMAC and responds 200.
 * Run: AGENT_SIGNING_SECRET=... node reference-agent/stub-server.mjs
 * Default port 47123.
 */
import http from "node:http";
import { createHmac } from "node:crypto";

const PORT = Number(process.env.AGENT_STUB_PORT || 47123);
const SECRET = process.env.AGENT_SIGNING_SECRET || "";

function sign(ts, body) {
  return createHmac("sha256", SECRET).update(`${ts}.${body}`).digest("hex");
}

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/v1/network/dispatch") {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const body = Buffer.concat(chunks).toString("utf8");
      const ts = req.headers["x-sail-timestamp"] || "";
      const sig = req.headers["x-sail-signature"] || "";
      const org = req.headers["x-sail-organization-id"] || "";
      if (!SECRET) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, note: "AGENT_SIGNING_SECRET unset; skipping verify" }));
        return;
      }
      const expected = sign(ts, body);
      if (expected !== sig) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "bad_signature" }));
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, organizationId: org, received: JSON.parse(body || "{}") }));
    });
    return;
  }
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200);
    res.end("ok");
    return;
  }
  res.writeHead(404);
  res.end();
});

server.listen(PORT, () => {
  console.log(`reference-agent stub on http://127.0.0.1:${PORT} (set AGENT_SIGNING_SECRET to verify HMAC)`);
});
