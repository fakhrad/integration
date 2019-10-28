var amqp = require("amqplib/callback_api");
const Spaces = require("./models/space");
const Tokens = require("./models/token");
const Contents = require("./models/content");
const ContentTypes = require("./models/contentType");
const uuidv4 = require("uuid/v4");
var db = require("./db/init-db");
var EventEmitter = require("events");
var async = require("async");
const REPLY_QUEUE = "amq.rabbitmq.reply-to";
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
    // create an event emitter where rpc responses will be published by correlationId
    ch.responseEmitter = new EventEmitter();
    ch.responseEmitter.setMaxListeners(0);
    ch.consume(
      REPLY_QUEUE,
      msg => ch.responseEmitter.emit(msg.properties.correlationId, msg.content),
      { noAck: true }
    );
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
              switch (req.body.data.contentType) {
                //#region  Vam Separ
                //Vam Separ loan
                case "5d26e7e9375e9b001745e84e":
                  async.parallel(
                    {
                      approvereqeust: function(callback) {
                        changerequeststage(
                          channel,
                          req.body.data,
                          req.body.data._id,
                          "5d3fc2f77029a500172c5c3e",
                          callback
                        );
                      },
                      sendtopartners: function(callback) {
                        submittopartners(
                          ch,
                          "5d3fc9b97029a500172c5c48",
                          "5d6e8accc51a44001703df19",
                          "5d62814c0490c200171f0d71",
                          req.body.data,
                          callback
                        );
                      }
                    },
                    (error, results) => {}
                  );
                  break;
                // VamSepar offer
                case "5d3fc7397029a500172c5c46":
                  async.parallel(
                    {
                      changerequesttoofferrecieved: function(callback) {
                        changerequeststage(
                          channel,
                          req.body.data,
                          req.body.data.fields.loan,
                          "5d3fc30a7029a500172c5c3f",
                          callback
                        );
                      },
                      approveoffer: function(callback) {
                        changestage(
                          channel,
                          req.body.data,
                          req.body.data._id,
                          "5d514934780b9c00170233e8",
                          callback
                        );
                      }
                    },
                    (error, results) => {}
                  );
                  break;
                //#endregion
                //#region  Startup space
                //Deficated office
                case "5cf7e7449916860017805408":
                //Shared and private desk
                case "5cfc95472606810017dca194":
                ///Meeting Room
                case "5cf7e7289916860017805407":
                  async.parallel(
                    {
                      approvereqeust: function(callback) {
                        changerequeststage(
                          channel,
                          req.body.data,
                          req.body.data._id,
                          "5d6b5dd25b60dc0017c9511c",
                          callback
                        );
                      },
                      sendtopartners: function(callback) {
                        submittopartners_ss(
                          ch,
                          "5d358ebc8e6e9a0017c28fc9",
                          "assigned",
                          "5d58df5a74c64b0017fb45d8",
                          req.body.data,
                          callback
                        );
                      }
                    },
                    (error, results) => {}
                  );
                  break;

                case "5d35adc68e6e9a0017c28fcb":
                  async.parallel(
                    {
                      changerequesttoofferrecieved: function(callback) {
                        changerequeststage(
                          channel,
                          req.body.data,
                          req.body.data.fields.requestid,
                          "5d7e582415586f0017d4836c",
                          callback
                        );
                      },
                      approveoffer: function(callback) {
                        changestage(
                          channel,
                          req.body.data,
                          req.body.data._id,
                          "5d7b968918a6400017ee1513",
                          callback
                        );
                      }
                    },
                    (error, results) => {}
                  );
                  break;
                //#endregion
              }
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

var sendRPCMessage = (channel, message, rpcQueue) =>
  new Promise(resolve => {
    const correlationId = uuidv4();
    // listen for the content emitted on the correlationId event
    //channel.responseEmitter.once(correlationId, resolve);
    channel.sendToQueue(rpcQueue, Buffer.from(JSON.stringify(message)));
  });
var sendnotification = function(broker, token, obj, callback) {
  console.log("sending notification : " + token, JSON.stringify(obj));
  if (token.deviceToken) {
    sendRPCMessage(
      broker,
      {
        body: {
          device: token.deviceToken,
          message: {},
          data: {
            type: "NEW_REQUEST"
          }
        }
      },
      "sendPushMessage"
    ).then(result => {
      var obj = JSON.parse(result.toString("utf8"));
      if (!obj.success)
        console.log(
          "Push message not sent. Error code : " +
            obj.error +
            " response : " +
            obj.data
        );
      else console.log("Push message successfully sent");
    });
  }
  callback(undefined, obj);
};

var submittopartners = function(broker, reqtype, stage, spoid, obj, callback) {
  Contents.find({
    contentType: reqtype,
    status: "published",
    "sys.spaceId": obj.sys.spaceId
  })
    .select("_id name status")
    .exec((err, cts) => {
      if (err) {
        callback(err, undefined);
      } else {
        console.log(cts);
        for (i = 0; i < cts.length; i++) {
          try {
            var content = cts[i];
            var fields = {};
            fields.name = {
              fa: obj.fields.name,
              en: obj.fields.name
            };
            fields.stage = stage;
            fields.partnerid = content._id;
            fields.requestid = obj._id;
            var request = new Contents({
              fields: fields,
              contentType: spoid
            });
            sendRPCMessage(
              channel,
              {
                body: request,
                userId: obj.sys.issuer,
                spaceId: obj.sys.spaceId
              },
              "addcontent"
            ).then(result => {
              var obj = JSON.parse(result.toString("utf8"));
              if (!obj.success) {
                if (obj.error) {
                  callback(err, undefined);
                  return;
                }
              } else {
                //do mach making and submit to partners
                callback(undefined, obj);
              }
            });
          } catch (ex) {
            console.log(ex);
          }
        }
      }
    });

  callback(undefined, obj);
};
var submittopartners_ss = function(
  broker,
  reqtype,
  stage,
  spoid,
  obj,
  callback
) {
  Contents.find({
    contentType: "5d358ebc8e6e9a0017c28fc9",
    status: "published",
    "sys.spaceId": obj.sys.spaceId,
    "fields.city": obj.fields.city
  })
    .select("_id name status fields")
    .exec((err, cts) => {
      if (err) {
        callback(err, undefined);
      } else {
        for (i = 0; i < cts.length; i++) {
          try {
            var content = cts[i];
            var wf = obj.fields.workingfield ? obj.fields.workingfield : [];
            var match = false;

            if (content.fields) {
              if (content.fields.workingfields) {
                for (i = 0; i < wf.length; i++) {
                  if (content.fields.workingfields.indexOf(wf[i]) != -1)
                    match = true;
                }
              }
            } else console.log("content.fields is null");
            if (match) {
              var fields = {};
              fields.name = {
                fa: obj.fields.name,
                en: obj.fields.name
              };
              fields.stage = stage;
              fields.partnerid = content._id;
              fields.requestid = obj._id;
              var request = new Contents({
                fields: fields,
                contentType: spoid
              });
              sendRPCMessage(
                channel,
                {
                  body: request,
                  userId: obj.sys.issuer,
                  spaceId: obj.sys.spaceId
                },
                "addcontent"
              ).then(result => {
                var obj = JSON.parse(result.toString("utf8"));
                if (!obj.success) {
                  if (obj.error) {
                    callback(err, undefined);
                    return;
                  }
                } else {
                  //do mach making and submit to partners
                  callback(undefined, obj);
                }
              });
            }
          } catch (ex) {
            console.log(ex);
          }
        }
      }
    });

  callback(undefined, obj);
};

var changerequeststage = function(channel, obj, objId, stage, callback) {
  try {
    sendRPCMessage(
      channel,
      {
        body: {
          id: objId,
          fields: {
            stage: stage
          }
        },
        userId: obj.sys.issuer,
        spaceId: obj.sys.spaceId
      },
      "partialupdatecontent"
    ).then(result => {
      var obj = JSON.parse(result.toString("utf8"));
      if (!obj.success) {
        if (obj.error) {
          callback(err, undefined);
          return;
        }
      } else {
        //do mach making and submit to partners
        callback(undefined, obj);
      }
    });
  } catch (ex) {
    console.log(ex);
  }
  callback(undefined, obj);
};

var changestage = function(channel, obj, objId, stage, callback) {
  try {
    sendRPCMessage(
      channel,
      {
        body: {
          id: objId,
          fields: {
            stage: stage
          }
        },
        userId: obj.sys.issuer,
        spaceId: obj.sys.spaceId
      },
      "partialupdatecontent"
    ).then(result => {
      var obj = JSON.parse(result.toString("utf8"));
      if (!obj.success) {
        if (obj.error) {
          callback(err, undefined);
          return;
        }
      } else {
        //do mach making and submit to partners
        callback(undefined, obj);
      }
    });
  } catch (ex) {
    console.log(ex);
  }
  callback(undefined, obj);
};
start();

db();
