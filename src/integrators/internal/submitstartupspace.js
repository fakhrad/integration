const config = require("../../config");
const Contents = require("../../models/content");
const ContentTypes = require("../../models/contentType");
const uuidv4 = require("uuid/v4");
const async = require("async");
function submitstartupspace() {
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

  var submittopartners = function(
    broker,
    reqtype,
    stage,
    spoid,
    obj,
    callback
  ) {
    Contents.find({
      contentType: "5d358ebc8e6e9a0017c28fc9",
      status: "published",
      "sys.spaceId": obj.sys.spaceId,
      "fields.city": obj.fields.city
    })
      .select("_id name status fields")
      .exec((err, cts) => {
        if (err) {
          callback(err, undefined);
        } else {
          for (i = 0; i < cts.length; i++) {
            try {
              var content = cts[i];
              // var wf = obj.fields.workingfield ? obj.fields.workingfield : [];
              var match = true;
              // console.log(wf);
              // if (content.fields) {
              //   if (content.fields.workingfields) {
              //     console.log(content.fields.workingfields);
              //     for (i = 0; i < wf.length; i++) {
              //       if (content.fields.workingfields.indexOf(wf[i]) != -1)
              //         match = true;
              //     }
              //   }
              // } else console.log("content.fields is null");
              if (match) {
                var fields = {};
                fields.name = {
                  fa: obj.fields.name,
                  en: obj.fields.name
                };
                fields.stage = stage;
                fields.partnerid = content._id;
                fields.requestid = obj._id;
                var request = new Contents({
                  fields: fields,
                  contentType: spoid
                });
                sendRPCMessage(
                  channel,
                  {
                    body: request,
                    userId: obj.sys.issuer,
                    spaceId: obj.sys.spaceId
                  },
                  "submitcontent"
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
              }
            } catch (ex) {
              console.log(ex);
            }
          }
        }
      });

    callback(undefined, obj);
  };

  var changerequeststage = function(channel, obj, objId, stage, callback) {
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
          userId: obj.sys.issuer,
          spaceId: obj.sys.spaceId
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
  function _call(channel, space, userId, contentType, data, configuration) {
    try {
      async.parallel(
        {
          changerequesttoofferrecieved: function(callback) {
            changerequeststage(
              channel,
              data,
              data.fields.requestid,
              "5d7e582415586f0017d4836c",
              callback
            );
          },
          approveoffer: function(callback) {
            changestage(
              channel,
              data,
              data._id,
              "5d7b968918a6400017ee1513",
              callback
            );
          }
        },
        (error, results) => {
          _onOk(results);
        }
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

config.webhooks.submitstartupspace = submitstartupspace;
exports.submitstartupspace = submitstartupspace;
