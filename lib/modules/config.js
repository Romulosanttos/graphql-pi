// eslint temporariamente no arquivo enquanto o log não é feito
/* eslint-disable */
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const express = require('express');
const bodyParser = require('body-parser');
const compression = require('compression');
const graphqlHTTP = require('express-graphql');
const { graphqlUploadExpress, GraphQLUpload } = require('graphql-upload');
const { SubscriptionServer } = require('subscriptions-transport-ws');
const {
	printSchema,
	GraphQLSchema,
	introspectionQuery,
	graphql,
	GraphQLObjectType,
	execute,
	subscribe
} = require('graphql');
const util = require('../util');

/**
 * @class Config
 * @author Rômulo Cabral Santos <romulosanttos1@gmail.com>
 */

class Config {
	constructor({ server, envs, httpServer }) {
		this.server = server;
		this.envs = envs;
		this.httpServer = httpServer;

		this.server.use(cors());
		this.server.use(compression());
		this.server.use(bodyParser.urlencoded({ extended: true }));
		this.server.use(bodyParser.json());
		this.server.use(
			this.envs.PUBLIC_URL,
			express.static(this.envs.STORAGE_DIR)
		);

		if (this.envs.DEVELOPMENT === 'on') {
			this.server.get('/welcome', (req, res) => {
				res.send('Welcome to the graphql-pi!');
			});
		}

		if (this.envs.AUTHENTICATION === 'on') {
			this.server.use((req, res, next) => {
				let authorization = req.header('Authorization');
				let token = authorization ? authorization.split(' ')[1] : undefined;

				if (!token) return next();

				jwt.verify(token, this.envs.JWT_TOKEN, (error, decoded) => {
					if (error) {
						res.status(401).send('Invalid authorization token');
					}else if (decoded && decoded.sub) {
						req.user = decoded.sub;
						return next();
					}
				});
			});
		}

		if (this.envs.GRAPHQL === 'on' && this.envs.GRAPHQL_DIR) {
			const schema = this.createSchema();
			
			if (this.envs.DEVELOPMENT === 'on') {
				this.server.get('/schema', (req, res) => {
					res.send(printSchema(schema));
				});
			}

			if(this.envs.STORAGE_DIR !== 'off'){
				const storage = this.createStorage();
				this.server.use(
					this.envs.GRAPHQL_URL,
					multer({ storage }).single('file')
				);
			}else{
				this.server.use(
					graphqlUploadExpress({ maxFileSize: 10000000, maxFiles: 10 }),
				)
			}
			

			this.server.use(
				this.envs.GRAPHQL_URL,
				graphqlHTTP(req => ({
					schema,
					context: this.createContext(req),
					extensions: ({ context }) => ({ token: context.sessionID }),
					graphiql: this.envs.GRAPHQL_IDE === 'on',
					customFormatErrorFn: err => this.setErrors(err)
				}))
			);

			SubscriptionServer.create(
				{
					schema,
					execute,
					subscribe,

					onOperation: (_, params, __) => ({
						...params,
						context: this.server.request
					})
				},
				{
					server: this.httpServer,
					path: this.envs.GRAPHQL_URL
				}
			);
			
		}
	}

	/**
	 * Responsavel por criar o schema do GraphQL
	 * @returns {Object} o GraphQLSchema criado
	 */
	createSchema() {
		const pathFileQueries = path.resolve(
			process.cwd(),
			this.envs.GRAPHQL_DIR,
			'queries.js'
		);

		const pathFileMutations = path.resolve(
			process.cwd(),
			this.envs.GRAPHQL_DIR,
			'mutations.js'
		);

		const pathFileSubscriptions = path.resolve(
			process.cwd(),
			this.envs.GRAPHQL_DIR,
			'subscriptions.js'
		);

		let query,
			mutation,
			subscription,
			schemaPrototype = {
				Upload: GraphQLUpload
			};

		if (fs.existsSync(pathFileQueries)) {
			let fields = {};
			query = require(pathFileQueries);
			fields = { ...fields, ...query };
			query = new GraphQLObjectType({
				name: 'Query',
				fields
			});
		} else {
			const pathDir = path.resolve(
				process.cwd(),
				this.envs.GRAPHQL_DIR,
				'queries'
			);

			if (fs.existsSync(pathDir)) {
				let fields = {};

				util.recursiveRead(pathDir).forEach(file => {
					file = file.split('queries/')[1];
					const query = require(path.resolve(pathDir, file));
					fields = { ...fields, ...query };
				});

				query = new GraphQLObjectType({
					name: 'Query',
					fields
				});
			}
		}

		if (fs.existsSync(pathFileMutations)) {
			let fields = {};
			mutation = require(pathFileMutations);
			fields = { ...fields, ...mutation };
			mutation = new GraphQLObjectType({
				name: 'Mutation',
				fields
			});
		} else {
			const pathDir = path.resolve(
				process.cwd(),
				this.envs.GRAPHQL_DIR,
				'mutations'
			);

			if (fs.existsSync(pathDir)) {
				let fields = {};

				util.recursiveRead(pathDir).forEach(file => {
					file = file.split('mutations/')[1];
					const mutation = require(path.resolve(pathDir, file));
					fields = { ...fields, ...mutation };
				});

				mutation = new GraphQLObjectType({
					name: 'Mutation',
					fields
				});
			}
		}

		if (fs.existsSync(pathFileSubscriptions)) {
			subscription = require(pathFileSubscriptions);
		} else {
			const pathDir = path.resolve(
				process.cwd(),
				this.envs.GRAPHQL_DIR,
				'subscriptions'
			);

			if (fs.existsSync(pathDir)) {
				let fields = {};

				util.recursiveRead(pathDir).forEach(file => {
					file = file.split('subscriptions/')[1];
					const subscription = require(path.resolve(pathDir, file));
					fields = { ...fields, ...subscription };
				});

				subscription = new GraphQLObjectType({
					name: 'Subscription',
					fields
				});
			}
		}

		if (query) schemaPrototype.query = query;
		if (mutation) schemaPrototype.mutation = mutation;
		if (subscription) schemaPrototype.subscription = subscription;

		const Schema = new GraphQLSchema(schemaPrototype);
		return Schema;
	}

	/**
	 * Responsavel por criar o configurações de upload
	 * @returns {Object} o diskStorage configurado
	 */
	createStorage() {
		const pathStorage = path.resolve(process.cwd(), this.envs.STORAGE_DIR);

		return multer.diskStorage({
			destination: (req, file, cb) => cb(null, pathStorage),
			filename: (req, file, cb) => {
				let [_, extension] = file.originalname.split('.');
				extension = extension ? `.${extension}` : '';

				let newfilename = uuidv4().replace('-', '');
				cb(null, `${newfilename}${extension}`);
			}
		});
	}

	createContext(request) {
		const pathContext = path.resolve(
			process.cwd(),
			this.envs.GRAPHQL_DIR,
			'context'
		);

		try {
			require.resolve(pathContext);
			const Context = require(pathContext);

			return new Context(request);
		} catch (error) {
			return request;
		}
	}

	/**
	 * Responsavel por criar o arquivo das configurações de erros personalizadas
	 * @returns {Object} configurações de erros realizadas
	 */
	setErrors(err) {
		if (this.envs.ERROR_FORMAT === 'on') {
			const { errorType } = require(process.cwd() +
				`/src/${process.env.ERROR_FILENAME}`);

			if (err.message === 'Syntax Error: Unexpected <EOF>') {
				return {
					message: 'No content - Type some query or mutation',
					statusCode: 204
				};
			}

			const getErrorCode = errorName => {
				return errorType[errorName];
			};
			const error = getErrorCode(err.message) || err;

			return {
				message: error.message,
				statusCode: error.statusCode
			};
		} else {
			return err.message;
		}
	}
}

module.exports = Config;
