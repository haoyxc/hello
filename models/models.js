let mongoose = require("mongoose");
let connect = process.env.MONGODB_URI;

mongoose.connect(connect);
let findOrCreate = require("mongoose-findorcreate");

// Step 1: Write your schemas here!
// Remember: schemas are like your blueprint, and models
// are like your building!
let userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    minLength: 10,
    maxLength: 10
  },
  pictureUrl: {
    type: String
  }, 
  accountType: {
      type: String,
      default: null
  }, 
  followers: {
      type: Object
  }, 
  facebookId: {
      type: String
  }, 
  twitterId: {
      type: String
  }, 
  twitterToken: String,
  twitterTokenSecret: String
});

let contactSchema = new mongoose.Schema({
  name: {
    type: String
  },
  phone: {
    type: String,
    minLength: 10,
    maxLength: 10
  },
  owner: {
    type: mongoose.Schema.ObjectId,
    ref: "User"
  }
});

let messageSchema = new mongoose.Schema({
  created: {
    type: Date
  },
  content: {
    type: String,
    minlength: 1
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: "User"
  },
  contact: {
    type: mongoose.Schema.ObjectId,
    ref: "Contact"
  },
  channel: {
    type: String,
    default: "SMS"
  },
  status: {
    //sent or received
    type: String
  },
  from: {
    type: String,
    minLength: 10,
    maxLength: 10
  }
});

let statusArticle = messageSchema.virtual("statusArticle").get(function() {
  if (this.status === "sent") return "to";
  else if (this.status === "received") return "from";
});

userSchema.methods.getContacts = function(callback) {
  let self = this;
  Contact.find({ owner: self._id })
    .populate("owner")
    .exec((err, contacts) => {
      callback(err, contacts);
    });
};

userSchema.plugin(findOrCreate);

// Step 2: Create all of your models here, as properties.
let User = mongoose.model("User", userSchema);
let Contact = mongoose.model("Contact", contactSchema);
let Message = mongoose.model("Message", messageSchema);

// Step 3: Export your models object
module.exports = {
  User: User,
  Contact: Contact,
  Message: Message
};
