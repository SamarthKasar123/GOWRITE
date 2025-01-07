import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import pg from "pg";
import bcrypt from "bcrypt";
import dotenv from 'dotenv';
import session from "express-session";
import passport from "passport";
import { Strategy } from "passport-local";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const API_URL = "http://localhost:4000";
const saltRounds = 10;

// Database connection
const db = new pg.Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

db.connect();

// Middleware setup
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || "TOPSECRETWORD",
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

app.use(passport.initialize());
app.use(passport.session());

// View engine setup
app.set("view engine", "ejs");

// Passport local strategy
passport.use(new Strategy({
    usernameField: 'email',    // Changed to match login.ejs form field
    passwordField: 'password'
}, async function verify(email, password, cb) {
    try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
        if (result.rows.length > 0) {
            const user = result.rows[0];
            const storedHashedPassword = user.password;

            bcrypt.compare(password, storedHashedPassword, (err, result) => {
                if (err) {
                    return cb(err);
                }
                if (result) {
                    return cb(null, user);
                }
                return cb(null, false, { message: "Incorrect password" });
            });
        } else {
            return cb(null, false, { message: "User not found" });
        }
    } catch (err) {
        return cb(err);
    }
}));

passport.serializeUser((user, cb) => {
    cb(null, user.id);
});

passport.deserializeUser(async (id, cb) => {
    try {
        const result = await db.query("SELECT * FROM users WHERE id = $1", [id]);
        if (result.rows.length > 0) {
            const user = result.rows[0];
            return cb(null, user);
        }
        return cb(null, false);
    } catch (err) {
        return cb(err);
    }
});

// Authentication middleware
const checkAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect("/login");
};

// Routes
app.get("/", (req, res) => {
    res.render("home.ejs", { user: req.user });
});

app.get("/login", (req, res) => {
    if (req.isAuthenticated()) {
        return res.redirect("/secrets");
    }
    res.render("login.ejs", { error: null });
});

app.get("/register", (req, res) => {
    if (req.isAuthenticated()) {
        return res.redirect("/secrets");
    }
    res.render("register.ejs", { error: null });
});

app.get('/about', (req, res) => {
    res.render('about', { user: req.user });
});

app.get('/features', (req, res) => {
    res.render('features', { user: req.user });
});

app.get('/contact', (req, res) => {
    res.render('contact', { user: req.user });
});

// Protected routes
app.get("/secrets", checkAuthenticated, async (req, res) => {
    try {
        const response = await axios.get(`${API_URL}/posts`);
        res.render("index.ejs", { 
            posts: response.data,
            user: req.user 
        });
    } catch (error) {
        console.error("Error fetching posts:", error);
        res.render("index.ejs", { 
            posts: [],
            error: "Error fetching posts",
            user: req.user
        });
    }
});

app.get("/new", checkAuthenticated, (req, res) => {
    res.render("modify.ejs", {
        heading: "New Post",
        submit: "Create Post",
        user: req.user
    });
});

// Authentication routes
app.post("/register", async (req, res) => {
    const email = req.body.username; // Matches the register.ejs form field name
    const password = req.body.password;

    try {
        const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [email]);

        if (checkResult.rows.length > 0) {
            return res.render("register", { 
                error: "Email already exists. Please login instead.",
                user: null 
            });
        }

        const hash = await bcrypt.hash(password, saltRounds);
        await db.query("INSERT INTO users (email, password) VALUES ($1, $2)", [email, hash]);
        res.redirect("/login");
    } catch (err) {
        console.error("Registration error:", err);
        res.render("register", { 
            error: "Registration failed. Please try again.",
            user: null
        });
    }
});

app.post("/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
        if (err) {
            console.error("Login error:", err);
            return next(err);
        }
        if (!user) {
            return res.render("login", { 
                error: info.message || "Authentication failed",
                user: null
            });
        }
        req.login(user, (err) => {
            if (err) {
                console.error("Login error:", err);
                return next(err);
            }
            return res.redirect("/secrets");
        });
    })(req, res, next);
});

app.get("/logout", (req, res) => {
    req.logout((err) => {
        if (err) {
            console.error("Logout error:", err);
            return next(err);
        }
        res.redirect("/");
    });
});

// Post management routes
app.get("/edit/:id", checkAuthenticated, async (req, res) => {
    try {
        const response = await axios.get(`${API_URL}/posts/${req.params.id}`);
        res.render("modify.ejs", {
            heading: "Edit Post",
            submit: "Update Post",
            post: response.data,
            user: req.user
        });
    } catch (error) {
        console.error("Error fetching post:", error);
        res.redirect("/secrets");
    }
});

app.post("/api/posts", checkAuthenticated, async (req, res) => {
    try {
        await axios.post(`${API_URL}/posts`, req.body);
        res.redirect("/secrets");
    } catch (error) {
        console.error("Error creating post:", error);
        res.redirect("/new");
    }
});

app.post("/api/posts/:id", checkAuthenticated, async (req, res) => {
    try {
        await axios.patch(`${API_URL}/posts/${req.params.id}`, req.body);
        res.redirect("/secrets");
    } catch (error) {
        console.error("Error updating post:", error);
        res.redirect(`/edit/${req.params.id}`);
    }
});

app.get("/api/posts/delete/:id", checkAuthenticated, async (req, res) => {
    try {
        await axios.delete(`${API_URL}/posts/${req.params.id}`);
        res.redirect("/secrets");
    } catch (error) {
        console.error("Error deleting post:", error);
        res.redirect("/secrets");
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server Started On Port ${port}`);
});