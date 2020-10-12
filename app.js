//jshint esversion:6
require('dotenv').config()
const express = require('express');
const bodyParser = require('body-parser');
const ejs= require('ejs');
const app = express();
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportlocalmongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findorcreate = require('mongoose-findorcreate');
const FacebookStrategy = require('passport-facebook').Strategy;

app.use(express.static('public'));
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({extended:true}));

app.use(session({
    secret: 'Our Little Secret',
    resave: false,
    saveUninitialized: false,
  }));
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://admin-Ritik:Swiftcar@cluster0.tfmbi.mongodb.net/userDB",{useNewUrlParser:true,useUnifiedTopology:true});
mongoose.set("useCreateIndex",true);
const userSchema = new mongoose.Schema({
  username:String,
  password:String,
  googleId: String,
  secret:Array
});
userSchema.plugin(passportlocalmongoose);
userSchema.plugin(findorcreate);

const User = new mongoose.model("User",userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) { // Can be used for any strategy ot for only passport-local-mongoose
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "https://young-hamlet-64928.herokuapp.com/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));
passport.use(new FacebookStrategy({
  clientID: process.env.APP_ID,
  clientSecret: process.env.APP_SECRET,
  callbackURL: "https://young-hamlet-64928.herokuapp.com/auth/facebook/secrets"
},
function(accessToken, refreshToken, profile, cb) {

  User.findOrCreate({ facebookId: profile.id }, function (err, user) {

    return cb(err, user);
  });
}
));

app.get("/",function(req,res){
    res.render("home");
});
app.get("/auth/google", passport.authenticate('google', {

  scope: ['profile']

}));


app.get( '/auth/google/secrets',
    passport.authenticate( 'google', {
        successRedirect: '/secrets',
        failureRedirect: '/login'
}));
app.get('/auth/facebook', passport.authenticate('facebook'));
app.get('/auth/facebook/secrets',

      passport.authenticate('facebook', { failureRedirect: '/login' }),

      function(req, res) {

        // Successful authentication, redirect home.

        res.redirect('/secrets');

      });

app.get("/login",function(req,res){
    res.render("login");
});
app.get("/register",function(req,res){
    res.render("register");
});
app.get("/secrets",function(req,res){
  User.find({secret:{$ne:null}},function (err, users){
    if(!err){
      if (users){
        res.render("secrets",{usersWithSecrets:users});
      }else {
        console.log(err);
      }
    }else {
      console.log(err);
    }
  });
});
  app.post("/register", function(req, res) {
  User.register({username: req.body.username}, req.body.password, function(err, user){
      if (err) {
        console.log(err);
        res.redirect("/register");
      } else {
        passport.authenticate("local")(req, res, function(){
          res.redirect("/secrets");
        });
      }
    });
   
  });

app.post("/login",function(req,res){
    const user  = new User({
        username:req.body.username,
        password:req.body.password
    });
    req.login(user,function(err){
        if(err){
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, function(){
              res.redirect("/secrets");
            });
        }
    })
});
app.get("/submit",function(req,res){
  if (req.isAuthenticated()){
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});


app.post("/submit",function (req, res){
  if(req.isAuthenticated()){
    User.findById(req.user.id,function (err, user){
      user.secret.push(req.body.secret);
      user.save(function (){
        res.redirect("/secrets");
      });
    });
 
  }else {
   res.redirect("/login");
  }
});
app.get("/logout", function(req, res){

  req.logout();

  res.redirect("/");

});
app.get("/about", function(req, res){
  res.render("about");
});
let port = process.env.PORT;

if (port == null || port == "") {

port = 3000;

}
app.listen(port,function(){
    console.log("Server is Listening at Port 3000");
});

/*
  if u want to add the ability for the user to add or delete any of their secrets

"/submit" route handling

app.route("/submit")
.get(function (req,res){
  if(req.isAuthenticated()){
    User.findById(req.user.id,function (err,foundUser){
      if(!err){
        res.render("submit",{secrets:foundUser.secret});
      }
    })
  }else {
    res.redirect("/login");
  }
})
.post(function (req, res){
  if(req.isAuthenticated()){
    User.findById(req.user.id,function (err, user){
      user.secret.push(req.body.secret);
      user.save(function (){
        res.redirect("/secrets");
      });
    });
 
  }else {
   res.redirect("/login");
  }
});
the handling of the new route "/submit/delete"

app.post("/submit/delete",function (req, res){
  if(req.isAuthenticated()){
    User.findById(req.user.id, function (err,foundUser){
      foundUser.secret.splice(foundUser.secret.indexOf(req.body.secret),1);
      foundUser.save(function (err) {
        if(!err){
          res.redirect("/submit");
        }
      });
    });
  }else {
    res.redirect("/login");
  }
});


in submit.ejs , after the first form add this

<% if(secrets.length != 0){ %>
    <hr>
      <h1 class="display-3">Your Secrets</h1>
      <form  action="/submit/delete" method="post">
        <div class="form-group">
          <select class="form-control text-center" name="secret">
            <% secrets.forEach(function(secret){ %>
              <option value="<%= secret %>"><%= secret %></option>
            <% }); %>
          </select>
        </div>
        <button type="submit" class="btn btn-dark">Delete Secret</button>
      </form>
<%  } %>
After this , the user will be able to select and delete any of his secrets.

*/