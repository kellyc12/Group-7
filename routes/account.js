var mongoose = require("mongoose");
var Schema = mongoose.Schema;
// var passportLocalMongoose = require("passport-local-mongoose");
var bcrypt = require("bcrypt-nodejs");
var passport = require("passport");

var Account = new Schema({
  username: String,
  password: String,
  email: String,
  spotifyID: String,
  valid: Boolean,
  type: String,
  lastLogged: Date,
  access_token: String,
  refresh_token: String,
  playlist_links:Array
  //Change these around and add more fields that you may need for an account here!!
});

//If you need another mongo collection, simply make another file like this in the models folder!

// Account.plugin(passportLocalMongoose);
// var dbs = mongoose.model("Account", Account);
// var schema = Account;
module.exports = mongoose.model("Account", Account);
