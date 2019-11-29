const config = require("../../config");
const uuidv4 = require("uuid/v4");
function sendKavenegarSms() {
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
      console.log("Sending sms started : " + JSON.stringify(data));
      try {
        if (space) {
          if (!configuration) configuration = {};
          sendRPCMessage(
            channel,
            {
              body: {
                clientId: space._id,
                contentType: contentType,
                data: data,
                phoneNumber: data.fields.phoneNumber
                  ? data.fields.phoneNumber
                  : data.fields.phonenumber,
                userId: userId,
                message: configuration.message
              }
            },
            "sendSmsMessage"
          ).then(result => {
            var obj = JSON.parse(result.toString("utf8"));
            if (!obj.success) console.log(obj);
            else console.log("Sms sent");
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

config.webhooks.sendKavenegarSms = sendKavenegarSms;
exports.sendKavenegarSms = sendKavenegarSms;
