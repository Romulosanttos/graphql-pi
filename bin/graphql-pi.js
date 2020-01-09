#!/usr/bin/env node

const pkg = require('../package.json');
const Program = require('commander');

Program
	.version(pkg.version)
	.command('create <option>', 'Cria arquivo', /^(env)$/i)
	.command('knex <option>', 'knex')
	.parse(process.argv);
