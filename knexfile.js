// Update with your config settings.
const utils = require('./lib/util');
const path = require('path');
const knexCwd = process.env.KNEX_CWD || process.cwd();
const envs = utils.GetEnvs({ envPath: knexCwd });

const package = require(path.resolve(knexCwd, 'package.json'));

module.exports = {
	client: 'postgresql',
	connection: {
		database: envs.POSTGRES_DATABASE || package.name || 'base',
		user: envs.POSTGRES_USERNAME || 'postgres',
		password: envs.POSTGRES_PASSWORD || '',
		port: envs.POSTGRES_PORT || 5432,
		host: envs.POSTGRES_HOST || 'localhost'
	},
	pool: {
		min: 2,
		max: 10
	},
	migrations: {
		tableName: 'knex_migrations',
		directory: path.resolve(knexCwd, 'db', 'migrations')
	},

	seeds: {
		directory: path.resolve(knexCwd, 'db', 'seeds')
	}
};
