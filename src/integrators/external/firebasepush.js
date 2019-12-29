const config = require("../../config");
const uuidv4 = require("uuid/v4");
function sendFirebasepush() {
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
    console.log("Firebase push message. Starting....");
    console.log("data : ", JSON.stringify(data));
    console.log("configuration : ", JSON.stringify(configuration));
    console.log("space : ", JSON.stringify(space));
    console.log("token : ", JSON.stringify(token));
    console.log("userId : ", userId);
    try {
      if (space) {
        if (!configuration) configuration = {};
        var bd = {
          clientId: space._id.toString(),
          device: token.deviceToken,
          contentType: contentType ? contentType._id.toString() : "",
          data: undefined,
          userId: userId.toString(),
          message: configuration
        }
        console.log(bd);
        sendRPCMessage(
          channel,
          {
            body: bd
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

config.webhooks.sendFirebasepush = sendFirebasepush;
exports.sendFirebasepush = sendFirebasepush;
