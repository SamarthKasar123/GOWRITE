import express from "express";
import bodyParser from "body-parser";
import axios from "axios";

const app = express();
const port = 3000;
const API_URL = "http://localhost:4000";

app.use(express.static("public"));

app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());

app.set("view engine","ejs");

// Top get the Home Page of the Blogging Application

app.get("/", async (req,res)=>{
    try {
        const response = await axios.get(API_URL+"/posts");
        res.render("index.ejs",{posts:response.data});
    }
    catch (error) {
        res.status(500).json({messege:"Error Fetching Posts"});
    }
});

// To get the Page where user will Publish a New Post

app.get("/new",(req,res)=>{
    res.render("modify.ejs",{heading:"New Post",submit:"Create Post"});
});

//To get the Page where User will be able to update or edit the post.It will contain the data of the particular post which is to be deleted

app.get("/edit:id",async (req,res)=>{
    try {
        const response = await axios.get(API_URL+"/posts/"+req.params.id);
        res.render("modify.ejs",{heading:"Edit Post",submit:"Update Post",post:response.data});
    }
    catch (error) {
        res.status(500).json({messege:"Error Fetching Posts"});
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
        const response = await axios.patch(API_URL+"/posts"+req.params.id,req.body);
        res.redirect("/");
    }
    catch (error) {
        res.status(500).json({messege:"Error Updating Posts "});
    }
});

// To delete the Specific Post

app.get("/api/posts/delete/:id",async (req,res)=>{
    try {
         await axios.delete(API_URL+"/posts"+req.params.id);
         res.redirect("/");
    }
    catch (error) {
        res.status(500).json({messege:"Error Deleting Posts"});
    }
});

app.listen(port,()=>{
    console.log("Server Started On Port "+port);
});