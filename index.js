import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = 4000;

const db = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

db.connect();


app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Create a new post

app.post("/posts", async (req,res)=>{
    const {title,content,author} = req.body;
    try {
        const result = await db.query("INSERT INTO posts (title,content,author) values ($1,$2,$3) RETURNING *",[title,content,author]);
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({message:"Database Error"});
    }
});

// Get all posts

app.get("/posts", async (req,res) => {
    try {
        const result = await db.query("SELECT * from posts order by id ASC");
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({message:"Database Error"});
    }
});

// Get a single post by ID

app.get("/posts/:id", async (req,res) => {
    const {id} = req.params;
    try {
        const result = await db.query("SELECT * from posts where id = $1",[id]);
        if (result.rows.length === 0) {
            return res.status(404).json({message:"Post Not Found"});
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({message:"Database Error"});
    }
});

// Update a post by ID

app.patch("/posts/:id", async (req, res) => {
    const { id } = req.params;
    const { title, content, author } = req.body;
    try {
      const result = await db.query(
        "UPDATE posts SET title = $1, content = $2, author = $3 WHERE id = $4 RETURNING *",
        [title, content, author, id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Post not found" });
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Database error" });
    }
  });

// Delete a post by ID

app.delete("/posts/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const result = await db.query("DELETE FROM posts WHERE id = $1 RETURNING *", [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Post not found" });
      }
      res.status(204).send();
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Database error" });
    }
  });

// Start the server
app.listen(port, () => {
    console.log("Server Started On Port " + port);
});
