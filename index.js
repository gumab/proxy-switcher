const proxy = require("node-tcp-proxy");
const express = require('express')
const path = require("path");
const proxyHost = "192.168.0.11";
const proxyPort = 9090;
const internetProxyHost = "localhost"
const internetProxyPort = 8081

const status = {
    host: proxyHost,
    port: proxyPort,
    isRunning: false
}
const internetGate = require('./internetGate')

internetGate.runServer()

var proxyServer

const runProxy = () => {
    status.isRunning = true
    proxyServer = proxy.createProxy(9090, [status.host], [status.port]);
}

const stopProxy = () => {
    if (proxyServer) {
        status.isRunning = false
        proxyServer.end()
        proxyServer = null
    }
}

runProxy()

const app = express()

app.set('views', path.join(__dirname, './client'))
app.set('view engine', 'ejs')

app.get('/', (req, res, next) => {
    res.render('index')
})
app.get('/status', (req, res) => {
    res.json(getStatus())
})

app.get('/on', (req, res) => {
    stopProxy()
    status.host = proxyHost
    status.port = proxyPort

    setTimeout(() => {
        runProxy()
        res.json(getStatus())
    }, 1000)
})

app.get('/off', (req, res) => {
    stopProxy()
    status.host = internetProxyHost
    status.port = internetProxyPort

    setTimeout(() => {
        runProxy()
        res.json(getStatus())
    }, 1000)
})

const server = app.listen(8080, () => {
    console.log('The web server is running')
})

const getStatus = () => {
    return {
        ...status,
        isProxying: status.host === proxyHost
    }
}