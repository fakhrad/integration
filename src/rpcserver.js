var amqp = require("amqplib/callback_api");
var db = require("./db/init-db");
const Tokens = require("./models/token");
const Contents = require("./models/content");
const Spaces = require("./models/space");
const ContentTypes = require("./models/contentType");
const uuidv4 = require("uuid/v4");
const config = require("./config");
var EventEmitter = require("events");
var async = require("async");
const REPLY_QUEUE = "amq.rabbitmq.reply-to";
require("./integrators/external/sendmail");
require("./integrators/internal/submitoffer");
require("./integrators/internal/submitrequest");
require("./integrators/external/firebasepush");
require("./integrators/internal/notifypartner");
require("./integrators/external/kavenegarsms");
require("./integrators/internal/notifypartnerbyemail");
require("./integrators/internal/notifypartnerbyesms");
require("./integrators/internal/offeraccepted");
require("./integrators/internal/notifycustomerbyemail");
require("./integrators/internal/notifycustomerbysms");
require("./integrators/internal/submitloanrequest");
require("./integrators/internal/submitinvestmentrequest");
require("./integrators/internal/submitstartuprequest");
var rabbitHost =
  process.env.RABBITMQ_HOST ||
  "amqp://fakhrad:logrezaee24359@queue.reqter.com:5672";
//var rabbitHost = process.env.RABBITMQ_HOST || "amqp://localhost:5672";

var amqpConn = null;

function start() {
  console.log("Start connecting : " + rabbitHost);
  amqp.connect(rabbitHost, (err, conn) => {
    if (err) {
      console.error("[AMQP]", err.message);
      return setTimeout(start, 5000);
    }
    conn.on("error", function (err) {
      if (err.message !== "Connection closing") {
        console.error("[AMQP] conn error", err.message);
      }
    });
    conn.on("close", function () {
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
    ch.on("error", function (err) {
      console.error("[AMQP] channel error", err.message);
    });
    ch.on("close", function () {
      console.log("[AMQP] channel closed");
    });
    // create an event emitter where rpc responses will be published by correlationId
    ch.responseEmitter = new EventEmitter();
    ch.responseEmitter.setMaxListeners(0);
    ch.consume(
      REPLY_QUEUE,
      msg => ch.responseEmitter.emit(msg.properties.correlationId, msg.content), {
        noAck: true
      }
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

    ch.assertExchange("requester", "direct", {
      durable: false
    });

    ch.assertQueue("", {
      durable: false,
      exclusive: true
    }, (err, q) => {
      if (!err) {
        ch.bindQueue(q.queue, "contentservice", "contentpublished");
        ch.consume(
          q.queue,
          function (msg) {
            var req = JSON.parse(msg.content.toString("utf8"));
            console.log(
              "New content published." + msg.content.toString("utf8")
            );
            try {
              try {
                async.parallel({
                    space: function (callback) {
                      Spaces.findById(req.body.sys.spaceId).exec(
                        (err, space) => {
                          if (err) {
                            callback(err, undefined);
                          } else {
                            callback(undefined, space);
                          }
                        }
                      );
                    },
                    ctype: function (callback) {
                      ContentTypes.findById(req.body.contentType).exec(
                        (err, ctype) => {
                          if (err) {
                            callback(err, undefined);
                          } else {
                            callback(undefined, ctype);
                          }
                        }
                      );
                    },
                    token: function (callback) {
                      Tokens.findOne({
                          userId: req.body.sys.issuer
                        })
                        .sort("-issueDate")
                        .exec((err, token) => {
                          if (err) {
                            callback(err, undefined);
                          } else {
                            callback(undefined, token);
                          }
                        });
                    }
                  },
                  async (errors, results) => {
                    if (results.space) {
                      config.space = results.space;
                      config.contentType = results.ctype;
                      config.token = results.token;
                      config.userId = req.body.sys.issuer;
                      config.data = req.body;
                      var webhooks = config.getWebhooks(
                        req.body.contentType,
                        "contentpublished"
                      );
                      for (i = 0; i < webhooks.length; i++) {
                        webhook = webhooks[i];
                        if (webhook && webhook.func) {
                          console.log("Start triggering " + webhook.data.name);
                          webhook
                            .func()
                            .onOk(() => {
                              console.log(
                                webhook.data.name + " triggered successfully"
                              );
                            })
                            .onError(error => {
                              console.log(
                                webhook.data.name +
                                " triggered with error : " +
                                JSON.stringify(error)
                              );
                            })
                            .call(
                              channel,
                              config.space,
                              config.token,
                              config.userId,
                              config.contentType,
                              config.data,
                              webhook.data.config
                            );
                        }
                      }
                    } else console.log(results);
                  }
                );
              } catch (ex) {
                console.log(ex);
              }
            } catch (ex) {
              console.log(ex);
            }
          }, {
            noAck: true
          }
        );
      }
    });

    ch.assertQueue("", {
      durable: false,
      exclusive: true
    }, (err, q) => {
      if (!err) {
        ch.bindQueue(q.queue, "contentservice", "contentcreated");
        ch.consume(
          q.queue,
          function (msg) {
            var req = JSON.parse(msg.content.toString("utf8"));
            console.log(
              "New content created." + msg.content.toString("utf8")
            );
            try {
              try {
                async.parallel({
                    space: function (callback) {
                      Spaces.findById(req.body.sys.spaceId).exec(
                        (err, space) => {
                          if (err) {
                            callback(err, undefined);
                          } else {
                            callback(undefined, space);
                          }
                        }
                      );
                    },
                    ctype: function (callback) {
                      ContentTypes.findById(req.body.contentType).exec(
                        (err, ctype) => {
                          if (err) {
                            callback(err, undefined);
                          } else {
                            callback(undefined, ctype);
                          }
                        }
                      );
                    },
                    token: function (callback) {
                      Tokens.findOne({
                          userId: req.body.sys.issuer
                        })
                        .sort("-issueDate")
                        .exec((err, token) => {
                          if (err) {
                            callback(err, undefined);
                          } else {
                            callback(undefined, token);
                          }
                        });
                    }
                  },
                  async (errors, results) => {
                    if (results.space) {
                      config.space = results.space;
                      config.contentType = results.ctype;
                      config.token = results.token;
                      config.userId = req.body.sys.issuer;
                      config.data = req.body;
                      var webhooks = config.getWebhooks(
                        req.body.contentType,
                        "contentcreated"
                      );
                      for (i = 0; i < webhooks.length; i++) {
                        webhook = webhooks[i];
                        if (webhook && webhook.func) {
                          console.log("Start triggering " + webhook.data.name);
                          webhook
                            .func()
                            .onOk(() => {
                              console.log(
                                webhook.data.name + " triggered successfully"
                              );
                            })
                            .onError(error => {
                              console.log(
                                webhook.data.name +
                                " triggered with error : " +
                                JSON.stringify(error)
                              );
                            })
                            .call(
                              channel,
                              config.space,
                              config.token,
                              config.userId,
                              config.contentType,
                              config.data,
                              webhook.data.config
                            );
                        }
                      }
                    } else console.log(results);
                  }
                );
              } catch (ex) {
                console.log(ex);
              }
            } catch (ex) {
              console.log(ex);
            }
          }, {
            noAck: true
          }
        );
      }
    });
    ch.assertQueue("", {
      durable: false,
      exclusive: true
    }, (err, q) => {
      if (!err) {
        ch.bindQueue(q.queue, "contentservice", "contentsubmitted");
        ch.consume(
          q.queue,
          function (msg) {
            var req = JSON.parse(msg.content.toString("utf8"));
            console.log(
              "New content submitted." + msg.content.toString("utf8")
            );
            try {
              try {
                async.parallel({
                    space: function (callback) {
                      Spaces.findById(req.body.data.sys.spaceId).exec(
                        (err, space) => {
                          if (err) {
                            callback(err, undefined);
                          } else {
                            callback(undefined, space);
                          }
                        }
                      );
                    },
                    ctype: function (callback) {
                      ContentTypes.findById(req.body.data.contentType).exec(
                        (err, ctype) => {
                          if (err) {
                            callback(err, undefined);
                          } else {
                            callback(undefined, ctype);
                          }
                        }
                      );
                    },
                    token: function (callback) {
                      Tokens.findOne({
                          userId: req.body.data.sys.issuer
                        })
                        .sort("-issueDate")
                        .exec((err, token) => {
                          if (err) {
                            callback(err, undefined);
                          } else {
                            callback(undefined, token);
                          }
                        });
                    }
                  },
                  async (errors, results) => {
                    if (results.space) {
                      config.space = results.space;
                      config.contentType = results.ctype;
                      config.token = results.token;
                      config.userId = req.body.data.sys.issuer;
                      config.data = req.body.data;
                      var webhooks = config.getWebhooks(
                        req.body.data.contentType,
                        "contentsubmitted"
                      );
                      for (i = 0; i < webhooks.length; i++) {
                        webhook = webhooks[i];
                        if (webhook && webhook.func) {
                          console.log("Start triggering " + webhook.data.name);
                          webhook
                            .func()
                            .onOk(() => {
                              console.log(
                                webhook.data.name + " triggered successfully"
                              );
                            })
                            .onError(error => {
                              console.log(
                                webhook.data.name +
                                " triggered with error : " +
                                JSON.stringify(error)
                              );
                            })
                            .call(
                              channel,
                              config.space,
                              config.token,
                              config.userId,
                              config.contentType,
                              config.data,
                              webhook.data.config
                            );
                        }
                      }
                    } else console.log(results);
                  }
                );
              } catch (ex) {
                console.log(ex);
              }
            } catch (ex) {
              console.log(ex);
            }
          }, {
            noAck: true
          }
        );
      }
    });

    ch.assertQueue("", {
      durable: false,
      exclusive: true
    }, (err, q) => {
      if (!err) {
        ch.bindQueue(q.queue, "requester", "oncustomeracceptedanoffer");
        ch.consume(
          q.queue,
          async function (msg) {
            var req = JSON.parse(msg.content.toString("utf8"));
            console.log(
              "An offer accepted." + msg.content.toString("utf8")
            );
            try {
              try {
                async.parallel({
                    space: function (callback) {
                      Spaces.findById(req.body.data.sys.spaceId).exec(
                        (err, space) => {
                          if (err) {
                            callback(err, undefined);
                          } else {
                            callback(undefined, space);
                          }
                        }
                      );
                    },
                    ctype: function (callback) {
                      ContentTypes.findById(req.body.data.contentType).exec(
                        (err, ctype) => {
                          if (err) {
                            callback(err, undefined);
                          } else {
                            callback(undefined, ctype);
                          }
                        }
                      );
                    },
                    token: function (callback) {
                      Tokens.findOne({
                          userId: req.body.data.sys.issuer
                        })
                        .sort("-issueDate")
                        .exec((err, token) => {
                          if (err) {
                            callback(err, undefined);
                          } else {
                            callback(undefined, token);
                          }
                        });
                    }
                  },
                  async (errors, results) => {
                    if (results.space) {
                      config.space = results.space;
                      config.contentType = results.ctype;
                      config.token = results.token;
                      config.userId = req.body.data.sys.issuer;
                      config.data = req.body.data;
                      var webhooks = config.getWebhooks(
                        req.body.data.contentType,
                        "oncustomeracceptedanoffer"
                      );
                      for (i = 0; i < webhooks.length; i++) {
                        webhook = webhooks[i];
                        if (webhook && webhook.func) {
                          console.log("Start triggering " + webhook.data.name);
                          await webhook
                            .func()
                            .onOk(() => {
                              console.log(
                                webhook.data.name + " triggered successfully"
                              );
                            })
                            .onError(error => {
                              console.log(
                                webhook.data.name +
                                " triggered with error : " +
                                JSON.stringify(error)
                              );
                            })
                            .call(
                              channel,
                              config.space,
                              config.token,
                              config.userId,
                              config.contentType,
                              config.data,
                              webhook.data.config
                            );
                        }
                      }
                    } else console.log(results);
                  }
                );
              } catch (ex) {
                console.log(ex);
              }
            } catch (ex) {
              console.log(ex);
            }
          }, {
            noAck: true
          }
        );
      }
    });

    ch.assertQueue("", {
      durable: false,
      exclusive: true
    }, (err, q) => {
      if (!err) {
        ch.bindQueue(q.queue, "requester", "oncustomerrejectedanoffer");
        ch.consume(
          q.queue,
          async function (msg) {
            var req = JSON.parse(msg.content.toString("utf8"));
            console.log(
              "An offer rejected." + msg.content.toString("utf8")
            );
            try {
              try {
                async.parallel({
                    space: function (callback) {
                      Spaces.findById(req.body.data.sys.spaceId).exec(
                        (err, space) => {
                          if (err) {
                            callback(err, undefined);
                          } else {
                            callback(undefined, space);
                          }
                        }
                      );
                    },
                    ctype: function (callback) {
                      ContentTypes.findById(req.body.data.contentType).exec(
                        (err, ctype) => {
                          if (err) {
                            callback(err, undefined);
                          } else {
                            callback(undefined, ctype);
                          }
                        }
                      );
                    },
                    token: function (callback) {
                      Tokens.findOne({
                          userId: req.body.data.sys.issuer
                        })
                        .sort("-issueDate")
                        .exec((err, token) => {
                          if (err) {
                            callback(err, undefined);
                          } else {
                            callback(undefined, token);
                          }
                        });
                    }
                  },
                  async (errors, results) => {
                    if (results.space) {
                      config.space = results.space;
                      config.contentType = results.ctype;
                      config.token = results.token;
                      config.userId = req.body.data.sys.issuer;
                      config.data = req.body.data;
                      var webhooks = config.getWebhooks(
                        req.body.data.contentType,
                        "oncustomerrejectedanoffer"
                      );
                      for (i = 0; i < webhooks.length; i++) {
                        webhook = webhooks[i];
                        if (webhook && webhook.func) {
                          console.log("Start triggering " + webhook.data.name);
                          await webhook
                            .func()
                            .onOk(() => {
                              console.log(
                                webhook.data.name + " triggered successfully"
                              );
                            })
                            .onError(error => {
                              console.log(
                                webhook.data.name +
                                " triggered with error : " +
                                JSON.stringify(error)
                              );
                            })
                            .call(
                              channel,
                              config.space,
                              config.token,
                              config.userId,
                              config.contentType,
                              config.data,
                              webhook.data.config
                            );
                        }
                      }
                    } else console.log(results);
                  }
                );
              } catch (ex) {
                console.log(ex);
              }
            } catch (ex) {
              console.log(ex);
            }
          }, {
            noAck: true
          }
        );
      }
    });
    ch.assertQueue("", {
      durable: false,
      exclusive: true
    }, (err, q) => {
      if (!err) {
        ch.bindQueue(q.queue, "requester", "onofferissued");
        ch.consume(
          q.queue,
          function (msg) {
            var req = JSON.parse(msg.content.toString("utf8"));
            console.log(
              "An offer Issued : " + msg.content.toString("utf8")
            );
            try {
              try {
                async.parallel({
                    space: function (callback) {
                      Spaces.findById(req.body.data.sys.spaceId).exec(
                        (err, space) => {
                          if (err) {
                            callback(err, undefined);
                          } else {
                            callback(undefined, space);
                          }
                        }
                      );
                    },
                    ctype: function (callback) {
                      ContentTypes.findById(req.body.data.contentType).exec(
                        (err, ctype) => {
                          if (err) {
                            callback(err, undefined);
                          } else {
                            callback(undefined, ctype);
                          }
                        }
                      );
                    },
                    token: function (callback) {
                      Tokens.findOne({
                          userId: req.body.data.sys.issuer
                        })
                        .sort("-issueDate")
                        .exec((err, token) => {
                          if (err) {
                            callback(err, undefined);
                          } else {
                            callback(undefined, token);
                          }
                        });
                    }
                  },
                  async (errors, results) => {
                    if (results.space) {
                      config.space = results.space;
                      config.contentType = results.ctype;
                      config.token = results.token;
                      config.userId = req.body.data.sys.issuer;
                      config.data = req.body.data;
                      var webhooks = config.getWebhooks(
                        req.body.data.contentType,
                        "offerissued"
                      );
                      for (i = 0; i < webhooks.length; i++) {
                        webhook = webhooks[i];
                        if (webhook && webhook.func) {
                          console.log("Start triggering " + webhook.data.name);
                          await webhook
                            .func()
                            .onOk(() => {
                              console.log(
                                webhook.data.name + " triggered successfully"
                              );
                            })
                            .onError(error => {
                              console.log(
                                webhook.data.name +
                                " triggered with error : " +
                                JSON.stringify(error)
                              );
                            })
                            .call(
                              channel,
                              config.space,
                              config.token,
                              config.userId,
                              config.contentType,
                              config.data,
                              webhook.data.config
                            );
                        }
                      }
                    } else console.log(results);
                  }
                );
              } catch (ex) {
                console.log(ex);
              }
            } catch (ex) {
              console.log(ex);
            }
          }, {
            noAck: true
          }
        );
      }
    });
  });
}

start();