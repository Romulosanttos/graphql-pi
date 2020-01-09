const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');

const util = require('./util');

const Logger = require('./modules/logger');
const Config = require('./modules/config');
const Mongo = require('./modules/mongo');
const Cache = require('./modules/cache');
const Postgres = require('./modules/postgres');
const EmailServer = require('./modules/email');
const { PubSub } = require('graphql-subscriptions');

const Package = require(path.resolve(process.cwd(), 'package.json'));

/**
 * @class Framework
 */
class Framework {
	/**
	 *
	 * @param {Object} [config] - Configurações
	 *
	 * @param {string} [config.envFileUser] - Arquivo env para ser utilizado
	 * @param {string} [config.envFileDefault] - Arquivo env padrão para ser utilizado
	 * @param {{ [varKey: string]: string }} [config.envRename] - Renomear variáveis
	 * @param {{ [varKey: string]: string }} [config.envValues] - Alterar valor de variáveis
	 *
	 * @param {(this: Framework) => Promise} [config.preConfig] - Função a ser executada antes de configurar o servidor
	 * @param {(this: Framework) => Promise} [config.posConfig] - Função a ser executada depois de configurar o servidor
	 *
	 * @param {(this: Framework) => Promise} [config.preInit] - Função a ser executada antes de configurar o servidor
	 * @param {(this: Framework) => Promise} [config.posInit] - Função a ser executada depois de configurar o servidor
	 *
	 * @param {(any) => Promise<any>} [config.authDesserialize]
	 */
	constructor(config = {}) {
		this.config = {
			...{
				envFileUser: '.env',
				envRename: null,
				envValues: null,
				preConfig: null,
				posConfig: null,
				authDesserialize: null
			},
			...config
		};

		this.pkg = Package;
		this.envs = util.GetEnvs(this.config);
		/** @type {Sigma.Server} */
		this.server = express();
		this.server.envs = this.envs;
		this.httpServer = http.createServer(this.server);
		this.promises = [];

		this.server.disable('x-powered-by');

		if (this.envs.LOGGER === 'on') {
			this.promises.push(
				new Logger({ app: this.envs.APP_NAME }).start().then(res => {
					this.logger = res;
					this.logger.attach({ ctx: this.server });
					this.logger.attach({ ctx: this.server.request });
				})
			);
		}

		if (this.envs.POSTGRES === 'on') {
			this.promises.push(
				new Postgres(this)
					.start()
					.then(
						res => (this.server.database = this.server.request.database = res)
					)
			);
		}

		if (this.envs.MONGO === 'on') {
			this.promises.push(
				new Mongo(this).start().then(res => {
					const ret = (this.server.mongo = this.server.request.mongo = res);
					return ret;
				})
			);
		}

		if (this.envs.MEMCACHED === 'on') {
			this.promises.push(
				new Cache(this.envs).start().then(res => (this.server.memcached = res))
			);
		}

		if (this.envs.GRAPHQL === 'on') {
			this.server.pubsub = this.server.request.pubsub = new PubSub();
		}

		if (this.envs.EMAIL === 'on') {
			this.promises.push(
				new EmailServer({
					app: this.envs.APP_NAME,
					from: this.envs.EMAIL_FROM,
					auth: {
						host: this.envs.EMAIL_HOST,
						port: this.envs.EMAIL_PORT,
						user: this.envs.EMAIL_USER,
						pass: this.envs.EMAIL_PASS
					},
					to: this.envs.DEVELOPMENT === 'on' ? this.envs.EMAIL_TEST : null,
					juice: false,
					getTemplate(name) {
						const pathHtml = path.resolve(
							process.cwd(),
							'emails',
							name,
							'html.ejs'
						);
						const pathSubject = path.resolve(
							process.cwd(),
							'emails',
							name,
							'subject.ejs'
						);

						let html = null;
						let subject = null;

						if (fs.existsSync(pathHtml)) {
							html = fs.readFileSync(pathHtml, { encoding: 'UTF-8' });
						}
						if (fs.existsSync(pathSubject)) {
							subject = fs.readFileSync(pathSubject, { encoding: 'UTF-8' });
						}

						return Promise.resolve({
							html,
							subject
						});
					}
					// saveEmail(data){
					// 	app.databaseAux.emails.insertOne({
					// 		date: new Date(),
					// 		...data
					// 	});
					// }
				})
					.start()
					.then(res => (this.server.email = this.server.request.email = res))
			);
		}

		new Config({
			server: this.server,
			envs: this.envs,
			httpServer: this.httpServer
		});
	}

	start() {
		const port = this.envs.TEST === 'on' ? this.envs.TEST_PORT : this.envs.PORT;
		const server = new Promise((resolve, reject) => {
			this.httpServer
				.listen(port)
				.on('listening', () => resolve(this.httpServer))
				.on('error', err => reject(err));
		}).then(server => {
			let address;
			if (server.address().family === 'IPv6') {
				if (server.address().address === '::') {
					address = 'localhost';
				} else {
					address = `[${server.address().address}]`;
				}
			} else {
				address = server.address().address;
			}

			return {
				host: address,
				address: server.address(),
				port: server.address().port,
				server
			};
		});

		return Promise.all([server, ...this.promises]).then(res => res[0]);
	}

	stop() {
		this.httpServer.close();
		return true;
	}
}

module.exports = Framework;
