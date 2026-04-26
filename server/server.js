const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const cloudinary = require("cloudinary").v2;

const hasCloudinaryConfig =
  !!process.env.CLOUDINARY_CLOUD_NAME &&
  !!process.env.CLOUDINARY_API_KEY &&
  !!process.env.CLOUDINARY_API_SECRET;

if (hasCloudinaryConfig) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
} else {
  console.warn(
    "[Senior Warning] Cloudinary env vars are missing. Screenshot uploads will use local storage.",
  );
}

const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const fs = require("fs");
const puppeteer = require('puppeteer');

const resolvedDbHost = process.env.TIDB_HOST || process.env.DB_HOST;
const resolvedDbUser =
  process.env.TIDB_USER || process.env.DB_USER || process.env.DB_USERNAME;
const resolvedDbPassword = process.env.TIDB_PASSWORD || process.env.DB_PASSWORD;
const resolvedDbName =
  process.env.TIDB_DB_NAME || process.env.DB_NAME || process.env.DB_DATABASE;
const resolvedDbPort = Number(
  process.env.TIDB_PORT || process.env.DB_PORT || 4000,
);
const useSsl = process.env.DB_SSL === "true" || !!process.env.TIDB_HOST;

console.log("[Senior Debug] Checking Environment Variables...");
console.log("DB host exists:", !!resolvedDbHost);
console.log("DB user exists:", !!resolvedDbUser);

if (!resolvedDbHost || !resolvedDbUser || !resolvedDbName) {
  console.error(
    "[Senior Error] Missing required DB env values. Please check host, user, and database in .env.",
  );
}

const app = express();
const ROOT_DIR = path.resolve(__dirname, "..");
const CLIENT_DIR = path.join(ROOT_DIR, "client");
const MANAGEMENT_DIR = path.join(__dirname, "Management");
const SERVER_IMAGES_DIR = path.join(__dirname, "images");

// Middleware
app.use(cors());
app.use(express.json());

// server.js - Professional Connection Logic
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "test", // TiDB default is often 'test'
  port: process.env.DB_PORT || 4000,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: {
    minVersion: "TLSv1.2",
    rejectUnauthorized: true,
  },
});

// Test the connection immediately
db.getConnection((err, connection) => {
  if (err) {
    console.error("[Senior Error] ❌ Connection Failed:", err.message);
  } else {
    console.log(
      `[Senior Log] ✅ Connected to TiDB Cloud (ID: ${connection.threadId})`,
    );
    connection.release();
  }
});

// Professional Screenshot Engine
// async function captureProjectScreenshot(url, projectId) {
//   const startTime = Date.now();
//   console.log(`[Screenshot] 🚀 Starting capture for: ${url}`);

//   let browser;
//   let tempPath;

//   try {
//     // Launch Puppeteer
//     // browser = await puppeteer.launch({
//     //   executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
//     //   headless: true,
//     //   args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
//     // });
//     browser = await puppeteer.launch({
//       headless: true,
//       args: ["--no-sandbox", "--disable-setuid-sandbox"],
//     });

//     const page = await browser.newPage();
//     await page.setViewport({ width: 1280, height: 720 });

//     // Navigate to URL
//     await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

//     // Wait for network to be idle or key container to appear
//     try {
//       await page.waitForNetworkIdle({ idleTime: 3000, timeout: 60000 });
//     } catch {
//       console.log("[Screenshot] ⚠️ Network idle timeout, continuing anyway.");
//     }

//     // Optional: ensure main content exists
//     const hasContent = await page.evaluate(() => {
//       const main = document.querySelector("main, #app, body");
//       return main && main.innerText.length > 200;
//     });

//     if (!hasContent) {
//       console.log(
//         "[Screenshot] ⚠️ Page content too small, skipping screenshot.",
//       );
//       return null;
//     }

//     // Take screenshot
//     tempPath = path.join(__dirname, `temp_${projectId}_${Date.now()}.png`);
//     await page.screenshot({ path: tempPath, fullPage: true });

//     const totalTime = Math.floor((Date.now() - startTime) / 1000);
//     console.log(`[Screenshot] 📸 Captured in ${totalTime}s`);

//     // Upload to Cloudinary if configured
//     if (hasCloudinaryConfig) {
//       console.log("[Screenshot] ☁️ Uploading to Cloudinary...");
//       const uploadResult = await cloudinary.uploader.upload(tempPath, {
//         folder: "portfolio_projects",
//         public_id: `project_${projectId}`,
//         overwrite: true,
//         invalidate: true,
//       });

//       fs.unlinkSync(tempPath);
//       tempPath = null;

//       console.log(`[Screenshot] ✅ Cloud URL: ${uploadResult.secure_url}`);
//       return { path: uploadResult.secure_url, time: totalTime };
//     }

//     // Save locally
//     const dir = path.join(__dirname, "images", "projects");
//     if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

//     const fileName = `project_${projectId}_${Date.now()}.png`;
//     const finalPath = path.join(dir, fileName);
//     fs.renameSync(tempPath, finalPath);
//     tempPath = null;

//     return { path: `images/projects/${fileName}`, time: totalTime };
//   } catch (error) {
//     console.error(`[Screenshot] ❌ Failed: ${error.message}`);
//     if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
//     return null;
//   } finally {
//     if (browser) await browser.close();
//   }
// }
async function captureProjectScreenshot(url, projectId) {
  const startTime = Date.now();
  console.log(`[Screenshot] 🚀 Starting capture for: ${url}`);

  let browser;
  let tempPath;

  try {
    // Detect if this is a Render-hosted site
    const isRenderHosted = url.includes(".onrender.com");

    // Launch Puppeteer
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    console.log(`[Screenshot] 📍 URL Type: ${isRenderHosted ? "Render-hosted" : "External"}`);

    // Navigate to URL
    const navigationTimeout = isRenderHosted ? 90000 : 60000;
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: navigationTimeout });
    } catch (navError) {
      console.error(`[Screenshot] ❌ Navigation failed: ${navError.message}`);
      return null;
    }

    // SMART WAIT: Wait for actual content to render
    console.log("[Screenshot] ⏳ Waiting for content to render...");
    
    const maxWaitTime = isRenderHosted ? 45000 : 30000; // Max 45s for Render, 30s for others
    const startWait = Date.now();
    let contentReady = false;

    while (Date.now() - startWait < maxWaitTime && !contentReady) {
      try {
        // Check if page has meaningful content
        const pageContent = await page.evaluate(() => {
          const body = document.body;
          const html = body.innerHTML;
          const text = body.innerText;
          
          // Count visible elements
          const elements = body.querySelectorAll("*");
          const visibleElements = Array.from(elements).filter(el => {
            const style = window.getComputedStyle(el);
            return style.display !== "none" && style.visibility !== "hidden";
          }).length;

          return {
            htmlSize: html.length,
            textLength: text.length,
            elementCount: elements.length,
            visibleElements: visibleElements,
            hasMainContent: !!(
              document.querySelector("main") ||
              document.querySelector("[role='main']") ||
              document.querySelector(".container") ||
              document.querySelector(".content")
            ),
          };
        });

        console.log(`[Screenshot] 📊 Content Status:`, {
          htmlSize: pageContent.htmlSize,
          textLength: pageContent.textLength,
          elements: pageContent.elementCount,
          visible: pageContent.visibleElements,
          hasMain: pageContent.hasMainContent,
        });

        // Content is ready if:
        // - HTML is substantial (>1000 bytes) AND
        // - Either has main content area OR has visible elements (>10)
        if (
          pageContent.htmlSize > 1000 &&
          (pageContent.hasMainContent || pageContent.visibleElements > 10)
        ) {
          contentReady = true;
          console.log("[Screenshot] ✅ Content ready!");
          break;
        }

        // If page is completely empty, fail fast
        if (pageContent.htmlSize < 100 && pageContent.elementCount < 5) {
          console.log("[Screenshot] ❌ Page appears to be empty or broken.");
          return null;
        }

        // Wait a bit before checking again
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Try to trigger more content loading
        await page.evaluate(() => {
          // Scroll to trigger lazy loading
          window.scrollBy(0, window.innerHeight);
        });

      } catch (checkError) {
        console.error(`[Screenshot] ⚠️ Content check error: ${checkError.message}`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    if (!contentReady) {
      console.log("[Screenshot] ⚠️ Content did not load within timeout.");
      return null;
    }

    // Scroll back to top before taking screenshot
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Take screenshot
    tempPath = path.join(__dirname, `temp_${projectId}_${Date.now()}.png`);
    await page.screenshot({ path: tempPath, fullPage: true });

    const totalTime = Math.floor((Date.now() - startTime) / 1000);
    console.log(`[Screenshot] 📸 Captured in ${totalTime}s`);

    // Upload to Cloudinary if configured
    if (hasCloudinaryConfig) {
      console.log("[Screenshot] ☁️ Uploading to Cloudinary...");
      const uploadResult = await cloudinary.uploader.upload(tempPath, {
        folder: "portfolio_projects",
        public_id: `project_${projectId}`,
        overwrite: true,
        invalidate: true,
      });

      fs.unlinkSync(tempPath);
      tempPath = null;

      console.log(`[Screenshot] ✅ Cloud URL: ${uploadResult.secure_url}`);
      return { path: uploadResult.secure_url, time: totalTime };
    }

    // Save locally
    const dir = path.join(__dirname, "images", "projects");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const fileName = `project_${projectId}_${Date.now()}.png`;
    const finalPath = path.join(dir, fileName);
    fs.renameSync(tempPath, finalPath);
    tempPath = null;

    return { path: `images/projects/${fileName}`, time: totalTime };

  } catch (error) {
    console.error(`[Screenshot] ❌ Failed: ${error.message}`);
    if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    return null;
  } finally {
    if (browser) await browser.close();
  }
}

// --- PUBLIC API ROUTES ---

app.get("/api/projects", (req, res) => {
  const year = req.query.year;
  // Senior Move: Filter by is_deleted = 0 so visitors don't see trashed projects
  let sql = "SELECT * FROM projects WHERE is_deleted = 0";
  const params = [];

  if (year && year !== "all") {
    sql += " AND year = ?";
    params.push(year);
  }
  sql += " ORDER BY year DESC, created_at DESC";

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: "Failed to fetch projects" });
    res.json(results);
  });
});

app.get("/api/projects/years", (req, res) => {
  const sql =
    "SELECT DISTINCT year FROM projects WHERE is_deleted = 0 AND year IS NOT NULL ORDER BY year DESC";
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: "Failed to fetch years" });
    res.json(results.map((row) => row.year));
  });
});

// --- ADMIN API ROUTES ---

app.post("/api/admin/projects", (req, res) => {
  const { name, description, live_url, github_url, year } = req.body;

  // 1. Basic Validation (Senior Best Practice)
  if (!name || !year) {
    return res.status(400).json({ error: "Name and Year are required." });
  }

  // 2. The SQL Command (Matched to your TiDB DESC output)
  const sql =
    "INSERT INTO projects (name, description, live_url, github_url, year) VALUES (?, ?, ?, ?, ?)";

  db.query(
    sql,
    [name, description, live_url, github_url, year],
    async (err, result) => {
      if (err) {
        // --- SENIOR DEBUG: THIS LOG IS THE KEY ---
        console.error("[Senior Error] ❌ Database Insert Failed!");
        console.error("SQL Error Message:", err.message);
        return res
          .status(500)
          .json({ error: "Database error: " + err.message });
      }

      const projectId = result.insertId;
      console.log(`[Senior Log] ✅ Project saved with ID: ${projectId}`);

      // Trigger Screenshot Automation in the background
      if (live_url) {
        try {
          console.log(`[Senior Log] 📸 Triggering screenshot for: ${live_url}`);
          const screenshotResult = await captureProjectScreenshot(
            live_url,
            projectId,
          );
          if (screenshotResult && screenshotResult.path) {
            db.query(
              "UPDATE projects SET image_path = ?, load_time_seconds = ? WHERE id = ?",
              [screenshotResult.path, screenshotResult.time, projectId],
            );
          }
        } catch (screenshotError) {
          console.error(
            "[Senior Error] Screenshot failed:",
            screenshotError.message,
          );
        }
      }

      res
        .status(201)
        .json({ message: "Project added successfully!", id: projectId });
    },
  );
});

app.put("/api/admin/projects/:id", (req, res) => {
  const projectId = Number(req.params.id);
  const { name, description, live_url, github_url, year } = req.body;

  if (!Number.isInteger(projectId) || projectId <= 0) {
    return res.status(400).json({ error: "Invalid project ID." });
  }

  if (!name || year === undefined || year === null) {
    return res.status(400).json({ error: "Name and Year are required." });
  }

  const parsedYear = Number(year);
  if (!Number.isInteger(parsedYear) || parsedYear < 1900 || parsedYear > 2100) {
    return res
      .status(400)
      .json({ error: "Year must be a valid number between 1900 and 2100." });
  }

  const sql =
    "UPDATE projects SET name = ?, description = ?, live_url = ?, github_url = ?, year = ? WHERE id = ?";

  db.query(
    sql,
    [
      name,
      description || null,
      live_url || null,
      github_url || null,
      parsedYear,
      projectId,
    ],
    async (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!result || result.affectedRows === 0) {
        return res.status(404).json({ error: "Project not found." });
      }

      if (live_url) {
        try {
          const screenshotResult = await captureProjectScreenshot(
            live_url,
            projectId,
          );
          if (screenshotResult && screenshotResult.path) {
            db.query(
              "UPDATE projects SET image_path = ?, load_time_seconds = ? WHERE id = ?",
              [screenshotResult.path, screenshotResult.time, projectId],
            );
          }
        } catch (screenshotError) {
          console.error(
            "[Senior Error] Screenshot refresh failed:",
            screenshotError.message,
          );
        }
      }

      res.json({ message: "Project updated successfully!" });
    },
  );
});

// 1. SOFT DELETE: Move to Recycle Bin
app.delete("/api/admin/projects/:id", (req, res) => {
  const { id } = req.params;
  const sql =
    "UPDATE projects SET is_deleted = 1, deleted_at = NOW() WHERE id = ?";

  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json({ error: "Failed to move to trash" });
    res.json({ message: "Project moved to Recycle Bin!" });
  });
});

// 2. GET RECYCLE BIN CONTENT
app.get("/api/admin/recycle-bin", (req, res) => {
  db.query(
    "SELECT * FROM projects WHERE is_deleted = 1 ORDER BY deleted_at DESC",
    (err, results) => {
      if (err) return res.status(500).json({ error: "Failed to fetch trash" });
      res.json(results);
    },
  );
});

// 3. RESTORE PROJECT
app.post("/api/admin/projects/:id/restore", (req, res) => {
  const { id } = req.params;
  db.query(
    "UPDATE projects SET is_deleted = 0, deleted_at = NULL WHERE id = ?",
    [id],
    (err) => {
      if (err) return res.status(500).json({ error: "Restore failed" });
      res.json({ message: "Project restored successfully!" });
    },
  );
});

// 4. PERMANENT DELETE (Deletes record and physical file)
app.delete("/api/admin/projects/:id/permanent", (req, res) => {
  const { id } = req.params;

  db.query(
    "SELECT image_path FROM projects WHERE id = ?",
    [id],
    (err, results) => {
      if (err || results.length === 0)
        return res.status(500).json({ error: "Project not found" });

      const imagePath = results[0].image_path;

      db.query("DELETE FROM projects WHERE id = ?", [id], (deleteErr) => {
        if (deleteErr) return res.status(500).json({ error: "Delete failed" });

        if (imagePath) {
          const isRemoteImage = /^https?:\/\//i.test(imagePath);
          if (!isRemoteImage) {
            const fullPath = path.join(__dirname, imagePath);
            fs.unlink(fullPath, (fsErr) => {
              if (fsErr)
                console.error(
                  `[Senior Warning] Could not delete file: ${fullPath}`,
                );
              else
                console.log(
                  `[Senior Log] 🗑️ Deleted unused image: ${imagePath}`,
                );
            });
          }
        }

        res.json({ message: "Project permanently deleted from system." });
      });
    },
  );
});

// --- STATIC FILE SERVING ---
app.use(express.static(CLIENT_DIR));
app.use("/Management", express.static(MANAGEMENT_DIR));
app.use(
  "/images/projects",
  express.static(path.join(SERVER_IMAGES_DIR, "projects")),
);
app.use("/images", express.static(path.join(CLIENT_DIR, "images")));

app.get("/{*any}", (req, res) => {
  res.sendFile(path.join(CLIENT_DIR, "index.html"));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
