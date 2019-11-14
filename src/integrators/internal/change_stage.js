var broker = require("../../rpcserver");
const config = require("../../config");
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
  function _call(channel, space, userId, contentType, data, stage) {
    try {
      sendRPCMessage(
        channel,
        {
          body: {
            id: data._id,
            fields: {
              stage: stage
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

exports.change_stage = change_stage;
