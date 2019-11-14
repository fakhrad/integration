module.exports = {
  space: {},
  contentType: {},
  token: {},
  data: {},
  getWebhooks: function(contentType, eventName) {
    if (this.space && contentType) {
      var webhooks = [];
      for (i = 0; i < this.space.webhooks.length; i++) {
        if (
          (this.space.webhooks[i].event =
            eventName &&
            (!this.space.webhooks[i].contentType ||
              (this.space.webhooks[i].contentType &&
                this.space.webhooks[i].contentType.toString() ==
                  contentType.toString())))
        ) {
          webhooks.push(wh);
        }
      }
      return webhooks;
    }
  }
};
