const pi = require('../../index');
const app = new pi();

app.start().then(server => {
	console.log(`Inicializado: http://${server.host}:${server.port}`);
}).catch(err => {
	Promise.reject(err);
});

module.exports = app;