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
    self.readyState = 0;
    self.socket = new WebSocket(url);

    self.socket.onmessage = function(event) {
      self.readyState = self.socket.readyState;
      var data = event.data;

      if (typeof data === 'string') data = JSON.parse(event.data);

      event.data = data;

      self.onmessage && self.onmessage(event);
    }

    self.socket.onopen = function(event) {
      self.readyState = self.socket.readyState;
      while (self.messageQueue.length !== 0) {
        var data = self.messageQueue.shift();
        self._send(data);
      }
//      console.log('ws: open: ', event, self);
      self.onopen && self.onopen(event);
    }

    self.socket.onclose = function(event) {
      self.readyState = self.socket.readyState;
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
  if (typeof data !== 'string') data = JSON.stringify(data);
  this.socket.send(data);
}

WebSocketWrapper.prototype.send = function(data){
  if (this.socket.readyState === WebSocket.OPEN && this.messageQueue.length === 0) {
    this._send(data);
  } else {
    this.messageQueue.push(data);
  }
}

WebSocketWrapper.prototype.canSendWhileConnecting = true;
WebSocketWrapper.prototype.canSendJSON = true;
WebSocketWrapper.prototype.CONNECTING = 0;
WebSocketWrapper.prototype.OPEN = 1;
WebSocketWrapper.prototype.CLOSING = 2;
WebSocketWrapper.prototype.CLOSED = 3;

// Meybe need to use reconnection timing algorithm from
// http://blog.johnryding.com/post/78544969349/how-to-reconnect-web-sockets-in-a-realtime-web-app

racer.Model.prototype._createSocket = function(bundle) {
  var loc = window.location;
  var protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
  var base = CLIENT_OPTIONS.base;
  return new WebSocketWrapper(protocol + '//' + loc.host + base, CLIENT_OPTIONS);
};
