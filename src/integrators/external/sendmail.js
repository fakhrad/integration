const config = require("../../config");
const uuidv4 = require("uuid/v4");
function sendmail() {
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
      if (space) {
        if (!configuration) configuration = {};
        if (!configuration.to) configuration.to = data.fields.email;
        sendRPCMessage(
          channel,
          {
            body: {
              spaceId: space._id.toString(),
              clientId: space._id.toString(),
              contentType: contentType._id.toString(),
              data: data,
              userId: userId.toString(),
              message: configuration
            }
          },
          "sendEmailMessage"
        ).then(result => {
          var obj = JSON.parse(result.toString("utf8"));
          if (!obj.success) console.log(obj);
          else console.log("Email sent");
        });
      }
    } catch (ex) {
      console.log(ex);
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

config.webhooks.sendmail = sendmail;
exports.sendmail = sendmail;
