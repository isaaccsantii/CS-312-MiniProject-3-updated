// CS 312 Mini-Project 3 - Blog with Node.js, Express.js, EJS and PostgreSQL
// Builds on Mini-Project 1: posts now live in the "blogs" table, and users must
// sign in. Users can only edit or delete posts they created themselves.

import express from "express";
import session from "express-session";
import bcrypt from "bcryptjs";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";
import db from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const CATEGORIES = ["Tech", "Lifestyle", "Education", "Travel", "Other"];
const SALT_ROUNDS = 10;

// ---------- Middleware ----------
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "cs312-dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 4 }, // 4 hours
  })
);

// Values every view can use
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.categories = CATEGORIES;
  res.locals.flash = req.session.flash || null;
  delete req.session.flash; // show a flash message once
  res.locals.formatDate = (d) =>
    new Date(d).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  next();
});

// Blocks pages that need a signed-in user
function requireLogin(req, res, next) {
  if (!req.session.user) {
    req.session.flash = { type: "warning", text: "Please sign in first." };
    return res.redirect("/signin");
  }
  next();
}

// ---------- Helpers ----------
function cleanPost(body) {
  const title = (body.title || "").trim();
  const content = (body.content || "").trim();
  const category = CATEGORIES.includes(body.category) ? body.category : "Other";
  const error = !title || !content ? "Title and content are both required." : null;
  return { error, data: { title, content, category } };
}

// Loads a post and checks that the signed-in user created it.
// Returns { post } on success or { status, message } on failure.
async function loadOwnPost(blogId, userId) {
  if (!/^\d+$/.test(blogId)) return { status: 404, message: "Post not found." };
  const { rows } = await db.query("SELECT * FROM blogs WHERE blog_id = $1", [blogId]);
  const post = rows[0];
  if (!post) return { status: 404, message: "Post not found." };
  if (post.creator_user_id !== userId) {
    return { status: 403, message: "You can only edit or delete posts you created." };
  }
  return { post };
}

async function getFeed(category) {
  if (category && category !== "All") {
    const { rows } = await db.query(
      "SELECT * FROM blogs WHERE category = $1 ORDER BY date_created DESC",
      [category]
    );
    return rows;
  }
  const { rows } = await db.query("SELECT * FROM blogs ORDER BY date_created DESC");
  return rows;
}

// ---------- Auth routes ----------

app.get("/signup", (req, res) => {
  if (req.session.user) return res.redirect("/");
  res.render("signup", { error: null, form: {} });
});

app.post("/signup", async (req, res, next) => {
  try {
    const user_id = (req.body.user_id || "").trim();
    const name = (req.body.name || "").trim();
    const password = req.body.password || "";
    const form = { user_id, name };

    if (!user_id || !name || !password) {
      return res.status(400).render("signup", { error: "All fields are required.", form });
    }
    if (!/^[A-Za-z0-9_.-]{3,30}$/.test(user_id)) {
      return res.status(400).render("signup", {
        error: "User ID must be 3–30 characters: letters, numbers, _ . or -",
        form,
      });
    }
    if (password.length < 6) {
      return res.status(400).render("signup", { error: "Password must be at least 6 characters.", form });
    }

    // Is the user_id already taken?
    const existing = await db.query("SELECT 1 FROM users WHERE user_id = $1", [user_id]);
    if (existing.rowCount > 0) {
      return res.status(409).render("signup", {
        error: `The user ID "${user_id}" is already taken. Please choose a different one.`,
        form: { name },
      });
    }

    // Bonus: store a bcrypt hash instead of the raw password
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    await db.query("INSERT INTO users (user_id, password, name) VALUES ($1, $2, $3)", [user_id, hash, name]);

    req.session.flash = { type: "success", text: "Account created! Sign in to continue." };
    res.redirect("/signin");
  } catch (err) {
    next(err);
  }
});

app.get("/signin", (req, res) => {
  if (req.session.user) return res.redirect("/");
  res.render("signin", { error: null, form: {} });
});

app.post("/signin", async (req, res, next) => {
  try {
    const user_id = (req.body.user_id || "").trim();
    const password = req.body.password || "";

    // SELECT ... WHERE to find the user, then compare the hashed password
    const { rows } = await db.query("SELECT user_id, password, name FROM users WHERE user_id = $1", [user_id]);
    const user = rows[0];
    const ok = user && (await bcrypt.compare(password, user.password));

    if (!ok) {
      return res.status(401).render("signin", {
        error: "Incorrect user ID or password. Please try again.",
        form: { user_id },
      });
    }

    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.user = { user_id: user.user_id, name: user.name };
      res.redirect("/");
    });
  } catch (err) {
    next(err);
  }
});

app.post("/signout", (req, res) => {
  req.session.destroy(() => res.redirect("/signin"));
});

// ---------- Blog routes ----------

// Feed (SELECT all posts, optional category filter)
app.get("/", requireLogin, async (req, res, next) => {
  try {
    const selected = req.query.category || "All";
    res.render("index", { posts: await getFeed(selected), selected, error: null, form: {} });
  } catch (err) {
    next(err);
  }
});

// Create (INSERT)
app.post("/posts", requireLogin, async (req, res, next) => {
  try {
    const { error, data } = cleanPost(req.body);
    if (error) {
      return res.status(400).render("index", { posts: await getFeed(), selected: "All", error, form: data });
    }
    const { user_id, name } = req.session.user;
    await db.query(
      `INSERT INTO blogs (creator_name, creator_user_id, title, body, category, date_created)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [name, user_id, data.title, data.content, data.category]
    );
    req.session.flash = { type: "success", text: "Post published." };
    res.redirect("/");
  } catch (err) {
    next(err);
  }
});

// Edit form (only the creator can open it)
app.get("/posts/:id/edit", requireLogin, async (req, res, next) => {
  try {
    const result = await loadOwnPost(req.params.id, req.session.user.user_id);
    if (!result.post) {
      req.session.flash = { type: "danger", text: result.message };
      return res.redirect("/");
    }
    res.render("edit", { post: result.post, error: null });
  } catch (err) {
    next(err);
  }
});

// Save edit (UPDATE), ownership checked again on the server
app.post("/posts/:id/edit", requireLogin, async (req, res, next) => {
  try {
    const result = await loadOwnPost(req.params.id, req.session.user.user_id);
    if (!result.post) {
      req.session.flash = { type: "danger", text: result.message };
      return res.redirect("/");
    }

    const { error, data } = cleanPost(req.body);
    if (error) {
      return res.status(400).render("edit", {
        post: { ...result.post, title: data.title, body: data.content, category: data.category },
        error,
      });
    }

    await db.query(
      `UPDATE blogs SET title = $1, body = $2, category = $3, date_updated = NOW()
       WHERE blog_id = $4 AND creator_user_id = $5`,
      [data.title, data.content, data.category, result.post.blog_id, req.session.user.user_id]
    );
    req.session.flash = { type: "success", text: "Post updated." };
    res.redirect("/");
  } catch (err) {
    next(err);
  }
});

// Delete (DELETE), only the creator
app.post("/posts/:id/delete", requireLogin, async (req, res, next) => {
  try {
    const result = await loadOwnPost(req.params.id, req.session.user.user_id);
    if (!result.post) {
      req.session.flash = { type: "danger", text: result.message };
      return res.redirect("/");
    }
    await db.query("DELETE FROM blogs WHERE blog_id = $1 AND creator_user_id = $2", [
      result.post.blog_id,
      req.session.user.user_id,
    ]);
    req.session.flash = { type: "success", text: "Post deleted." };
    res.redirect("/");
  } catch (err) {
    next(err);
  }
});

// ---------- Bonus: account page ----------

app.get("/account", requireLogin, (req, res) => {
  res.render("account", { error: null, form: req.session.user });
});

app.post("/account", requireLogin, async (req, res, next) => {
  const client = await db.connect();
  try {
    const current = req.session.user;
    const newId = (req.body.user_id || "").trim();
    const newName = (req.body.name || "").trim();
    const currentPassword = req.body.current_password || "";
    const newPassword = req.body.new_password || "";
    const form = { user_id: newId, name: newName };
    const fail = (status, error) => res.status(status).render("account", { error, form });

    if (!newId || !newName) return fail(400, "User ID and name can't be empty.");
    if (!/^[A-Za-z0-9_.-]{3,30}$/.test(newId)) {
      return fail(400, "User ID must be 3–30 characters: letters, numbers, _ . or -");
    }
    if (newPassword && newPassword.length < 6) return fail(400, "New password must be at least 6 characters.");

    // Confirm it's really them before changing credentials
    const { rows } = await client.query("SELECT password FROM users WHERE user_id = $1", [current.user_id]);
    if (!rows[0] || !(await bcrypt.compare(currentPassword, rows[0].password))) {
      return fail(401, "Your current password is incorrect.");
    }

    if (newId !== current.user_id) {
      const taken = await client.query("SELECT 1 FROM users WHERE user_id = $1", [newId]);
      if (taken.rowCount > 0) return fail(409, `The user ID "${newId}" is already taken.`);
    }

    // One transaction: update the user row (ON UPDATE CASCADE moves their posts to
    // the new user_id) and update creator_name on their posts.
    await client.query("BEGIN");
    if (newPassword) {
      const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
      await client.query("UPDATE users SET user_id = $1, name = $2, password = $3 WHERE user_id = $4", [
        newId, newName, hash, current.user_id,
      ]);
    } else {
      await client.query("UPDATE users SET user_id = $1, name = $2 WHERE user_id = $3", [
        newId, newName, current.user_id,
      ]);
    }
    await client.query("UPDATE blogs SET creator_name = $1 WHERE creator_user_id = $2", [newName, newId]);
    await client.query("COMMIT");

    req.session.user = { user_id: newId, name: newName };
    req.session.flash = { type: "success", text: "Account updated." };
    res.redirect("/account");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    next(err);
  } finally {
    client.release();
  }
});

// ---------- Errors ----------
app.use((req, res) => res.status(404).render("404"));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render("error", {
    message:
      err.code === "ECONNREFUSED" || err.code === "3D000"
        ? "Can't connect to the database. Is PostgreSQL running and is BlogDB set up?"
        : "Something went wrong on our end. Please try again.",
  });
});

app.listen(PORT, () => console.log(`Blog running at http://localhost:${PORT}`));
