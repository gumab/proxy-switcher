const proxy = require("node-tcp-proxy");
const express = require('express')
const path = require("path");
const proxyHost = "192.168.0.11";
const proxyPort = 9090;
const internetProxyHost = "localhost"
const internetProxyPort = 3128
const isPortReachable = require('is-port-reachable')

const status = {
    host: proxyHost,
    port: proxyPort,
    isRunning: false
}
// const internetGate = require('./internetGate')

// internetGate.runServer()

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

const turnOffProxy = (callback) => {
    if (!getStatus().isProxying) {
        callback(getStatus())
        return
    }

    stopProxy()
    status.host = internetProxyHost
    status.port = internetProxyPort

    setTimeout(() => {
        runProxy()
        callback(getStatus())
    }, 1000)
}

const turnOnProxy = (callback) => {
    if (getStatus().isProxying) {
        callback(getStatus())
        return
    }

    stopProxy()
    status.host = proxyHost
    status.port = proxyPort

    setTimeout(() => {
        runProxy()
        callback(getStatus())
    }, 1000)
}

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
    turnOnProxy((status) => {
        res.json(status)
    })
})

app.get('/off', (req, res) => {
    turnOffProxy((status) => {
        res.json(status)
    })
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


let successCount = 0
let errorCount = 0

async function checkConnection() {
    if (await isPortReachable(9090, { host: '192.168.0.11', timeout: 500 })) {
        if (successCount < 10)
            successCount++
        errorCount = 0
    } else {
        successCount = 0
        if (errorCount < 10)
            errorCount++
    }
    // console.log(errorCount, successCount)

    if (errorCount > 5 && getStatus().isProxying) {
        console.log('Proxy seems to have stopped. Stop proxing...')
        turnOffProxy((status) => {
            console.log(status)
        })
    } else if (successCount > 5 && !getStatus().isProxying) {
        console.log('Proxy seems to have startted. Start proxing...')
        turnOnProxy((status) => {
            console.log(status)
        })
    }

    //   let res = await connection.exec('uptime')
    //   console.log('async result:', res)
}

function runChecker() {
    checkConnection()
    setTimeout(() => {
        runChecker()
    }, 1000)
}


runChecker()
