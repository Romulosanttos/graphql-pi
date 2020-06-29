const knex = require('knex');
const knexHooks = require('knex-hooks');

/**
 * @class Mongo
 * @author Luciano Tavernard <luciano.tavernard@sigmast.com.br>
 */

class Postgres {
	constructor(framework = {}) {
		const config = framework.envs;
		this.config = {
			client: 'pg',
			connection: {
				host: config.POSTGRES_HOST,
				user: config.POSTGRES_USERNAME,
				password: config.POSTGRES_PASSWORD,
				database: config.POSTGRES_DATABASE || framework.pkg.name
			},
			debug: config.POSTGRES_LOG === 'on',
			pool: {
				min: parseInt(config.POSTGRES_POOL_MIN, 10),
				max: parseInt(config.POSTGRES_POOL_MAX, 10)
			}
		};
	}

	/**
	 * Responsavel por iniciar o módulo
	 * @returns {Promise<string>} o módulo instanciado
	 */
	start() {
		return new Promise((resolve, reject) => {
			try {
				resolve(knexHooks(knex(this.config)));
			} catch (error) {
				reject(error);
			}
		});
	}
}

module.exports = Postgres;
