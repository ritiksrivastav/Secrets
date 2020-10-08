//jshint esversion:6
require('dotenv').config()
const express = require('express');
const bodyParser = require('body-parser');
const ejs= require('ejs');
const app = express();
const mongoose = require('mongoose');
const encryption = require('mongoose-encryption');
app.use(express.static('public'));
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({extended:true}));
mongoose.connect("mongodb://localhost:27017/userDB",{useNewUrlParser:true,useUnifiedTopology:true});
const userSchema= new mongoose.Schema({
    email:String,
    password:String
});
const secret = "This is our Secret";
userSchema.plugin(encryption, { secret: process.env.SECRET,encryptedFields: ['password']  });

const User = new mongoose.model("User",userSchema);

app.get("/",function(req,res){
    res.render("home");
});
app.get("/login",function(req,res){
    res.render("login");
});
app.get("/register",function(req,res){
    res.render("register");
});

app.post("/register",function(req,res){
    const newUser = new User({
        email: req.body.username,
        password: req.body.password
    });
    newUser.save(function(err){
        if(err){
            res.send(err);
        }else{
            res.render("secrets");
        }
    });
});
app.post("/login",function(req,res){
    const username = req.body.username;
    const password = req.body.password;
    User.findOne({email:username},function(err,foundItem){
        if(err){
            console.log(err);
        }else{
            if(foundItem){
                if(foundItem.password===password){
                    res.render("secrets");
                }
            }else{
                res.send("User Not Found");
            }
        }
    });
});
app.listen(3000,function(){
    console.log("Server is Listening at Port 3000");
})