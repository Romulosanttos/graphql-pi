const util = require('util');
const crypto = require('crypto');
const Memcached = require('memcached');

/**
 * @class Cache
 * @author Luciano Tavernard <luciano.tavernard@sigmast.com.br>
 */

class Cache {
	
	constructor({ MEMCACHED_URI } = {}, options = {}) {
		this.options = options;
		this.cache = new Memcached(MEMCACHED_URI);
	}

	/**
	 * Responsavel por iniciar o módulo
	 * @returns {Promise<string>} o módulo instanciado
	 */
	start() {
		return new Promise((resolve, reject) => {
			try {
				resolve(this.fromCached(this.cache));
			} catch (error) {
				reject(error);
			}
		});
	}

	wrapper(memcached) {
		memcached.__get = memcached.get;
		memcached.__set = memcached.set;

		memcached.get = util.promisify(memcached.__get);
		memcached.set = util.promisify(memcached.__set);

		return memcached;
	}

	fromCached(memcached, { app = 'App', separator = '|' } = {}) {
		const memcachedWrapped = this.wrapper(memcached);

		return function getFromMemcachedFirst(
			{ key, prefix = 'Database', suffix = '' },
			getFunc = null
		){
			const hash = crypto.createHash('md5');
			hash.update([ app, prefix, key, suffix ].join(separator));
			const keyFull = hash.digest('hex');

			return memcachedWrapped.get(keyFull)
				.catch(() => null)
				.then(dataFromMemcached => {
					if(dataFromMemcached) return dataFromMemcached;
					if(!getFunc) return null;

					return getFunc()
						.then(data => {
							memcached.set(keyFull, data, 30);
							return data;
						});
				});
		};
	}
}

module.exports = Cache;