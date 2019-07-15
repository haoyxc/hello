var express = require("express");
var router = express.Router();
var models = require("../models/models");
var Contact = models.Contact;
let Message = models.Message;
let User = models.User;

var accountSid = process.env.TWILIO_SID;
var authToken = process.env.TWILIO_AUTH_TOKEN;
var fromNumber = process.env.MY_TWILIO_NUMBER;
var twilio = require("twilio");
var client = new twilio(accountSid, authToken);

function validatePhone(phone) {
  if (phone.length > 10 || phone.length < 10) {
    return res.rend("newMessage", {
      error: "Make sure your phone number is 10 digits"
    });
  } else {
    return phone;
  }
}

/* GET home page. */
router.get("/", function(req, res, next) {
  if (req.user) {
    return res.redirect("/contacts");
  }
  res.redirect("/login");
});
//Get all contacts
router.get("/contacts", (req, res) => {
  req.user.getContacts((err, contacts) => {
    if (err) {
      res.render("/login", {
        loggedOut: true,
        error: "Something went wrong, please try again"
      });
    }
    res.render("contacts", { contacts: contacts });
  });
});
//Get the new contact form
router.get("/contacts/new", (req, res) => {
  res.render("editContact", { loggedOut: false });
});
//Save a new contact
router.post("/contacts/new", (req, res) => {
  let name = req.body.name;
  let phone = req.body.phone;
  let contact = new Contact({
    name: name,
    phone: phone,
    owner: req.user._id
  });
  contact.save((err, cont) => {
    if (err) {
      return res.redirect("/contacts/new");
    }
    return res.redirect("/contacts");
  });
});

//Get edit contact form
router.get("/contacts/edit/:id", (req, res) => {
  Contact.findById(req.params.id)
    .then(contact => {
      res.render("editContact", {
        loggedOut: false,
        contact: contact,
        edit: true
      });
    })
    .catch(error => {});
});

//Edit contacts - POST
router.post("/contacts/edit/:contactId", (req, res) => {
  Contact.findByIdAndUpdate(
    req.params.contactId,
    {
      name: req.body.name,
      phone: req.body.phone
    },
    function(err, user) {
      if (err) {
        console.log(err);
        res.redirect("contacts");
      } else {
        res.redirect("/contacts");
      }
    }
  );
});

//Get all messages!
router.get("/messages", (req, res) => {
  Message.find({ user: req.user._id })
    .populate("contact")
    .exec((err, messages) => {
      if (err) return res.redirect("/contacts");
      else {
        res.render("messages", { messages: messages });
      }
    });
});

//get messages
router.get("/messages/:contactId", (req, res) => {
  Message.find({ user: req.user._id, contact: req.params.contactId })
    .populate("contact")
    .exec((err, messages) => {
      if (err) return res.redirect("/contacts");
      else {
        res.render("messages", { messages: messages });
      }
    });
});
router.get("/messages/send/:contactId", (req, res) => {
  Contact.findById(req.params.contactId)
    // .populate("owner")
    .exec(function(err, contact) {
      if (err) return res.redirect("/contacts");
      else {
        res.render("newMessage", { contact: contact });
      }
    });
});

router.post("/messages/send/:contactId", (req, res) => {
  Contact.findById(req.params.contactId).exec((err, contact) => {
    let data = {
      body: req.body.content,
      to: "+1" + contact.phone,
      from: fromNumber
    };

    client.messages.create(data, function(err, msg) {
      console.log(err, msg);
      let m = new Message({
        created: new Date(),
        content: req.body.content,
        user: req.user._id,
        contact: req.params.contactId,
        status: "sent"
      });
      m.save((err, message) => {
        if (err) res.redirect("/messages/send/" + req.params.contactId);
        else {
          res.redirect("/messages/" + req.params.contactId);
        }
      });
    });
  });
});

router.post("/messages/receive", (req, res) => {
  // let contactNum = req.body.From.replace(/[^0-9]+/g, "").substring(1);
  let contactNum = req.body.From.substring(2);
  let userNum = req.body.To.substring(2);

  let contact;
  let user;

  Contact.findOne({ phone: contactNum }, (err, c) => {
    if (err) return res.redirect("/contacts");
    contact = c;
    User.findOne({ phone: userNum }, (err, u) => {
      if (err) return res.redirect("/contacts");
      user = u;
      let m = new Message({
        created: new Date(),
        content: req.body.Body,
        status: "received",
        user: user._id,
        contact: contact._id,
        from: contact.phone
      });
      m.save((err, message) => {
        if (err) {
          return res.redirect("/contacts");
        } else {
          res.redirect("/messages");
        }
      });
    });
  });
});

module.exports = router;
