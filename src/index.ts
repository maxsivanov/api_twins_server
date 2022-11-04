import { getApp } from './app';
import http from 'http';
const port = normalizePort(process.env.PORT || '3000');

async function start() {
    const app = await getApp();
    app.set('port', port);
    const server = http.createServer(app);
    const onListening = () => {
        const addr = server.address();
        if (!addr) {
            return;
        }
        const bind = typeof addr === 'string'
            ? 'pipe ' + addr
            : 'port ' + addr.port;
        console.log('Listening on ' + bind);
    };
    server.listen(port);
    server.on('error', onError);
    server.on('listening', onListening);
}

start();

function normalizePort(val: string) {
    const port = parseInt(val, 10);
    if (isNaN(port)) {
        // named pipe
        return val;
    }
    if (port >= 0) {
        // port number
        return port;
    }
    return false;
}

function onError(error: NodeJS.ErrnoException) {
    if (error.syscall !== 'listen') {
        throw error;
    }

    const bind = typeof port === 'string'
        ? 'Pipe ' + port
        : 'Port ' + port;

    // handle specific listen errors with friendly messages
    switch (error.code) {
    case 'EACCES':
        console.error(bind + ' requires elevated privileges');
        process.exit(1);
        break;
    case 'EADDRINUSE':
        console.error(bind + ' is already in use');
        process.exit(1);
        break;
    default:
        throw error;
    }
}


