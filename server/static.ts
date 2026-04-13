import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Long-lived cache for hashed assets (JS/CSS bundles have content hashes in filenames)
  app.use(
    "/assets",
    express.static(path.join(distPath, "assets"), {
      maxAge: "1y",
      immutable: true,
    }),
  );

  // Long-lived cache for images and audio (1 week)
  app.use(
    "/images",
    express.static(path.join(distPath, "images"), {
      maxAge: "7d",
    }),
  );

  app.use(
    "/audio",
    express.static(path.join(distPath, "audio"), {
      maxAge: "7d",
    }),
  );

  // Everything else (including index.html) — no cache so updates are always picked up
  app.use(
    express.static(distPath, {
      maxAge: 0,
      etag: true,
    }),
  );

  // fall through to index.html if the file doesn't exist
  app.use("/{*path}", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
