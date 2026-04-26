const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
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

// ============================================
// AUTHENTICATION ROUTES
// ============================================

// REGISTER: Create the first admin user (or additional users)
app.post("/api/auth/register", async (req, res) => {
  const { email, password } = req.body;

  // Validation
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters." });
  }

  try {
    // Check if user already exists
    db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
      if (err) {
        return res.status(500).json({ error: "Database error." });
      }

      if (results.length > 0) {
        return res.status(409).json({ error: "Email already registered." });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert user into database
      db.query(
        "INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)",
        [email, hashedPassword, "admin"],
        (insertErr) => {
          if (insertErr) {
            return res.status(500).json({ error: "Failed to register user." });
          }

          console.log(`[Auth] ✅ New admin user registered: ${email}`);
          res.status(201).json({ message: "User registered successfully! You can now login." });
        }
      );
    });
  } catch (error) {
    console.error("[Auth] ❌ Registration error:", error.message);
    res.status(500).json({ error: "Registration failed." });
  }
});

// LOGIN: Authenticate user and return JWT token
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  // Validation
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    // Find user by email
    db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
      if (err) {
        return res.status(500).json({ error: "Database error." });
      }

      if (results.length === 0) {
        return res.status(401).json({ error: "Invalid email or password." });
      }

      const user = results[0];

      // Compare password with hash
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);

      if (!isPasswordValid) {
        return res.status(401).json({ error: "Invalid email or password." });
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "7d" } // Token expires in 7 days
      );

      console.log(`[Auth] ✅ User logged in: ${email}`);
      res.json({ 
        message: "Login successful!", 
        token: token,
        user: { id: user.id, email: user.email, role: user.role }
      });
    });
  } catch (error) {
    console.error("[Auth] ❌ Login error:", error.message);
    res.status(500).json({ error: "Login failed." });
  }
});

// VERIFY TOKEN: Check if a token is valid
app.post("/api/auth/verify", (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: "Token is required." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ valid: true, user: decoded });
  } catch (error) {
    res.status(401).json({ valid: false, error: "Invalid or expired token." });
  }
});

// LOGOUT: Clear token on client side (optional backend endpoint)
app.post("/api/auth/logout", (req, res) => {
  console.log("[Auth] ✅ User logged out");
  res.json({ message: "Logged out successfully." });
});

// REQUEST ACCESS: Submit a request for admin access
app.post("/api/auth/request-access", (req, res) => {
  const { name, email, reason } = req.body;

  if (!name || !email || !reason) {
    return res.status(400).json({ error: "Name, email, and reason are required." });
  }

  db.query(
    "INSERT INTO access_requests (name, email, reason) VALUES (?, ?, ?)",
    [name, email, reason],
    (err) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(409).json({ error: "This email has already requested access." });
        }
        return res.status(500).json({ error: "Failed to submit request." });
      }

      console.log(`[Auth] 📧 Access request from: ${email}`);
      res.status(201).json({ message: "Access request submitted successfully!" });
    }
  );
});

// GET ACCESS REQUESTS: Admin endpoint to view pending requests
app.get("/api/auth/access-requests", (req, res) => {
  // TODO: Add middleware to verify admin token
  db.query(
    "SELECT * FROM access_requests WHERE status = 'pending' ORDER BY created_at DESC",
    (err, results) => {
      if (err) {
        return res.status(500).json({ error: "Failed to fetch requests." });
      }
      res.json(results);
    }
  );
});

// APPROVE ACCESS REQUEST: Admin endpoint
app.post("/api/auth/access-requests/:id/approve", (req, res) => {
  // TODO: Add middleware to verify admin token
  const { id } = req.params;

  db.query(
    "UPDATE access_requests SET status = 'approved' WHERE id = ?",
    [id],
    (err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to approve request." });
      }
      res.json({ message: "Access request approved!" });
    }
  );
});

// DENY ACCESS REQUEST: Admin endpoint
app.post("/api/auth/access-requests/:id/deny", (req, res) => {
  // TODO: Add middleware to verify admin token
  const { id } = req.params;

  db.query(
    "UPDATE access_requests SET status = 'denied' WHERE id = ?",
    [id],
    (err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to deny request." });
      }
      res.json({ message: "Access request denied." });
    }
  );
});

// ============================================
// MIDDLEWARE: Verify JWT Token
// ============================================

function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1]; // Extract token from "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: "No token provided." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid or expired token." });
  }
}

// Export middleware for use in other files
module.exports = { verifyToken };

// Screenshoot function
async function captureProjectScreenshot(url, projectId) {
  const startTime = Date.now();
  console.log(`[Screenshot] 🚀 Starting capture for: ${url}`);

  let browser;
  let tempPath;

  try {
    const isRenderHosted = url.includes(".onrender.com");

    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    console.log(`[Screenshot] 📍 URL Type: ${isRenderHosted ? "Render-hosted" : "External"}`);

    const navigationTimeout = isRenderHosted ? 90000 : 60000;
    try {
      await page.goto(url, { 
        waitUntil: "networkidle2", 
        timeout: navigationTimeout 
      });
    } catch (navError) {
      console.error(`[Screenshot] ❌ Navigation failed: ${navError.message}`);
      return null;
    }

    console.log("[Screenshot] ⏳ Waiting for content to render...");
    
    const maxWaitTime = isRenderHosted ? 60000 : 30000; // Increased to 60s for Render
    const startWait = Date.now();
    let contentReady = false;
    let previousHtmlSize = 0;
    let stableCount = 0;

    while (Date.now() - startWait < maxWaitTime && !contentReady) {
      try {
        const pageContent = await page.evaluate(() => {
          const body = document.body;
          const html = body.innerHTML;
          const text = body.innerText.trim();
          const allElements = body.querySelectorAll("*");
          
          const visibleElements = Array.from(allElements).filter(el => {
            const style = window.getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            return (style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0);
          }).length;

          return {
            htmlSize: html.length,
            textLength: text.length,
            elementCount: allElements.length,
            visibleElements: visibleElements,
            hasMainContent: !!(document.querySelector("main") || document.querySelector("header") || document.querySelector("nav")),
          };
        });

        console.log(`[Screenshot] 📊 Content Status:`, {
          htmlSize: pageContent.htmlSize,
          textLength: pageContent.textLength,
          visible: pageContent.visibleElements
        });

        if (Math.abs(pageContent.htmlSize - previousHtmlSize) < 100 && pageContent.htmlSize > 500) {
          stableCount++;
        } else {
          stableCount = 0;
        }
        previousHtmlSize = pageContent.htmlSize;

        // Success condition
        if (pageContent.htmlSize > 1000 && pageContent.visibleElements > 5 && stableCount >= 2) {
          contentReady = true;
          console.log("[Screenshot] ✅ Content ready and stable!");
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3s between checks
        await page.evaluate(() => window.scrollBy(0, 200)); // Subtle scroll to wake up JS
      } catch (checkError) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    if (!contentReady) {
      console.log("[Screenshot] ⚠️ Content did not load or stabilize within timeout.");
      return null;
    }

    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise(resolve => setTimeout(resolve, 1000));

    tempPath = path.join(__dirname, `temp_${projectId}_${Date.now()}.png`);
    await page.screenshot({ path: tempPath, fullPage: true });

    const totalTime = Math.floor((Date.now() - startTime) / 1000);
    console.log(`[Screenshot] 📸 Captured in ${totalTime}s`);

    if (hasCloudinaryConfig) {
      const uploadResult = await cloudinary.uploader.upload(tempPath, {
        folder: "portfolio_projects",
        public_id: `project_${projectId}`,
        overwrite: true,
        invalidate: true,
      });
      fs.unlinkSync(tempPath);
      console.log(`[Screenshot] ✅ Cloud URL: ${uploadResult.secure_url}`);
      return { path: uploadResult.secure_url, time: totalTime };
    }

    return { path: `temp_${projectId}.png`, time: totalTime };

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
