var amqp = require("amqplib/callback_api");
const Spaces = require("./models/space");
const ContentTypes = require("./models/contentType");
const async = require("async");

var db = require("./db/init-db");

var rabbitHost =
  process.env.RABBITMQ_HOST ||
  "amqp://gvgeetrh:6SyWQAxDCpcdg1S0Dc-Up0sUxfmBUVZU@chimpanzee.rmq.cloudamqp.com/gvgeetrh";
//var rabbitHost = process.env.RABBITMQ_HOST || "amqp://localhost:5672";

var amqpConn = null;
function start() {
  console.log("Start connecting : " + process.env.RABBITMQ_HOST);
  amqp.connect(rabbitHost, (err, conn) => {
    if (err) {
      console.error("[AMQP]", err.message);
      return setTimeout(start, 1000);
    }
    conn.on("error", function(err) {
      if (err.message !== "Connection closing") {
        console.error("[AMQP] conn error", err.message);
      }
    });
    conn.on("close", function() {
      console.error("[AMQP] reconnecting");
      //return setTimeout(start, 1000);
    });

    console.log("[AMQP] connected");
    amqpConn = conn;

    whenConnected();
  });
}
function whenConnected() {
  amqpConn.createChannel((err, ch) => {
    if (err) {
      console.error("[AMQP]", err.message);
      //return setTimeout(start, 1000);
    }
    ch.on("error", function(err) {
      console.error("[AMQP] channel error", err.message);
    });
    ch.on("close", function() {
      console.log("[AMQP] channel closed");
    });
    console.log("Client connected.");
    this.channel = ch;

    ch.prefetch(1);
    console.log("Integration service broker started!");

    //Exchanges
    var exchange = "messaging";

    ch.assertExchange(exchange, "direct", {
      durable: false
    });

    ch.assertExchange("contentservice", "direct", {
      durable: false
    });

    ch.assertExchange("adminauth", "direct", {
      durable: false
    });

    ch.assertQueue("", { durable: false, exclusive: true }, (err, q) => {
      if (!err) {
        ch.bindQueue(q.queue, "contentservice", "contentsubmitted");
        ch.consume(
          q.queue,
          function(msg) {
            // console.log(msg);
            var req = JSON.parse(msg.content.toString("utf8"));
            console.log(
              "New content submitted." + msg.content.toString("utf8")
            );
            try {
              Spaces.findById(req.body.data.sys.spaceId).exec((err, space) => {
                if (space) {
                } else {
                }
              });
            } catch (ex) {
              console.log(ex);
            }
          },
          {
            noAck: true
          }
        );
      }
    });
  });
}
start();

db();
