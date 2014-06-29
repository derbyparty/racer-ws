var racer = require('racer');

var CLIENT_OPTIONS =JSON.parse('{{clientOptions}}');

function Socket(url, options) {
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

Socket.prototype.send = function(data){
  if (this.socket.readyState === WebSocket.OPEN) {
    this.socket.send(JSON.stringify(data));
  } else {
    this.queue.push(data);
  }
}

// Reconection timing algorithm
// http://blog.johnryding.com/post/78544969349/how-to-reconnect-web-sockets-in-a-realtime-web-app

racer.Model.prototype._createSocket = function(bundle) {
  var loc = window.location;
  var protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
  return new Socket(protocol + '//' + loc.host + '/', CLIENT_OPTIONS);
};
