const config = require("../../config");
const uuidv4 = require("uuid/v4");
function kavenegarsms() {
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

  var bind = (text, data, user, space) => {
    Object.keys(data).forEach(key => {
      var value = data[key];
      if (typeof value == "object") {
        Object.keys(value).forEach(key1 => {
          var value1 = value[key1];
          if (value1) {
            text = text.replace(
              "{@" + key + "." + key1 + "}",
              value1.toString()
            );
          }
        });
      } else if (value) {
        text = text.replace("{@" + key + "}", value.toString());
      }
    });
    console.log(text);
    console.log(text);
    text = text.replace("{@appName}", space.name);
    console.log(text);
    return text;
  };
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
      console.log("Sending sms started : " + JSON.stringify(data));
      try {
        if (space) {
          if (!configuration) configuration = {};
          var body = {
            clientId: space._id,
            contentType: contentType,
            data: data,
            phonenumber: data.fields.phoneNumber
              ? data.fields.phoneNumber
              : data.fields.phonenumber,
            phoneNumber: data.fields.phoneNumber
              ? data.fields.phoneNumber
              : data.fields.phonenumber,
            userId: userId,
            message: bind(configuration.message, data, userId, space),
            template: configuration.template
          };
          sendRPCMessage(
            channel,
            {
              body: body
            },
            "sendSmsWithTemplateMessage"
          ).then(result => {
            var obj = JSON.parse(result.toString("utf8"));
            if (!obj.success) {
              _onError(obj, undefined);
              console.log(obj);
            } else {
              console.log("Sms message sent");
              _onOk(undefined, obj);
            }
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

config.webhooks.kavenegarsms = kavenegarsms;
exports.kavenegarsms = kavenegarsms;
