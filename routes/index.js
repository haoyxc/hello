let express = require("express");
let router = express.Router();
let models = require("../models/models");
let Contact = models.Contact;
let Message = models.Message;
let User = models.User;

let accountSid = process.env.TWILIO_SID;
let authToken = process.env.TWILIO_AUTH_TOKEN;
let fromNumber = process.env.MY_TWILIO_NUMBER;
let twilio = require("twilio");
let client = new twilio(accountSid, authToken);
let mongoose = require("mongoose");
mongoose.set("useFindAndModify", false);

let Twitter = require("twitter");

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
    let isTwitter = false;
    if (req.user.accountType === "twitter") {
      isTwitter = true;
    }
    res.render("contacts", { contacts: contacts, user: req.user, isTwitter: isTwitter });
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
        Contact.findById(req.params.contactId).exec((err2, contact) => {
          res.render("messages", { messages: messages, contact: contact });
        });
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
  let contactNum = req.body.From.substring(2);

  let contact;
  let user;

  Contact.findOne({ phone: contactNum })
    .populate("owner")
    .exec((err, c) => {
      if (err) return res.redirect("/contacts");
      contact = c;
      user = contact.owner;
      let m = new Message({
        created: new Date(),
        content: req.body.Body,
        status: "received",
        user: user._id,
        contact: contact._id,
        from: contact.phone
      });
      m.save((error, message) => {
        if (error) {
          console.log(error);
          return res.redirect("/contacts");
        } else {
          res.send("ok");
        }
      });
    });
});

router.get("/twitter/import", (req, res) => {
  let client = new Twitter({
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    access_token_key: req.user.twitterToken,
    access_token_secret: req.user.twitterTokenSecret
  });
  client.get("followers/list.json?count=200", (err, response) => {
    User.findOneAndUpdate(
      { twitterId: req.user.twitterId },
      {
        $set: { followers: response.users }
      },
      (err, resp) => {
        res.redirect("/contacts");
      }
    );
  });
});

router.get("/twitter/messages", (req, res) => {
  let client = new Twitter({
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    access_token_key: req.user.twitterToken,
    access_token_secret: req.user.twitterTokenSecret
  });
  client.get("direct_messages/events/list", (err, mess) => {
    let messages = mess.events;
    // console.log(typeof(mess.events))
    let messages_created = [];
    // messages.forEach(mes => console.log(mes));
    messages.forEach(mes => messages_created.push(mes.message_create));
    // console.log(messages_created);
    res.render("twitterMessages", { messages: messages_created });
  });
});

router.get("/twitter/messages/send/:id", (req, res) => {
  User.findOne({ twitterId: req.user.twitterId }, (err, user) => {
    user.followers.forEach(follower => {
      if (follower.id_str === req.params.id) {
        console.log(follower);
        if (err) {
          return res.redirect("/contacts");
        }
        res.render("newMessage", { contact: follower });
      }
    });
  });
});

router.post("/twitter/messages/send/:id", (req, res) => {
  let client = new Twitter({
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    access_token_key: req.user.twitterToken,
    access_token_secret: req.user.twitterTokenSecret
  });

  console.log(client);
  console.log(req.body.content, req.params.id);
  client.post(
    "direct_messages/events/new",
    {
      event: {
        type: "message_create",
        message_create: {
          target: { recipient_id: req.params.id },
          message_data: { text: req.body.content }
        }
      }
    },
    (err, resp) => {
      console.log("ERROR", err);
      console.log("RESP", resp);
      res.redirect("/twitter/messages");
    }
  );
});

module.exports = router;
