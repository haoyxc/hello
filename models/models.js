var mongoose = require('mongoose');
var connect = process.env.MONGODB_URI;

// If you're getting an error here, it's probably because
// your connect string is not defined or incorrect.
mongoose.connect(connect);

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
    }
})

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
})

let messageSchema = new mongoose.Schema({
    created: {
        type: Date
    }, 
    content: {
        type: String
    }, 
    user: {
        type: mongoose.Schema.ObjectId,
        ref: "User" 
    }, 
    contact: {
        type:mongoose.Schema.ObjectId, 
        ref: "Contact"
    }, 
    channel: {
        type: String, 
        default: "SMS"
    }, 
    status: { //sent or received 
        type: String
    }, 
    from: {
        type: String, 
        minLength: 10,
        maxLength: 10
    }
})

let statusArticle = messageSchema.virtual("statusArticle").get(function(){
    if (this.status === "sent") return "to"; 
    else if (this.status === "received") return "from"
})


userSchema.methods.getContacts = function(callback){
    let self = this; 
    Contact.find({owner: self._id})
    .populate("owner")
    .exec((err, contacts) =>{
        callback(err, contacts); 
    })
}

// Step 2: Create all of your models here, as properties.
let User = mongoose.model("User", userSchema); 
let Contact = mongoose.model("Contact", contactSchema); 
let Message = mongoose.model("Message", messageSchema); 

// Step 3: Export your models object
module.exports = {
    User: User,
    Contact: Contact, 
    Message: Message
}
