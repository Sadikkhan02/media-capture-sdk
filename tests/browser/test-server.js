import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const PORT = 3344;

const MIME_TYPES = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split("?")[0];
  if (reqPath === "/") reqPath = "/index.html";

  // If path starts with /dist/, serve from dist
  // If path starts with /tests/browser/, serve from tests/browser
  let filePath;
  if (reqPath.startsWith("/dist/")) {
    filePath = path.join(process.cwd(), reqPath);
  } else {
    filePath = path.join(process.cwd(), "tests/browser", reqPath);
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404 Not Found");
    return;
  }

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  res.writeHead(200, {
    "Content-Type": contentType,
    "Access-Control-Allow-Origin": "*",
  });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Test server running at http://localhost:${PORT}`);
});
