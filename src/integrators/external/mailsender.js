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

  function _call(channel, space, userId, contentType, data, configuration) {
    try {
      var req = JSON.parse(msg.content.toString("utf8"));
      console.log("Sending mail started : " + msg.content.toString("utf8"));
      try {
        if (space) {
          if (!configuration) configuration = {};
          console.log(email);
          sendRPCMessage(
            channel,
            {
              body: {
                spaec: space,
                contentType: contentType,
                data: data,
                userId: userId,
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
    } catch (ex) {
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

config.webhooks.sendmail = sendmail;
exports.sendmail = sendmail;
