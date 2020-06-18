var mongoose = require("mongoose");
var connections = require("./connections");

var dev_db_url =
  "mongodb://fakhrad:logrezaee24359@ds135036.mlab.com:35036/content-db";
var mongoDB = process.env.DATABASE_URL || dev_db_url;

var auth_db_url =
  "mongodb://root:m1x7EWlgEmr46Tn8ji2sxBzf@s8.liara.ir:32764/authdb?authSource=admin&replicaSet=rs0";
var authDB = process.env.AUTHDB_URL || auth_db_url;
var db1 = mongoose.createConnection(mongoDB);
var db2 = mongoose.createConnection(authDB);
mongoose.Promise = global.Promise;
db1.on("error", console.error.bind(console, "ContentDb connection error:"));
db1.on("connected", () => {
  console.log("ContentDb connected");
});
connections.contentDb = db1;

db2.on("error", console.error.bind(console, "AuthDb connection error:"));
db2.on("connected", () => {
  console.log("AuthDb connected");
});
connections.authDb = db2;