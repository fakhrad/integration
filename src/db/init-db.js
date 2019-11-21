var mongoose = require("mongoose");
var async = require("async");
var init = function() {
  var dev_db_url =
    "mongodb://fakhrad:logrezaee24359@ds243188-a0.mlab.com:43188,ds243188-a1.mlab.com:43188/content-db?replicaSet=rs-ds243188";
  var mongoDB = process.env.DATABASE_URL || dev_db_url;
  mongoose.connect(mongoDB);
  mongoose.Promise = global.Promise;
  var db = mongoose.connection;
  db.on("error", console.error.bind(console, "MongoDB connection error:"));
  db.on("connected", () => {
    console.log("MongoDb connected");
  });
};
module.exports = init;
