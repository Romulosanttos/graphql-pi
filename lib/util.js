const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const dotenvExpand = require('dotenv-expand');

/**
 * @class Util
 */
class Util {
	static get wrappers(){
		return {
			Envs(envs, newNames){
				if(!envs) return {};
				if(!newNames) return envs;

				return new Proxy(envs, {
					get(t, p){
						if(newNames[p]){
							return t[newNames[p]];
						}else{
							return t[p];
						}
					}
				});
			},
		};
	}

	/**
	 * Parse envs from files
	 * @param {Object} config
	 * @param {string} config.envFile
	 * @param {Object} config.envRename
	 * @param {Object} config.envValues
	 * @param {string} config.envPath
	 * @param {boolean} wrapper
	 * @returns {Object} envs
	 */
	static GetEnvs({
		envFile = '.env', envRename, envValues, envPath
	} = {}, wrapper = true){
		const pathEnvRoot = envPath || process.cwd();
		const pathEnvUser = path.resolve(pathEnvRoot, envFile);
		const pathEnvDefault = path.resolve(__dirname, '..', '.env');

		const envsUser = dotenvExpand(dotenv.config({
			path: pathEnvUser
		}));

		const envsDefault = dotenvExpand(dotenv.config({
			path: pathEnvDefault
		}));

		let envs = { ...envsDefault.parsed, ...envsUser.parsed };

		if(envRename){
			for(const [keyOld, keyNew] of Object.entries(envRename)){
				envs[keyNew] = envs[keyOld];
				delete envs[keyOld];
			}
		}
		if(envValues){
			envs = { ...envs, ...envValues };
		}
		if(wrapper){
			return this.wrappers.Envs(envs, envRename);
		}else{
			return envs;
		}
	}

	static waitTime(time = 10000, value = true) {
		return new Promise(resolve => setTimeout(resolve, time, value));
	}

	static recursiveRead(dir) {
		return fs.readdirSync(dir)
			.reduce((files, file) =>
				fs.statSync(path.join(dir, file)).isDirectory() ?
					files.concat(this.recursiveRead(path.join(dir, file))) :
					files.concat(path.join(dir, file)),
			[]);
	}
}

module.exports = Util;