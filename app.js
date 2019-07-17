let express = require("express");
let path = require("path");
let logger = require("morgan");
let cookieParser = require("cookie-parser");
let bodyParser = require("body-parser");
let passport = require("passport");
let LocalStrategy = require("passport-local").Strategy;
let session = require("express-session");
let crypto = require("crypto");
var MongoStore = require("connect-mongo")(session);
let mongoose = require("mongoose");
let FacebookStrategy = require("passport-facebook");
let TwitterStrategy = require("passport-twitter"); 

let routes = require("./routes/index");
let auth = require("./routes/auth");
var models = require("./models/models");
var User = models.User;

let app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "hbs");

app.use(logger("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

if (!process.env.SECRET) {
  console.log("Error: no secret");
  process.exit(1);
}
// Passport stuff
app.use(
  session({
    secret: process.env.SECRET,
    resave: true,
    saveUninitialized: true,
    store: new MongoStore({ mongooseConnection: mongoose.connection })
  })
);

// Tell Passport how to set req.user
passport.serializeUser(function(user, done) {
  done(null, user._id);
});
passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

function hashPassword(password) {
  let hash = crypto.createHash("sha256");
  hash.update(password);
  return hash.digest("hex");
}

// Tell passport how to read our user models
passport.use(
  new LocalStrategy(function(username, password, done) {
    // Find the user with the given username
    User.findOne({ username: username }, function(err, user) {
      // if there's an error, finish trying to authenticate (auth failed)
      if (err) {
        console.log(err);
        return done(err);
      }
      // if no user present, auth failed
      if (!user) {
        console.log(user);
        return done(null, false);
      }
      // if passwords do not match, auth failed
      if (user.password !== hashPassword(password)) {
        return done(null, false);
      }
      if (user.accountType === "facebook" || user.accountType === "twitter")
        return done(null, false);
      // auth has has succeeded
      return done(null, user);
    });
  })
);
passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: "/auth/facebook/callback",
      profileFields: ["id", "displayName", "photos"]
    },
    function(accessToken, refreshToken, profile, cb) {
      User.findOrCreate(
        //query
        { facebookId: profile.id },
        {
          phone: process.env.MY_TWILIO_NUMBER,
          pictureUrl: profile.photos[0].value,
          username: profile.displayName,
          facebookId: profile.id,
          password: hashPassword(process.env.DEFAULT_PASS),
          accountType: "facebook"
        },
        function(err, user) {
          console.log(err);
          return cb(err, user);
        }
      );
    }
  )
);
passport.use(
  new TwitterStrategy(
    {
      consumerKey: process.env.TWITTER_CONSUMER_KEY,
      consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
      callbackURL: "/auth/twitter/callback"
    },
    function(token, tokenSecret, profile, cb) {
      User.findOrCreate(
        { twitterId: profile.id },
        {
          pictureUrl: profile.photos[0].value,
          username: profile.displayName,
          password: hashPassword(process.env.DEFAULT_PASS),
          accountType: "twitter",
          twitterId: profile.id,
          phone: process.env.MY_TWILIO_NUMBER.substring(2),
          twitterToken: token,
          twitterTokenSecret: tokenSecret
        },
        function(err, user) {
          return cb(err, user);
        }
      );
    }
  )
);
app.use(passport.initialize());
app.use(passport.session());

// Uncomment these out after you have implemented passport in step 1
app.use("/", auth(passport));
app.use("/", routes);

app.get("/auth/facebook", passport.authenticate("facebook"));

app.get(
  "/auth/facebook/callback",
  passport.authenticate("facebook", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/");
  }
);
app.get("/auth/twitter", passport.authenticate("twitter"));

app.get(
  "/auth/twitter/callback",
  passport.authenticate("twitter", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/");
  }
);
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error("Not Found");
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get("env") === "development") {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render("error", {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render("error", {
    message: err.message,
    error: {}
  });
});

module.exports = app;
