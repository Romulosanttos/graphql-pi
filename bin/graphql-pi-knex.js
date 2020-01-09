#!/usr/bin/env node

/* eslint-disable */
const { exec } = require('child_process');
const Program = require('commander');
const path = require('path');

process.env.KNEX_CWD = process.cwd();

Program.parse(process.argv);

const options = Program.args;

if (!options.length) {
	console.log('Option required');
	process.exit(1);
}

options.push(`--knexfile=${path.resolve(__dirname, '..', 'knexfile.js')}`);
const knex = exec(`npx knex ${options.join(' ')}`, { cwd: process.cwd() });

console.log(`npx knex ${options.join(' ')}`);
knex.stdout.on('data', function (data) {
	console.log('knex: ' + data.toString());
});

knex.stderr.on('data', function (data) {
	console.log('knex: ' + data.toString());
});

knex.on('error', function (code) {
	console.log('knex: ' + code.toString());
});
