var racer = require('racer');

var CLIENT_OPTIONS =JSON.parse('{{clientOptions}}');

// Need to use wrapper because:
// 1 - to handle disconnections
// 2 - to parse/stringify JSON
// 3 - to extract data from event (make interface like in browserchannel)
// 4 - to save messages and send them when socket.readyState === WebSocket.OPEN

function WebSocketWrapper(url, options) {
  var self = this;

  self.queue = [];

  function createWebSocket () {
    self.socket = new WebSocket(url);

    self.socket.onmessage = function(event) {
      var data = JSON.parse(event.data);
      self.onmessage && self.onmessage(data);
    }

    self.socket.onopen = function(event) {
      while (self.queue.length !== 0) {
        var data = self.queue.shift();
        self.send(data);
      }
      console.log('ws: open: ', event, self);
      self.onopen && self.onopen(event);
    }

    self.socket.onclose = function(event) {
      console.log('ws: close: ', event, self);
      self.onclose && self.onclose(event);

      if (options.reconnect) {
        setTimeout(function () {
          createWebSocket();
        }, 10000);
      }
    }
  }

  createWebSocket();
}

WebSocketWrapper.prototype.send = function(data){
  if (this.socket.readyState === WebSocket.OPEN) {
    this.socket.send(JSON.stringify(data));
  } else {
    this.queue.push(data);
  }
}

// Meybe need to use reconnection timing algorithm from
// http://blog.johnryding.com/post/78544969349/how-to-reconnect-web-sockets-in-a-realtime-web-app

racer.Model.prototype._createSocket = function(bundle) {
  var loc = window.location;
  var protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
  var base = CLIENT_OPTIONS.base || '/channel';
  return new WebSocketWrapper(protocol + '//' + loc.host + base, CLIENT_OPTIONS);
};
