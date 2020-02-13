const config = require("../../config");
const Contents = require("../../models/content");
const ContentTypes = require("../../models/contentType");
const uuidv4 = require("uuid/v4");
const async = require("async");
function submitoffer() {
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

  var changestage = function (
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

  var publish_content = function (channel, obj, objId, stage, callback) {
    try {
      console.log("Publish content started");

      sendRPCMessage(
        channel,
        {
          body: {
            id: objId
          },
          userId: obj.sys.issuer,
          spaceId: obj.sys.spaceId
        },
        "publishcontent"
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
      console.log("data : ", JSON.stringify(data));
      console.log("configuration : ", JSON.stringify(configuration));
      console.log("space : ", JSON.stringify(space));
      async.parallel(
        {
          publish: function (callback) {
            publish_content(
              channel,
              data,
              data._id,
              configuration.request_stage,
              callback
            );
          },
          changerequesttoofferrecieved: function (callback) {
            changestage(
              channel,
              space._id,
              userId,
              data,
              data.fields.requestid ? data.fields.requestid : data.fields.loan,
              configuration.request_stage,
              callback
            );
          },
          approveoffer: function (callback) {
            changestage(
              channel,
              space._id,
              userId,
              data,
              data._id,
              configuration.offer_stage,
              callback
            );
          }
        },
        (error, results) => { }
      );
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

config.webhooks.submitoffer = submitoffer;
exports.submitoffer = submitoffer;
