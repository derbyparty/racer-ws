var racer = require('racer');

var CLIENT_OPTIONS =JSON.parse('{{clientOptions}}');

// Need to use wrapper because:
// 1 - to handle disconnections
// 2 - to parse/stringify JSON
// 3 - to extract data from event (make interface like in browserchannel)
// 4 - to save messages and send them when socket.readyState === WebSocket.OPEN

function WebSocketWrapper(url, options) {
  var self = this;

  self.messageQueue = [];

  function createWebSocket () {
    self.socket = new WebSocket(url);

    self.socket.onmessage = function(event) {
      var data;

      if (typeof event.data === 'string') {
        try {
          data = JSON.parse(event.data);
        } catch (e){
          data = '';
        }
      } else {
        data = event.data;
      }

      self.onmessage && self.onmessage(data);
    }

    self.socket.onopen = function(event) {
      while (self.messageQueue.length !== 0) {
        var data = self.messageQueue.shift();
        self._send(data);
      }
//      console.log('ws: open: ', event, self);
      self.onopen && self.onopen(event);
    }

    self.socket.onclose = function(event) {
      console.log('WebSocket: connection is broken', event);
      self.onclose && self.onclose(event);

      if (options.reconnect) {
        setTimeout(function () {
          createWebSocket();
        }, options.timeout || 10000);
      }
    }
  }

  createWebSocket();
}
WebSocketWrapper.prototype._send = function(data){
  this.socket.send(JSON.stringify(data));
}

WebSocketWrapper.prototype.send = function(data){
  if (this.socket.readyState === WebSocket.OPEN && this.messageQueue.length === 0) {
    this._send(data);
  } else {
    this.messageQueue.push(data);
  }
}

// Meybe need to use reconnection timing algorithm from
// http://blog.johnryding.com/post/78544969349/how-to-reconnect-web-sockets-in-a-realtime-web-app

racer.Model.prototype._createSocket = function(bundle) {
  var loc = window.location;
  var protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
  var base = CLIENT_OPTIONS.base;
  return new WebSocketWrapper(protocol + '//' + loc.host + base, CLIENT_OPTIONS);
};
