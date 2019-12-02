const config = require("../../config");
const Contents = require("../../models/content");
const ContentTypes = require("../../models/contentType");
const uuidv4 = require("uuid/v4");
const async = require("async");
function submitloanoffer() {
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

  var changestage = function(
    channel,
    spaceId,
    userId,
    obj,
    objId,
    stage,
    callback
  ) {
    try {
      sendRPCMessage(
        channel,
        {
          body: {
            id: objId,
            fields: {
              stage: stage
            }
          },
          userId: userId,
          spaceId: spaceId
        },
        "partialupdatecontent"
      ).then(result => {
        var obj = JSON.parse(result.toString("utf8"));
        if (!obj.success) {
          if (obj.error) {
            callback(err, undefined);
            return;
          }
        } else {
          //do mach making and submit to partners
          callback(undefined, obj);
        }
      });
    } catch (ex) {
      console.log(ex);
    }
    callback(undefined, obj);
  };

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
      console.log(
        JSON.stringify(
          data.fields.loan ? data.fields.loan : data.fields.requestid
        )
      );
      async.parallel(
        {
          changerequesttoofferrecieved: function(callback) {
            changestage(
              channel,
              space._id,
              userId,
              data,
              data.fields.loan ? data.fields.loan : data.fields.requestid,
              "5d3fc30a7029a500172c5c3f",
              callback
            );
          },
          approveoffer: function(callback) {
            changestage(
              channel,
              space._id,
              userId,
              data,
              data._id,
              "5d514934780b9c00170233e8",
              callback
            );
          }
        },
        (error, results) => {}
      );
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

config.webhooks.submitloanoffer = submitloanoffer;
exports.submitloanoffer = submitloanoffer;
