import express from "express";
import bodyParser from "body-parser";

const app = express();
const port = 4000;

let posts = [
    {
        id: 1,
        title: "Introduction to Mercedes Benz S - Class",
        content:
            "Mercedes-Benz commonly referred to simply as Mercedes and occasionally as Benz, is a German luxury and commercial vehicle brand that was founded in 1926.",
        author: "Samarth Kasar",
        date: "2024-12-30T10:00:00Z",
    },
];

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Create a new post
app.post("/posts", (req, res) => {
    const { title, content, author } = req.body;
    const newPost = {
        id: posts.length + 1,
        title,
        content,
        author,
        date: new Date().toISOString(),
    };
    posts.push(newPost);
    res.json(newPost);
});

// Get all posts
app.get("/posts", (req, res) => {
    res.json(posts);
});

// Get a single post by ID
app.get("/posts/:id", (req, res) => {
    const post = posts.find((p) => p.id == req.params.id);
    if (!post) {
        return res.status(404).json({ message: "Post Not Found" });
    }
    res.json(post);
});

// Update a post by ID
app.patch("/posts/:id", (req, res) => {
    const post = posts.find((p) => p.id == req.params.id);
    if (!post) {
        return res.status(404).json({ message: "Post Not Found" });
    }
    post.title = req.body.title || post.title;
    post.content = req.body.content || post.content;
    post.author = req.body.author || post.author;
    res.json(post);
});

// Delete a post by ID
app.delete("/posts/:id", (req, res) => {
    const postIndex = posts.findIndex((p) => p.id == req.params.id);
    if (postIndex === -1) {
        return res.status(404).json({ message: "Post not found" });
    }
    posts.splice(postIndex, 1);
    res.status(204).send();
});

// Start the server
app.listen(port, () => {
    console.log("Server Started On Port " + port);
});
