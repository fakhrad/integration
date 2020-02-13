const config = require("../../config");
const uuidv4 = require("uuid/v4");
const Partners = require("../../models/content");
const Tokens = require("../../models/token");
const async = require("async");
function notifypartnerbyemail() {
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

  var publish_content = function (channel, obj, objId, stage, callback) {
    try {
      console.log("Publish content started");

      sendRPCMessage(
        channel,
        {
          body: {
            id: objId
          },
          userId: obj.sys.issuer,
          spaceId: obj.sys.spaceId
        },
        "publishcontent"
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
      if (space && data && data.fields && data.fields.partnerid) {
        if (!configuration) configuration = {};
        Partners.findById(data.fields.partnerid).exec((err, partner) => {
          if (
            err ||
            !partner ||
            (partner && !partner.fields) ||
            (partner && partner.fields && !partner.fields.email)
          ) {
            _onError(err, undefined);
          } else {
            configuration.to = partner.fields.email;
            configuration.subject = data.fields.name.fa
              ? data.fields.name.fa
              : data.fields.name.en
                ? data.fields.name.en
                : data.fields.name;

            async.parallel({
              publish: function (callback) {
                publish_content(
                  channel,
                  data,
                  data._id,
                  configuration.request_stage,
                  callback
                );
              },
              sendmail: function (callback) {
                sendRPCMessage(
                  channel,
                  {
                    body: {
                      clientId: space._id.toString(),
                      contentType: contentType ? contentType._id.toString() : "",
                      data: data,
                      userId: partner._id,
                      message: configuration
                    }
                  },
                  "sendEmailMessage"
                ).then(result => {
                  var obj = JSON.parse(result.toString("utf8"));
                  if (!obj.success) {
                    callback(obj, undefined);
                    console.log(obj);
                  } else {
                    console.log("Email message sent");
                    callback(undefined, obj);
                  }
                });
              }
            }
            ),
              (error, results) => {
                if (error) {
                  console.log(JSON.stringify(error));
                  _onError({ success: false, error: error });
                }
                else
                  _onOk(error, results);
              }

          }
        });
      }
    } catch (ex) {
      console.log(ex);
      _onError({ success: false, error: ex });
    }
  }
  return {
    call: _call,
    onOk: function (callback) {
      _onOkCallBack = callback;
      return this;
    },
    onError: function (callback) {
      _onOkCallBack = callback;
      return this;
    }
  };
}

config.webhooks.notifypartnerbyemail = notifypartnerbyemail;
exports.notifypartnerbyemail = notifypartnerbyemail;
