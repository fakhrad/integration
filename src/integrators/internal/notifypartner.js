const config = require("../../config");
const uuidv4 = require("uuid/v4");
const Partners = require("../../models/content");
const Tokens = require("../../models/token");
function notifypartner() {
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
      if (space && data && data.fields && data.fields.partnerid) {
        if (!configuration) configuration = {};
        Partners.findById(data.fields.partnerid).exec((err, partner) => {
          if (err || !partner) {
            _onError(err, undefined);
          } else {
            Tokens.findOne({
              userId: partner.fields.phoneNumber
                ? partner.fields.phoneNumber
                : partner.fields.phonenumber
                ? partner.fields.phonenumber
                : partner._id,
              deviceToken: { $ne: token.deviceToken }
            })
              .sort("-issueDate")
              .exec((err, tkn) => {
                if (err || !tkn) {
                  _onError(err, undefined);
                } else {
                  sendRPCMessage(
                    channel,
                    {
                      body: {
                        clientId: space._id.toString(),
                        device: tkn.deviceToken,
                        contentType: contentType
                          ? contentType._id.toString()
                          : "",
                        data: undefined,
                        userId: partner.fields.phoneNumber
                          ? partner.fields.phoneNumber
                          : partner.fields.phonenumber
                          ? partner.fields.phonenumber
                          : partner._id,
                        message: configuration
                      }
                    },
                    "sendPushMessage"
                  ).then(result => {
                    var obj = JSON.parse(result.toString("utf8"));
                    if (!obj.success) {
                      _onError(obj, undefined);
                      console.log(obj);
                    } else {
                      console.log("Push message sent");
                      _onOk(undefined, obj);
                    }
                  });
                }
              });
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
    onOk: function(callback) {
      _onOkCallBack = callback;
      return this;
    },
    onError: function(callback) {
      _onOkCallBack = callback;
      return this;
    }
  };
}

config.webhooks.notifypartner = notifypartner;
exports.notifypartner = notifypartner;
