const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const cloudinary = require("cloudinary").v2;
const multer = require("multer");

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
    "[Warning] Cloudinary env vars missing. Image uploads will not work.",
  );
}

const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

// ── Multer: store uploads in memory so we can stream to Cloudinary ──────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed."));
    }
  },
});

// ── DB config ────────────────────────────────────────────────────────────────
const app = express();

app.use(cors());
app.use(express.json());

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || "test",
  port: process.env.DB_PORT || 4000,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: {
    minVersion: "TLSv1.2",
    rejectUnauthorized: true,
  },
});

db.getConnection((err, connection) => {
  if (err) {
    console.error("[Error] ❌ DB Connection Failed:", err.message);
  } else {
    console.log(`[Log] ✅ Connected to TiDB Cloud (ID: ${connection.threadId})`);
    connection.release();
  }
});

// ============================================
// MIDDLEWARE: Verify JWT Token
// ============================================

function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "No token provided." });
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token." });
  }
}

// ============================================
// AUTHENTICATION ROUTES
// ============================================

// REGISTER
app.post("/api/auth/register", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email and password are required." });
  if (password.length < 8)
    return res.status(400).json({ error: "Password must be at least 8 characters." });

  try {
    db.query("SELECT id FROM users WHERE email = ?", [email], async (err, rows) => {
      if (err) return res.status(500).json({ error: "Database error." });
      if (rows.length > 0) return res.status(409).json({ error: "Email already registered." });

      const hash = await bcrypt.hash(password, 10);
      db.query(
        "INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)",
        [email, hash, "admin"],
        (insertErr) => {
          if (insertErr) return res.status(500).json({ error: "Failed to register user." });
          console.log(`[Auth] ✅ New admin registered: ${email}`);
          res.status(201).json({ message: "User registered successfully! You can now login." });
        },
      );
    });
  } catch (error) {
    console.error("[Auth] ❌ Registration error:", error.message);
    res.status(500).json({ error: "Registration failed." });
  }
});

// LOGIN
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email and password are required." });

  try {
    db.query("SELECT * FROM users WHERE email = ?", [email], async (err, rows) => {
      if (err) return res.status(500).json({ error: "Database error." });
      if (rows.length === 0)
        return res.status(401).json({ error: "Invalid email or password." });

      const user = rows[0];
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return res.status(401).json({ error: "Invalid email or password." });

      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "7d" },
      );

      console.log(`[Auth] ✅ User logged in: ${email}`);
      res.json({
        message: "Login successful!",
        token,
        user: { id: user.id, email: user.email, role: user.role },
      });
    });
  } catch (error) {
    console.error("[Auth] ❌ Login error:", error.message);
    res.status(500).json({ error: "Login failed." });
  }
});

// VERIFY TOKEN
app.post("/api/auth/verify", (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: "Token is required." });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ valid: true, user: decoded });
  } catch {
    res.status(401).json({ valid: false, error: "Invalid or expired token." });
  }
});

// LOGOUT
app.post("/api/auth/logout", (req, res) => {
  res.json({ message: "Logged out successfully." });
});

// REQUEST ACCESS
app.post("/api/auth/request-access", (req, res) => {
  const { name, email, reason } = req.body;
  if (!name || !email || !reason)
    return res.status(400).json({ error: "Name, email, and reason are required." });

  db.query(
    "INSERT INTO access_requests (name, email, reason) VALUES (?, ?, ?)",
    [name, email, reason],
    (err) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY")
          return res.status(409).json({ error: "This email has already requested access." });
        return res.status(500).json({ error: "Failed to submit request." });
      }
      res.status(201).json({ message: "Access request submitted successfully!" });
    },
  );
});

app.get("/api/auth/access-requests", (req, res) => {
  db.query(
    "SELECT * FROM access_requests WHERE status = 'pending' ORDER BY created_at DESC",
    (err, results) => {
      if (err) return res.status(500).json({ error: "Failed to fetch requests." });
      res.json(results);
    },
  );
});

app.post("/api/auth/access-requests/:id/approve", (req, res) => {
  db.query(
    "UPDATE access_requests SET status = 'approved' WHERE id = ?",
    [req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: "Failed to approve request." });
      res.json({ message: "Access request approved!" });
    },
  );
});

app.post("/api/auth/access-requests/:id/deny", (req, res) => {
  db.query(
    "UPDATE access_requests SET status = 'denied' WHERE id = ?",
    [req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: "Failed to deny request." });
      res.json({ message: "Access request denied." });
    },
  );
});

// ============================================
// PASSWORD RESET (professional, no .env editing)
// ============================================

/**
 * Step 1 – Admin clicks "Reset Password" on the login page.
 *   POST /api/auth/reset-password  { email }
 *   Returns a resetUrl the admin can open directly.
 *   (No email service needed — only you use this.)
 */
app.post("/api/auth/reset-password", (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required." });

  db.query("SELECT id FROM users WHERE email = ?", [email], (err, rows) => {
    if (err) return res.status(500).json({ error: "Database error." });

    // Always return success to avoid user enumeration
    if (rows.length === 0) {
      return res.json({ message: "If that email exists, a reset link has been generated." });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    const expiresStr = expires.toISOString().slice(0, 19).replace("T", " ");

    db.query(
      "UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE email = ?",
      [tokenHash, expiresStr, email],
      (updateErr) => {
        if (updateErr) return res.status(500).json({ error: "Failed to generate reset token." });

        const baseUrl = req.headers.origin || `${req.protocol}://${req.get("host")}`;
        const resetUrl = `${baseUrl}/Management/reset-password.html?token=${rawToken}`;

        console.log(`[Auth] 🔑 Password reset link for ${email}: ${resetUrl}`);

        res.json({
          message: "Reset link generated. Copy the URL below and open it in your browser.",
          resetUrl,
        });
      },
    );
  });
});

/**
 * Step 2 – Admin submits the new password on reset-password.html.
 *   POST /api/auth/reset-password/confirm  { token, newPassword }
 */
app.post("/api/auth/reset-password/confirm", async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword)
    return res.status(400).json({ error: "Token and new password are required." });
  if (newPassword.length < 8)
    return res.status(400).json({ error: "Password must be at least 8 characters." });

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  db.query(
    "SELECT id, reset_token_expires FROM users WHERE reset_token = ?",
    [tokenHash],
    async (err, rows) => {
      if (err) return res.status(500).json({ error: "Database error." });
      if (rows.length === 0)
        return res.status(400).json({ error: "Invalid or already-used reset token." });

      const user = rows[0];
      if (new Date() > new Date(user.reset_token_expires))
        return res.status(400).json({ error: "Reset token has expired. Please request a new one." });

      try {
        const hash = await bcrypt.hash(newPassword, 10);
        db.query(
          "UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?",
          [hash, user.id],
          (updateErr) => {
            if (updateErr) return res.status(500).json({ error: "Failed to update password." });
            console.log(`[Auth] ✅ Password reset for user ID: ${user.id}`);
            res.json({ message: "Password updated successfully!" });
          },
        );
      } catch (hashErr) {
        res.status(500).json({ error: "Failed to hash password." });
      }
    },
  );
});

// ============================================
// PUBLIC API ROUTES
// ============================================

// ============================================
// PUBLIC SKILLS API
// ============================================

app.get("/api/skills", (req, res) => {
  db.query(
    "SELECT id, title, description, icon, sort_order FROM skills WHERE is_active = 1 ORDER BY sort_order ASC, id ASC",
    (err, results) => {
      if (err) return res.status(500).json({ error: "Failed to fetch skills" });
      res.json(results);
    }
  );
});

// ============================================
// CONTACT FORM — sends email via nodemailer
// ============================================

app.post("/api/contact", async (req, res) => {
  const { name, email, subject, message } = req.body;
  if (!name || !email || !message)
    return res.status(400).json({ error: "Name, email, and message are required." });

  // If nodemailer is configured, send the email
  const hasEmailConfig = !!process.env.EMAIL_USER && !!process.env.EMAIL_PASS;
  if (hasEmailConfig) {
    try {
      const nodemailer = require("nodemailer");
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      });
      await transporter.sendMail({
        from: `"Portfolio Contact" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_USER,
        replyTo: email,
        subject: subject ? `[Portfolio] ${subject}` : "[Portfolio] New Contact Message",
        text: `From: ${name} <${email}>\n\n${message}`,
        html: `<p><strong>From:</strong> ${name} &lt;${email}&gt;</p><p><strong>Subject:</strong> ${subject || "(none)"}</p><hr/><p>${message.replace(/\n/g, "<br>")}</p>`,
      });
    } catch (err) {
      console.error("[Contact] ❌ Email send failed:", err.message);
      return res.status(500).json({ error: "Failed to send email. Please try WhatsApp or direct email." });
    }
  } else {
    // Log to server console when email not configured (still returns success)
    console.log(`[Contact] 📩 New message from ${name} <${email}> — "${subject || "(no subject)"}"`);
  }
  res.json({ message: "Message received! I will get back to you soon." });
});

// ============================================
// ADMIN SKILLS ROUTES (protected)
// ============================================

app.get("/api/admin/skills", verifyToken, (req, res) => {
  db.query(
    "SELECT * FROM skills ORDER BY sort_order ASC, id ASC",
    (err, results) => {
      if (err) return res.status(500).json({ error: "Failed to fetch skills." });
      res.json(results);
    }
  );
});

app.post("/api/admin/skills", verifyToken, (req, res) => {
  const { title, description, icon, sort_order } = req.body;
  if (!title) return res.status(400).json({ error: "Title is required." });
  db.query(
    "INSERT INTO skills (title, description, icon, sort_order, is_active) VALUES (?, ?, ?, ?, 1)",
    [title, description || null, icon || "fa-solid fa-star", Number(sort_order) || 0],
    (err, result) => {
      if (err) return res.status(500).json({ error: "Failed to add skill." });
      res.status(201).json({ message: "Skill added successfully!", id: result.insertId });
    }
  );
});

app.put("/api/admin/skills/:id", verifyToken, (req, res) => {
  const id = Number(req.params.id);
  const { title, description, icon, sort_order, is_active } = req.body;
  if (!title) return res.status(400).json({ error: "Title is required." });
  db.query(
    "UPDATE skills SET title = ?, description = ?, icon = ?, sort_order = ?, is_active = ? WHERE id = ?",
    [title, description || null, icon || "fa-solid fa-star", Number(sort_order) || 0, is_active ? 1 : 0, id],
    (err, result) => {
      if (err) return res.status(500).json({ error: "Failed to update skill." });
      if (!result || result.affectedRows === 0) return res.status(404).json({ error: "Skill not found." });
      res.json({ message: "Skill updated successfully!" });
    }
  );
});

app.delete("/api/admin/skills/:id", verifyToken, (req, res) => {
  const id = Number(req.params.id);
  db.query("DELETE FROM skills WHERE id = ?", [id], (err, result) => {
    if (err) return res.status(500).json({ error: "Failed to delete skill." });
    if (!result || result.affectedRows === 0) return res.status(404).json({ error: "Skill not found." });
    res.json({ message: "Skill deleted." });
  });
});

// ============================================
// PUBLIC PROJECTS API
// ============================================

app.get("/api/projects", (req, res) => {
  const year = req.query.year;
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
  db.query(
    "SELECT DISTINCT year FROM projects WHERE is_deleted = 0 AND year IS NOT NULL ORDER BY year DESC",
    (err, results) => {
      if (err) return res.status(500).json({ error: "Failed to fetch years" });
      res.json(results.map((row) => row.year));
    },
  );
});

// ============================================
// ADMIN API ROUTES (all protected with verifyToken)
// ============================================

// GET single project (for edit modal — avoids fetching all)
app.get("/api/admin/projects/:id", verifyToken, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0)
    return res.status(400).json({ error: "Invalid project ID." });

  db.query("SELECT * FROM projects WHERE id = ?", [id], (err, rows) => {
    if (err) return res.status(500).json({ error: "Database error." });
    if (rows.length === 0) return res.status(404).json({ error: "Project not found." });
    res.json(rows[0]);
  });
});

// ADD PROJECT
app.post("/api/admin/projects", verifyToken, (req, res) => {
  const { name, description, live_url, github_url, year, demo_video_url } = req.body;
  if (!name || !year)
    return res.status(400).json({ error: "Name and Year are required." });

  const sql =
    "INSERT INTO projects (name, description, live_url, github_url, year, demo_video_url) VALUES (?, ?, ?, ?, ?, ?)";

  db.query(sql, [name, description, live_url, github_url, year, demo_video_url || null], (err, result) => {
    if (err) {
      console.error("[Error] ❌ DB Insert failed:", err.message);
      return res.status(500).json({ error: "Database error: " + err.message });
    }
    const projectId = result.insertId;
    console.log(`[Log] ✅ Project saved with ID: ${projectId}`);
    res.status(201).json({ message: "Project added successfully!", id: projectId });
  });
});

// UPDATE PROJECT
app.put("/api/admin/projects/:id", verifyToken, (req, res) => {
  const projectId = Number(req.params.id);
  const { name, description, live_url, github_url, year, demo_video_url } = req.body;

  if (!Number.isInteger(projectId) || projectId <= 0)
    return res.status(400).json({ error: "Invalid project ID." });
  if (!name || year === undefined || year === null)
    return res.status(400).json({ error: "Name and Year are required." });

  const parsedYear = Number(year);
  if (!Number.isInteger(parsedYear) || parsedYear < 1900 || parsedYear > 2100)
    return res.status(400).json({ error: "Year must be between 1900 and 2100." });

  const sql =
    "UPDATE projects SET name = ?, description = ?, live_url = ?, github_url = ?, year = ?, demo_video_url = ? WHERE id = ?";

  db.query(
    sql,
    [name, description || null, live_url || null, github_url || null, parsedYear, demo_video_url || null, projectId],
    (err, result) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!result || result.affectedRows === 0)
        return res.status(404).json({ error: "Project not found." });
      res.json({ message: "Project updated successfully!" });
    },
  );
});

// UPLOAD / REPLACE PROJECT IMAGE
app.post(
  "/api/admin/projects/:id/upload-image",
  verifyToken,
  upload.single("image"),
  async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0)
      return res.status(400).json({ error: "Invalid project ID." });
    if (!req.file)
      return res.status(400).json({ error: "No image file provided." });

    if (!hasCloudinaryConfig) {
      return res.status(503).json({ error: "Cloudinary is not configured on this server." });
    }

    try {
      // Upload buffer to Cloudinary
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "portfolio_projects",
            public_id: `project_${id}`,
            overwrite: true,
            invalidate: true,
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          },
        );
        stream.end(req.file.buffer);
      });

      const imageUrl = uploadResult.secure_url;

      db.query(
        "UPDATE projects SET image_path = ? WHERE id = ?",
        [imageUrl, id],
        (dbErr) => {
          if (dbErr) return res.status(500).json({ error: "Image uploaded but DB update failed." });
          console.log(`[Log] ✅ Image uploaded for project ${id}: ${imageUrl}`);
          res.json({ message: "Image uploaded successfully!", image_path: imageUrl });
        },
      );
    } catch (err) {
      console.error("[Error] ❌ Cloudinary upload failed:", err.message);
      res.status(500).json({ error: "Image upload failed: " + err.message });
    }
  },
);

// SOFT DELETE — move to recycle bin
app.delete("/api/admin/projects/:id", verifyToken, (req, res) => {
  db.query(
    "UPDATE projects SET is_deleted = 1, deleted_at = NOW() WHERE id = ?",
    [req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: "Failed to move to trash" });
      res.json({ message: "Project moved to Recycle Bin!" });
    },
  );
});

// GET RECYCLE BIN
app.get("/api/admin/recycle-bin", verifyToken, (req, res) => {
  db.query(
    "SELECT * FROM projects WHERE is_deleted = 1 ORDER BY deleted_at DESC",
    (err, results) => {
      if (err) return res.status(500).json({ error: "Failed to fetch trash" });
      res.json(results);
    },
  );
});

// RESTORE PROJECT
app.post("/api/admin/projects/:id/restore", verifyToken, (req, res) => {
  db.query(
    "UPDATE projects SET is_deleted = 0, deleted_at = NULL WHERE id = ?",
    [req.params.id],
    (err) => {
      if (err) return res.status(500).json({ error: "Restore failed" });
      res.json({ message: "Project restored successfully!" });
    },
  );
});

// PERMANENT DELETE
app.delete("/api/admin/projects/:id/permanent", verifyToken, (req, res) => {
  const { id } = req.params;

  db.query("SELECT image_path FROM projects WHERE id = ?", [id], (err, rows) => {
    if (err || rows.length === 0)
      return res.status(500).json({ error: "Project not found" });

    const imagePath = rows[0].image_path;

    db.query("DELETE FROM projects WHERE id = ?", [id], (delErr) => {
      if (delErr) return res.status(500).json({ error: "Delete failed" });

      // If it's a local file (not a Cloudinary URL), remove it from disk
      if (imagePath && !/^https?:\/\//i.test(imagePath)) {
        const fullPath = path.join(__dirname, imagePath);
        fs.unlink(fullPath, (fsErr) => {
          if (fsErr) console.warn(`[Warning] Could not delete file: ${fullPath}`);
        });
      }

      res.json({ message: "Project permanently deleted from system." });
    });
  });
});

// Export for Vercel serverless — also listen locally for `npm start`
module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`[Log] Server running on port ${PORT}`));
}
