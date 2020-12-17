var http = require('http');
var httpProxy = require('http-proxy');
var url = require('url');
var net = require('net');

var server = http.createServer(onReq);
server.addListener('connect', (req, socket, bodyHead) => {
        console.log(req.url)
        handleClient(socket)
});
server.listen(8080);

function onReq(client_req, client_res) {
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

function onConn(req, socket, bodyhead) {
        var hostPort = getHostPortFromString(req.url, 443);
        var hostDomain = hostPort[0];
        var port = parseInt(hostPort[1]);
        // console.log(req)
        console.log("Proxying HTTPS request for:", hostDomain, port);
        var options = {
                port: 9090,
                host: '192.168.0.11'
        };

        var proxySocket = new net.Socket();
        proxySocket.connect(options, function () {
                console.log('connected')
                proxySocket.write(bodyhead);
                socket.write("HTTP/" + req.httpVersion + " 200 Connection established\r\n\r\n");
        });

        proxySocket.on('data', function (chunk) {
                console.log(chunk.toString());
                socket.write(chunk);
        });

        proxySocket.on('end', function () {
                socket.end();
        });

        proxySocket.on('error', function () {
                socket.write("HTTP/" + req.httpVersion + " 500 Connection error\r\n\r\n");
                socket.end();
        });

        socket.on('data', function (chunk) {
                //console.log(chunk.toString());
                proxySocket.write(chunk);
        });

        socket.on('end', function () {
                proxySocket.end();
        });

        socket.on('error', function () {
                proxySocket.end();
        });
}

{
}

var regex_hostport = /^([^:]+)(:([0-9]+))?$/;

var getHostPortFromString = function (hostString, defaultPort) {
        var host = hostString;
        var port = defaultPort;
        var result = regex_hostport.exec(hostString);
        if (result != null) {
                host = result[1];
                if (result[2] != null) { port = result[3]; }
        }
        return ([host, port]);
};


function uniqueKey(socket) {
        var key = socket.remoteAddress + ":" + socket.remotePort;
        return key;
}

var proxySockets = {}
var writeBuffer = function(context) {
        context.connected = true;
        if (context.buffers.length > 0) {
            for (var i = 0; i < context.buffers.length; i++) {
                context.serviceSocket.write(context.buffers[i]);
            }
        }
    };
var createServiceSocket = function (context) {
        var options = {
                port: 9090,
                host: '192.168.0.11'
        };

        context.serviceSocket = new net.Socket();
        // console.log(options)
        context.serviceSocket.connect(options, function () {
                writeBuffer(context);
        });
        context.serviceSocket.on("data", function (data) {
                context.proxySocket.write(data);
        });
        context.serviceSocket.on("close", function (hadError) {
                context.proxySocket.destroy();
        });
        context.serviceSocket.on("error", function (e) {
                context.proxySocket.destroy();
        });
};

var handleClient = function (proxySocket) {
        var key = uniqueKey(proxySocket);
        console.log(key)
        proxySockets[key] = proxySocket;
        var context = {
                buffers: [],
                connected: false,
                proxySocket: proxySocket
        };
        proxySocket.on("data", function (data) {
                console.log(context.connected)
                if (context.connected) {
                        context.serviceSocket.write(data);
                } else {
                        context.buffers[context.buffers.length] = data;
                        if (context.serviceSocket === undefined) {
                                createServiceSocket(context);
                        }
                }
        });
        proxySocket.on("close", function (hadError) {
                delete proxySockets[uniqueKey(proxySocket)];
                if (context.serviceSocket !== undefined) {
                        context.serviceSocket.destroy();
                }
        });
        proxySocket.on("error", function (e) {
                context.serviceSocket.destroy();
        });
};