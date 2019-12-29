const config = require("../../config");
const uuidv4 = require("uuid/v4");
const axios = require('axios')
function webservicecall() {
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

  function callWebservice(
    callback,
    apiRoot,
    url,
    method,
    data,
    invalid_response_error,
    apicall_error,
    token
  ) {
    var config = {
      url: url,
      baseURL: apiRoot,
      method: method,
      headers: {
        Authorization: "Bearer " + token
      },
      params: data
    };
    if (method == "get") config.query;
    else config.data = data;
    //console.log(config);
    axios(config)
      .then(function (response) {
        if (response && response.data) {
          var output = response.data;
          callback(undefined, output);
        } else callback({ error: error, code: invalid_response_error }, undefined);
      })
      .catch(function (error) {
        callback(
          { error: JSON.stringify(error), code: apicall_error },
          undefined
        );
      });
  }

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
      if (space) {
        if (!configuration) configuration = {};
        console.log(email);
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

config.webhooks.webservicecall = webservicecall;
exports.webservicecall = webservicecall;
