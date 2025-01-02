import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import pg from "pg";
import bcrypt from "bcrypt";
import dotenv from 'dotenv';


dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const API_URL = "http://localhost:4000";
const saltRounds = 10;

const db = new pg.Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

db.connect();

app.use(express.static("public"));

app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());

app.set("view engine","ejs");

app.get("/",(req,res)=>{
    res.render("home.ejs");
});

app.get("/login",(req,res)=>{
    res.render("login.ejs");
});

app.get("/register",(req,res)=>{
    res.render("register.ejs");
});

app.post("/register", async (req, res) => {
    const email = req.body.username;
    const password = req.body.password;

    try {
        const checkResult = await db.query("SELECT * FROM users WHERE email = $1", [email]);

        if (checkResult.rows.length > 0) {
            res.send("Email Already Exists. Try Logging In.");
        } else {
            // Add a debug log before and after the insert query
            bcrypt.hash(password,saltRounds,async (err,hash) =>{
                if (err) {
                    console.error("Error Hashing Passwords :",err);
                } else {
                    console.log("Hashed Passwords :",hash);
                    await db.query("INSERT INTO users (email, password) VALUES ($1, $2)", [email, hash]);
                    try {
                        const response = await axios.get(API_URL + "/posts");
                        res.render("index.ejs", { posts: response.data });
                    } catch (error) {
                        res.status(500).json({ message: "Error Fetching Posts" });
                    }
                }
            });
        }
    } catch (err) {
        console.error("Error during registration:", err);
        res.status(500).send("Internal Server Error");
    }
});


app.post("/login", async (req,res)=>{
    const email = req.body.email;
    const password = req.body.password;

    try {
        const result = await db.query("Select * from users where email = $1",[email,]);
        if (result.rows.length > 0) {
            const user = result.rows[0];
            const storedPassword = user.password;

            if (password === storedPassword) {
                try {
                    const response = await axios.get(API_URL+"/posts");
                    res.render("index.ejs",{posts:response.data});
                }
                catch (error) {
                    res.status(500).json({messege:"Error Fetching Posts"});
                } 
            } else {
                res.send("Incorrect Password");
            }
        } else {
            res.send("User Not Found");
        }
    } catch (err) {
        console.log(err);
    }
});


// To get the Page where user will Publish a New Post

app.get("/new",(req,res)=>{
    res.render("modify.ejs",{heading:"New Post",submit:"Create Post"});
});

//To get the Page where User will be able to update or edit the post.It will contain the data of the particular post which is to be deleted

app.get("/edit/:id", async (req, res) => {
    try {
      const response = await axios.get(`${API_URL}/posts/${req.params.id}`);
      res.render("modify.ejs", {
        heading: "Edit Post",
        submit: "Update Post",
        post: response.data,
      });
    } catch (error) {
      res.status(500).json({ message: "Error fetching post" });
    }
  });  

//To Post the Data into the Application

app.post("/api/posts",async (req,res)=>{
    try {
        const response = await axios.post(API_URL+"/posts",req.body);
        res.redirect("/");
    }
    catch (error) {
        res.status(500).json({messege:"Error Creating Post"});
    }
});

// To post the Edited or the Updated Data into the Application

app.post("/api/posts/:id",async (req,res)=>{
    try {
        const response = await axios.patch(API_URL+"/posts/"+req.params.id,req.body);
        res.redirect("/");
    }
    catch (error) {
        res.status(500).json({messege:"Error Updating Posts "});
    }
});

// To delete the Specific Post

app.get("/api/posts/delete/:id",async (req,res)=>{
    try {
         await axios.delete(API_URL+"/posts/"+req.params.id);
         res.redirect("/");
    }
    catch (error) {
        res.status(500).json({messege:"Error Deleting Posts"});
    }
});

app.listen(port,()=>{
    console.log("Server Started On Port "+port);
});