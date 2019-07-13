let express = require("express");
let router = express.Router();
let models = require("../models/models");
let crypto = require("crypto");
let { check, validationResult } = require("express-validator");

module.exports = function(passport) {
  // Add Passport-related auth routes here, to the router!
  //helper function that validates user input
  let validateReq = function(userData) {
    return userData.password === userData.passwordRepeat;
  };

  //helper function that hashes the password
  function hashPassword(password) {
    let hash = crypto.createHash("sha256");
    hash.update(password);
    return hash.digest("hex");
  }

  router.get("/", (req, res) => {
    //If user is logged in
    if (req.user) {
      return res.redirect("/contacts");
    }
    res.redirect("/login");
  });
  // Sign up
  router.get("/signup", (req, res) => {
    res.render("signup", { loggedOut: true });
  });

  router.post(
    "/signup",
    [
      check("username").isLength({ min: 4 }),
      // password must be at least 5 chars long
      check("password").isLength({ min: 4 })
    ],
    (req, res) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.render("signup", {
          error: "Fields must be at least 4 characters", 
          loggedOut: true
        });
      }
      if (!validateReq(req.body)) {
        return res.render("signup", {
          error: "Passwords don't match.", 
          loggedOut: true
        });
      }

      var u = new models.User({
        username: req.body.username,
        password: hashPassword(req.body.password)
      });
      u.save(function(err, user) {
        if (err) {
          console.log("this is an error", err);
          return res.status(500).redirect("/signup");
        }
        return res.redirect("/login");
      });
    }
  );

  router.get("/login", (req, res) => {
    res.render("login", { loggedOut: true });
  });

  router.post(
    "/login",
    passport.authenticate("local", {
      successRedirect: "/",
      failureRedirect: "/login"
    })
  );

  //whats the point of having get contacts in both auth and index??
  // router.get("/contacts", (req, res) => {
  //   res.render("contacts", { loggedOut: true });
  // });

  //logout
  router.get("/logout", (req, res) => {
    req.logout();
    res.redirect("/login");
  });

  return router;
};
