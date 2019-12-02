const config = require("../../config");
const Contents = require("../../models/content");
const ContentTypes = require("../../models/contentType");
const uuidv4 = require("uuid/v4");
const async = require("async");
function submitloan() {
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

  var submittopartners = function(
    channel,
    reqtype,
    stage,
    spoid,
    obj,
    callback
  ) {
    console.log("Submitting to partners");
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
      console.log("Changing request stage started");

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
  function _call(
    channel,
    space,
    token,
    userId,
    contentType,
    data,
    configuration
  ) {
    try {
      console.log("Submit loan trigger started.");
      async.parallel(
        {
          approvereqeust: function(callback) {
            changerequeststage(
              channel,
              data,
              data._id,
              "5d3fc2f77029a500172c5c3e",
              callback
            );
          },
          sendtopartners: function(callback) {
            submittopartners(
              channel,
              "5d3fc9b97029a500172c5c48",
              "5d6e8accc51a44001703df19",
              "5d62814c0490c200171f0d71",
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
      _onError({ success: false, error: ex });
    }
  }
  return {
    call: _call,
    onOk: function(callback) {
      _onOkCallBack = callback;
      return this;
    },
    onError: function(callback) {
      this._onErrorCallBack = callback;
      return this;
    }
  };
}

config.webhooks.submitloan = submitloan;
exports.submitloan = submitloan;
