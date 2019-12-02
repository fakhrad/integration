const config = require("../../config");
const uuidv4 = require("uuid/v4");
function change_stage() {
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
      sendRPCMessage(
        channel,
        {
          body: {
            id: data._id,
            fields: {
              stage: configuration.stage
            }
          },
          userId: userId,
          spaceId: space._id
        },
        "partialupdatecontent"
      ).then(result => {
        var obj = JSON.parse(result.toString("utf8"));
        if (!obj.success) {
          if (obj.error) {
            _onError(obj);
            return;
          }
        } else {
          _onOk(result);
        }
      });
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

config.webhooks.change_stage = change_stage;
exports.change_stage = change_stage;
