import express from "express";
import bodyParser from "body-parser";
//In order to get access to the post data we have to use body-parser . 
//Basically what the body-parser is which allows express to read the 
//body and then parse that into a Json object that we can understand. 
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy } from "passport-local";
import session  from "express-session";
import env from "dotenv"; 

import User from './models/user.js';
import Post from './models/post.js'; 
import Likes from "./models/likes.js";

const app = express();
app.use(express.json());
const saltRounds = 10;
env.config();

//defining session:
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);
app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

//setting view engine as ejs:
app.set("view engine", "ejs");

//important:
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("public"));

//passport setup:
app.use(passport.initialize());
app.use(passport.session());

//connecting to db and models:
mongoose.connect(process.env.MONGODB_URI,
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
).then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));


function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
      return next();
  }else{
    res.redirect('/login');
  }
};

//get all posts
app.get("/", async (req,res) => {
  const posts = await Post.find({}).populate('author', 'name');
  const user = req.session._id;  
  const User = req.session.id;
  let likesCount= {};
 
  for (let post of posts) {
        likesCount[post._id] = await Likes.countDocuments({ postId: post._id });
  } 

    try {
      const mappedPosts = posts.map(post => ({
        _id: post._id,
        title: post.title,
        post: post.post, 
        likes: likesCount[post._id] || 0,
        author: post.author ? post.author.name : "Unknown"
    }));
    
    
    let likedPosts = {};
    
    for (let post of mappedPosts) {
      const liked = await Likes.findOne({ postId: post._id, userId: user });
      likedPosts[post._id] = liked ? true : false;
    };

    res.render("home", {
      posts: mappedPosts, 
      user: user,
      User: User,
      Liked: likedPosts
    });

    }catch (err) {
      console.log(err)
    }
}); 

//get specific post
app.get("/posts/:postId", async (req, res) => {
  const postId = req.params.postId; 
  
  if(!postId) {
    return res.status(400).send("Invalid post Id");
  }
  try {
    const result = await Post.findOne({_id: postId}).populate("author", "name");
    if(!result) {
      return res.status(404).send("Post Not Found!");
    }
    res.render("post", { 
      title: result.title,
      post: result.post,
      author: result.author ? result.author.name : "Unknown"
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred while fetching the post");
  }

});

//get login page get
app.get("/login", (req, res) => {
  res.render("login");
});

//submit login post
app.post("/login",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login",
  })
);

//get register get
app.get("/register", (req, res) => {
  res.render("register");
});

//submit register post
app.post("/register", async (req, res) => {
  const email = req.body.username;
  const password = req.body.password;

  try { 
    const checkUser = await User.findOne({email: email});

    if(checkUser) {
      res.render("login");
    } else {
      bcrypt.hash(password, saltRounds, async (err, hash) => {
        if (err) {
          console.error("Error hashing password:", err);
        } else {
          const result = new User({
            email: req.body.email,
            password: hash,
            name: req.body.username,
          });
          
          const user = await result.save();
          res.render("login");
          req.login(user, (err) => {
            console.log("error!", err);
            res.render("register");
          });
        }
      });
    }
  } catch (err) {
    console.log(err);
  }
});

//logout get
app.get("/logout", (req, res, next) => { 
  req.logout(function (err) {
    if (err) {
      return next(err);
    } 
    res.redirect("/");
  });
});

//needs to be protected:
//compose get
app.get("/compose", isAuthenticated, (req, res) => { 
    res.render("compose");
});

//compose post
app.post("/compose", isAuthenticated, async (req, res) => { 
    const { post, title } = req.body;
    const userId = req.user._id;

    try {
      const NewPosts = new Post({
        author: userId,
        title,
        post
      });
      await NewPosts.save();
      res.redirect("/");

    } catch (error) {
      console.log(error);
    }  
});

//likes:
app.post('/posts/:id/like', isAuthenticated, async(req, res) => {
  
  try { 
    const postId = req.params.id;
    let liked = req.body.liked; //true
    const userId = req.user._id; 

    const existingLike = await Likes.findOne({postId, userId});

    if(existingLike) {
      await Likes.deleteOne({postId, userId});
    } else {
      await Likes.create({postId, userId});
    }

     // Get the updated like count
     const likeCount = await Likes.countDocuments({ postId });
     
     // Update the post with the new like count
     const post = await Post.findByIdAndUpdate(
      postId,
      { $set: { likes: likeCount } },
      { new: true }
  );
  return res.json({ post, likes: post.likes, liked: !existingLike });
  } catch (error) {
    console.log(error);
    res.status(500).send("An error occurred while updating the like count");
  }  
})

//about get
app.get("/about", (req, res) => {
  res.render("about");
});

//about contact
app.get("/contact", (req, res) => {
  res.render("contact");
});

//authentication using passport
passport.use(
  "local",
  new Strategy(async function verify(username, password, cb) {
    try {
      const checkUser = await User.findOne({email: username});

      if (checkUser) {
        const storedHashedPassword = checkUser.password;
        bcrypt.compare(password, storedHashedPassword, (err, valid) => {
          if (err) {
            console.error("Error comparing passwords:", err);
            return cb(err);
          } else {
            if (valid) {
              return cb(null, checkUser);
            } else {
              return cb(null, false);
            }
          }
        });
      } else {
        return cb("User not found");
      }
    } catch (err) {
      console.log(err);
    }
  })
);

passport.serializeUser((user, cb) => {
  cb(null, user);
});

passport.deserializeUser((user, cb) => {
  cb(null, user);
});

//listening I guess...
app.listen(4000, function () {
  console.log("Server started on port 4000");
});
