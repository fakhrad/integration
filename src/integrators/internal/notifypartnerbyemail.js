const config = require("../../config");
const uuidv4 = require("uuid/v4");
const Partners = require("../../models/content");
const Tokens = require("../../models/token");
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
                _onError(obj, undefined);
                console.log(obj);
              } else {
                console.log("Email message sent");
                _onOk(undefined, obj);
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
