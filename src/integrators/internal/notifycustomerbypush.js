
const config = require("../../config");
const uuidv4 = require("uuid/v4");
const Customers = require("../../models/content");
const Tokens = require("../../models/token");
function notifycusomterbysms() {
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
        Customers.findById(data.fields.loan ? data.fields.loan : data.fields.requestid).exec((err, customer) => {
          if (
            err ||
            !customer ||
            (customer && !customer.fields) ||
            (customer &&
              customer.fields &&
              !(customer.fields.phoneNumber || customer.fields.phonenumber))
          ) {
            _onError(err, undefined);
          } else {
            sendRPCMessage(
              channel,
              {
                body: {
                  clientId: space._id,
                  contentType: contentType,
                  data: data,
                  phonenumber: customer.fields.phoneNumber
                    ? customer.fields.phoneNumber
                    : customer.fields.phonenumber,
                  userId: userId,
                  message: configuration.message,
                  template: configuration.template || "offerissued"
                }
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

config.webhooks.notifycusomterbysms = notifycusomterbysms;
exports.notifycusomterbysms = notifycusomterbysms;
