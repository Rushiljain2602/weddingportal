import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Enable JSON body parsing for base64 image uploads
  app.use(express.json({ limit: "15mb" }));

  // In-memory store for custom uploaded card images
  const cardImageStore = new Map<string, { buffer: Buffer; contentType: string }>();

  // API health route
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Endpoint to receive base64 card image upload and return public HTTPS image link
  app.post("/api/upload-card-image", (req, res) => {
    try {
      const { id, dataUrl } = req.body;
      if (!id || !dataUrl || typeof dataUrl !== 'string') {
        return res.status(400).json({ error: "Missing image id or dataUrl" });
      }

      let buffer: Buffer;
      let contentType = "image/jpeg";

      if (dataUrl.startsWith("data:")) {
        const matches = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
        if (!matches) {
          return res.status(400).json({ error: "Invalid base64 format" });
        }
        contentType = matches[1];
        buffer = Buffer.from(matches[2], "base64");
      } else {
        return res.status(400).json({ error: "dataUrl must be a base64 data URI" });
      }

      cardImageStore.set(id, { buffer, contentType });

      // Cache to filesystem for persistent serving
      try {
        const tmpDir = path.join("/tmp", "card_images");
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
        fs.writeFileSync(path.join(tmpDir, `${id}.jpg`), buffer);
      } catch (fsErr) {
        // fallback
      }

      const protocol = req.headers["x-forwarded-proto"] || "https";
      const host = req.headers["x-forwarded-host"] || req.headers.host;
      const imageUrl = `${protocol}://${host}/api/card-image/${id}.jpg`;

      res.json({ success: true, imageUrl, id });
    } catch (err: any) {
      console.error("Error storing card image:", err);
      res.status(500).json({ error: err.message || "Failed to process image" });
    }
  });

  // In-memory store for high-speed candid gallery photos
  const photoStore = new Map<string, { buffer: Buffer; contentType: string; uploadedAt: string }>();

  // High-performance photo upload endpoint (under 50ms)
  app.post("/api/photos/upload", (req, res) => {
    try {
      const { id: customId, dataUrl, weddingId, guestName } = req.body;
      if (!dataUrl || typeof dataUrl !== 'string') {
        return res.status(400).json({ error: "Missing dataUrl" });
      }

      let buffer: Buffer;
      let contentType = "image/jpeg";

      if (dataUrl.startsWith("data:")) {
        const matches = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
        if (!matches) {
          return res.status(400).json({ error: "Invalid base64 image data" });
        }
        contentType = matches[1];
        buffer = Buffer.from(matches[2], "base64");
      } else {
        return res.status(400).json({ error: "dataUrl must be a base64 data URI" });
      }

      const id = customId || `p_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      photoStore.set(id, { buffer, contentType, uploadedAt: new Date().toISOString() });

      // Cache to filesystem in /tmp/wedding_photos
      try {
        const tmpDir = path.join("/tmp", "wedding_photos");
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
        fs.writeFileSync(path.join(tmpDir, `${id}.jpg`), buffer);
      } catch (fsErr) {
        // non-blocking fallback
      }

      const protocol = req.headers["x-forwarded-proto"] || "https";
      const host = req.headers["x-forwarded-host"] || req.headers.host;
      const url = `/api/photos/${id}.jpg`;
      const absoluteUrl = `${protocol}://${host}${url}`;

      res.json({ success: true, id, url, absoluteUrl });
    } catch (err: any) {
      console.error("Error in /api/photos/upload:", err);
      res.status(500).json({ error: err.message || "Failed to process photo" });
    }
  });

  // High-speed static photo serving with immutable cache
  app.get(["/api/photos/:id.jpg", "/api/photos/:id"], (req, res) => {
    const id = req.params.id.replace(/\.jpg$/, "");
    const item = photoStore.get(id);
    if (item) {
      res.setHeader("Content-Type", item.contentType || "image/jpeg");
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.send(item.buffer);
    }

    const tmpFilePath = path.join("/tmp", "wedding_photos", `${id}.jpg`);
    if (fs.existsSync(tmpFilePath)) {
      res.setHeader("Content-Type", "image/jpeg");
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.sendFile(tmpFilePath);
    }

    return res.status(404).json({ error: "Photo not found" });
  });

  // Serve custom card image as a public JPEG file (used by Meta WhatsApp Cloud API)
  app.get("/api/card-image/:id.jpg", (req, res) => {
    const { id } = req.params;
    const item = cardImageStore.get(id);
    if (item) {
      res.setHeader("Content-Type", item.contentType || "image/jpeg");
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.send(item.buffer);
    }
    
    // Check filesystem fallback in /tmp
    const tmpFilePath = path.join("/tmp", "card_images", `${id}.jpg`);
    if (fs.existsSync(tmpFilePath)) {
      res.setHeader("Content-Type", "image/jpeg");
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.setHeader("Access-Control-Allow-Origin", "*");
      return res.sendFile(tmpFilePath);
    }

    // If not found in memory or disk, return 404 (NEVER redirect to stock photos or foreign images)
    return res.status(404).json({ error: "Card image not found" });
  });

  // Proxy endpoint to securely validate, build and dispatch WhatsApp Cloud API messages
  app.post("/api/whatsapp/send", async (req, res) => {
    try {
      const {
        phoneNumberId,
        accessToken,
        to,
        defaultCountryCode = "91",
        templateName,
        languageCode = "en",
        bodyParameters = [],
        header,
        button
      } = req.body;

      if (!phoneNumberId || !accessToken || !to || !templateName) {
        return res.status(400).json({
          success: false,
          error: {
            code: 400,
            title: "Missing Required Parameters",
            message: "phoneNumberId, accessToken, to, and templateName are mandatory."
          }
        });
      }

      // Dynamic import or invoke service
      const { sendWhatsAppMessage } = await import("./src/services/whatsappCloudApi.js").catch(
        () => import("./src/services/whatsappCloudApi")
      );

      const result = await sendWhatsAppMessage({
        phoneNumberId,
        accessToken,
        to,
        defaultCountryCode,
        templateName,
        languageCode,
        bodyParameters,
        header,
        button
      });

      return res.status(result.success ? 200 : 400).json(result);
    } catch (err: any) {
      console.error("Error in /api/whatsapp/send:", err);
      return res.status(500).json({
        success: false,
        error: {
          code: 500,
          title: "InternalServerError",
          message: err.message || "Failed to process WhatsApp request"
        }
      });
    }
  });

  // Diagnostic endpoint to check phone number ID type and account health
  app.post("/api/whatsapp/diagnose", async (req, res) => {
    try {
      const { phoneNumberId, accessToken } = req.body;
      const cleanPhoneId = String(phoneNumberId || "").trim().replace(/\D/g, "");
      const cleanToken = String(accessToken || "").trim().replace(/^Bearer\s+/i, "");

      if (!cleanPhoneId || !cleanToken) {
        return res.status(400).json({ error: "phoneNumberId and accessToken are required." });
      }

      const isSandbox = cleanPhoneId === "1176823055522728";

      const graphRes = await fetch(
        `https://graph.facebook.com/v18.0/${cleanPhoneId}?fields=id,display_phone_number,verified_name,quality_rating&access_token=${cleanToken}`
      );
      const graphData = await graphRes.json();

      return res.json({
        valid: graphRes.ok && !!graphData.id,
        phoneId: cleanPhoneId,
        isSandbox,
        metaData: graphData,
        sandboxWarning: isSandbox
          ? "This is Meta's default developer sandbox test number. Messages will only be delivered to phone numbers verified in your Meta App Dashboard allowed list. To send to real guests, use your Live Business Phone Number ID."
          : null
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // 302 Redirect for any subpaths (e.g., /rsvp or /tectell) to root path query params.
  // This completely bypasses any Google Front End (GFE) / proxy path-blocking or 404/403 behaviors on Cloud Run.
  app.use((req, res, next) => {
    const cleanPath = req.path.replace(/\/+$/, ""); // remove trailing slashes
    if (cleanPath === "/rsvp" || cleanPath.startsWith("/rsvp/")) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(req.query)) {
        if (typeof value === "string") {
          searchParams.set(key, value);
        } else if (Array.isArray(value)) {
          searchParams.set(key, String(value[0]));
        }
      }
      if (!searchParams.has("page")) {
        searchParams.set("page", "rsvp");
      }
      return res.redirect(302, `/?${searchParams.toString()}`);
    }

    if (cleanPath === "/tectell" || cleanPath.startsWith("/tectell/")) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(req.query)) {
        if (typeof value === "string") {
          searchParams.set(key, value);
        } else if (Array.isArray(value)) {
          searchParams.set(key, String(value[0]));
        }
      }
      if (!searchParams.has("admin")) {
        searchParams.set("admin", "tectell");
      }
      return res.redirect(302, `/?${searchParams.toString()}`);
    }

    // General fallback redirect for single-level couple name paths to bypass 403 blocks.
    if (
      cleanPath && 
      cleanPath !== "/" && 
      !cleanPath.includes(".") && 
      !cleanPath.startsWith("/api") && 
      !cleanPath.startsWith("/assets") && 
      !cleanPath.startsWith("/@") && 
      !cleanPath.startsWith("/node_modules")
    ) {
      const couple = cleanPath.substring(1); // remove leading slash
      const reserved = ["dashboard", "rsvp", "tectell", "login", "admin"];
      if (!reserved.includes(couple) && !couple.includes("/")) {
        const searchParams = new URLSearchParams();
        for (const [key, value] of Object.entries(req.query)) {
          if (typeof value === "string") {
            searchParams.set(key, value);
          } else if (Array.isArray(value)) {
            searchParams.set(key, String(value[0]));
          }
        }
        searchParams.set("coupleName", couple);
        return res.redirect(302, `/?${searchParams.toString()}`);
      }
    }

    next();
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);

    // Wildcard fallback for development to handle client-side routing (e.g., /rsvp, /tectell)
    app.get('*', async (req, res, next) => {
      // Skip API requests
      if (req.originalUrl.startsWith('/api')) {
        return next();
      }
      try {
        const indexHtmlPath = path.resolve(process.cwd(), "index.html");
        if (fs.existsSync(indexHtmlPath)) {
          let html = fs.readFileSync(indexHtmlPath, "utf-8");
          html = await vite.transformIndexHtml(req.originalUrl, html);
          res.status(200).set({ "Content-Type": "text/html" }).send(html);
        } else {
          res.status(404).send("index.html not found");
        }
      } catch (e) {
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Wildcard handler ensures SPA routing works for any route (e.g. /tectell, /rsvp) on direct load
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
