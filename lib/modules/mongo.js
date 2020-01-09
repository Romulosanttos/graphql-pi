const mongodb = require('mongodb').MongoClient;

/**
 * @class Mongo
 * @author Luciano Tavernard <luciano.tavernard@sigmast.com.br>
 */

class Mongo {

	constructor(config = {}, options = {}) {
		this.config = config.envs;
		this.options = options;
	}

	/**
	 * Responsavel por iniciar o módulo
	 * @returns {Promise<string>} o módulo instanciado
	 */
	start() {
		return new Promise((resolve, reject) => {
			mongodb.connect(this.config.MONGO_URI, {
				auth: {
					user: this.config.MONGO_USERNAME,
					password: this.config.MONGO_PASSWORD,
					authSource: this.config.MONGO_AUTH
				},
				useNewUrlParser: true
			})
				.then(connection => connection.db(this.config.MONGO_DATABASE))
				.then(db => resolve(this.wrapper(db)))
				.catch(err => reject(err));
		});
	}

	wrapper(dbmongo) {
		return new Proxy(dbmongo, {
			get(target, key) {
				return target[key] || target.collection(key);
			}
		});
	}
}

module.exports = Mongo;