#!/usr/bin/env node

/* eslint-disable */
const Program = require('commander');
const path = require('path');
const fs = require('fs');

Program.parse(process.argv);

const options = Program.args;

if (!options.length) {
	console.log('Option required');
	process.exit(1);
}

options.forEach(option => {
	if (option === 'env') {
		create_env();
	}
})

function create_env() {
	const src = path.resolve(__dirname, '..', 'template', '.env');
	const dest = path.resolve(process.cwd(), '.env.example');
	const env = path.resolve(process.cwd(), '.env');

	fs.copyFileSync(src, dest);
	console.log('env.example criado com sucesso');

	try {
		fs.writeFileSync(env, '', { flag: 'wx' });
		console.log('env criado com sucesso');
	} catch (err) {
		console.log('env já existe');
	}
}
