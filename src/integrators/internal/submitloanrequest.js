const config = require("../../config");
const Contents = require("../../models/content");
const ContentTypes = require("../../models/contentType");
const uuidv4 = require("uuid/v4");
const async = require("async");

function submitloanrequest() {
  var _onOkCallBack;

  function _onOk(result) {
    if (_onOkCallBack) {
      _onOkCallBack(result);
    }
  }

  var _onErrorCallBack;

  function _onError(error) {
    if (_onErrorCallBack) {
      _onErrorCallBack(error);
    }
  }

  var sendRPCMessage = (channel, message, rpcQueue) =>
    new Promise(resolve => {
      const correlationId = uuidv4();
      // listen for the content emitted on the correlationId event
      //channel.responseEmitter.once(correlationId, resolve);
      channel.sendToQueue(rpcQueue, Buffer.from(JSON.stringify(message)));
    });

  var submittopartners = function (
    channel,
    reqtype,
    stage,
    spoid,
    obj,
    callback
  ) {
    var istest = true;
    var pn = obj.fields.phonenumber ?
      obj.fields.phonenumber :
      obj.fields.phoneNumber;
    var tests = process.env.TEST_ACCOUNTS ?
      process.env.TEST_ACCOUNTS.split(",") : [
        "+989197682386",
        "+989333229291",
        "+989125138218",
        "09197682386",
        "09333229291",
        "09125138218"
      ];
    if (pn && tests.indexOf(pn) == -1) istest = false;
    console.log("start loading rules");
    Contents.find({
      contentType: "5e85d131f0356f001334ba75",
      status: "published",
      "sys.spaceId": obj.sys.spaceId,
      "fields.loantypes": obj.fields.loantype
    }).exec((err, rules) => {
      if (err) {
        console.log("error in loading rules : " + err);
        callback(err, undefined);
        return;
      } else {
        console.log("Rules loaded : " + JSON.stringify(rules));
        for (i = 0; i < rules.length; i++) {
          var rule = rules[i];
          try {
            var fields = {};
            fields.name = {
              fa: obj.fields.name,
              en: obj.fields.name
            };
            fields.stage = stage;
            fields.partnerid = rule.fields.partnerid;
            fields.requestid = obj._id;
            var request = new Contents({
              fields: fields,
              contentType: spoid
            });
            if (!istest || (istest && rule.fields.isdevacc)) {
              sendRPCMessage(
                channel, {
                  body: request,
                  userId: obj.sys.issuer,
                  spaceId: obj.sys.spaceId
                },
                "submitcontent"
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

        callback(undefined, obj);
      }
    });

  };

  var changerequeststage = function (channel, obj, objId, stage, callback) {
    try {
      console.log("Changing request stage started");

      sendRPCMessage(
        channel, {
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

  function _call(
    channel,
    space,
    token,
    userId,
    contentType,
    data,
    configuration
  ) {
    console.log("data : ", JSON.stringify(data));
    console.log("configuration : ", JSON.stringify(configuration));
    console.log("space : ", JSON.stringify(space));
    try {
      console.log("Submit trigger started.");
      async.parallel({
          approvereqeust: function (callback) {
            changerequeststage(
              channel,
              data,
              data._id,
              configuration.request_stage,
              callback
            );
          },
          sendtopartners: function (callback) {
            submittopartners(
              channel,
              configuration.request_type,
              configuration.spo_stage,
              configuration.spo_id,
              data,
              callback
            );
          }
        },
        (error, results) => {
          _onOk(error, results);
        }
      );
    } catch (ex) {
      console.log(ex);
      _onError({
        success: false,
        error: ex
      });
    }
  }
  return {
    call: _call,
    onOk: function (callback) {
      _onOkCallBack = callback;
      return this;
    },
    onError: function (callback) {
      this._onErrorCallBack = callback;
      return this;
    }
  };
}

config.webhooks.submitloanrequest = submitloanrequest;
exports.submitloanrequest = submitloanrequest;