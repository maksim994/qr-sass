// Synthetic S3 protocol stub for named local/isolated integration tests. No real credentials/data.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
assertSynthetic();
function assertSynthetic() {
  if (process.env.BLOG_TEST_S3 !== "synthetic-only")
    throw Error("Explicit synthetic fixture flag required");
}
const files = new Map();
if (process.env.BLOG_TEST_S3_SEED) {
  for (const file of JSON.parse(readFileSync(process.env.BLOG_TEST_S3_SEED,"utf8"))) files.set("/fixture/"+file.key, {body:Buffer.from(file.body,"base64"),type:file.contentType});
}
function decode(body, encoding) {
  if (!encoding?.includes("aws-chunked")) return body;
  const chunks = [];
  let pos = 0;
  for (;;) {
    const end = body.indexOf("\r\n", pos);
    if (end < 0) throw Error("Invalid chunk");
    const size = parseInt(body.subarray(pos, end).toString().split(";")[0], 16);
    if (!size) break;
    pos = end + 2;
    chunks.push(body.subarray(pos, pos + size));
    pos += size + 2;
  }
  return Buffer.concat(chunks);
}
const server = createServer(async (req, res) => {
  if (req.url === "/health") {
    res.end("ok");
    return;
  }
  if (req.url === "/stats") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ keys: [...files.keys()] }));
    return;
  }
  if (req.method === "PUT") {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    files.set(new URL(req.url, "http://synthetic").pathname, {
      body: decode(Buffer.concat(chunks), req.headers["content-encoding"]),
      type: req.headers["content-type"],
    });
    res.writeHead(200, { ETag: '"fixture"' });
    res.end();
    return;
  }
  if (req.method === "DELETE") {
    files.delete(new URL(req.url, "http://synthetic").pathname);
    res.writeHead(204);
    res.end();
    return;
  }
  const file = files.get(new URL(req.url, "http://synthetic").pathname);
  if (!file) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.writeHead(200, {
    "Content-Type": file.type,
    "Content-Length": file.body.length,
    ETag: `"${createHash("sha256").update(file.body).digest("hex")}"`,
    "Last-Modified": "Tue, 20 Oct 2026 10:00:00 GMT",
  });
  res.end(req.method === "HEAD" ? undefined : file.body);
});
server.listen(
  Number(process.env.PORT || 55439),
  process.env.HOSTNAME || "127.0.0.1",
  () => console.log("Synthetic S3 ready"),
);
