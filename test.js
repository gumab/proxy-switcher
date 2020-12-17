var http = require('http');

var server = http.createServer(onRequest).listen(8080);
server.addListener('connect', function (req, socket, bodyhead) {
  console.log(req.url)
  })

function onRequest(client_req, client_res) {
  console.log('serve: ' + client_req.url);

  var options = {
    hostname: '192.168.0.11',
    port: 9090,
    path: client_req.url,
    method: client_req.method,
    headers: client_req.headers
  };

  var proxy = http.request(options, function (res) {
    client_res.writeHead(res.statusCode, res.headers)
    res.pipe(client_res, {
      end: true
    });
  });

  client_req.pipe(proxy, {
    end: true
  });
}
