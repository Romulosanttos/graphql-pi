/// <reference types="node" />

import * as IExpress from 'express';
import * as Massive from 'massive';
import * as MongoDB from 'mongodb';
import * as SocketIO from 'socket.io';
import * as Bunyan from 'bunyan';
import * as Memcached from 'memcached';

import * as Permissions from '../util/permissions';
import * as Util from '../util/util';
import * as UtilFunctions from '../lib/utilFunctions';
import * as EmailServer from '../lib/utilEmail';


declare global {

	type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
	type Merge<M, N> = Omit<M, Extract<keyof M, keyof N>> & N;


	declare namespace Sigma {

		type DatabaseObject<T> = {
			[P in keyof T]: T[P];
		}

		type DatabaseObjectPartial<T> = {
			[P in keyof T]?: T[P];
		}

		interface DatabaseOptions<T> extends Massive.RetrievalOptions, Massive.ResultProcessingOptions {
			fields?: (keyof T)[]
		}

		interface DatabaseEntity extends Massive.Entity, Massive.Readable, Massive.Executable {
			find<T>(query?: DatabaseObjectPartial<T>, options?: DatabaseOptions<T>): Promise<DatabaseObject<T>>;
			insert<T>(object: DatabaseObjectPartial<T>): Promise<DatabaseObject<T>>;
		}

		interface Database extends Massive.Database {
			[entity: string]: Sigma.DatabaseEntity;
		}

		interface ExpressSettings {
			development: boolean;
			config: Sigma.Envs;
			system: any;
			[key: string]: any;
		}

		interface ExpressRequestBody {
			[key: string]: any;
		}

		interface PromiseLike<T> extends Promise<T> {
			isFulfilled: () => boolean;
			isResolved: () => boolean;
			isRejected: () => boolean;
			valueResolved: () => T;
		}

		interface Logger extends Bunyan { }

		interface Envs {
			SERVER_APP_NAME: string;
			SERVER_DOMAIN: string;
			SERVER_PORT: string;
			SERVER_GRAPHIQL: string;
			SERVER_POSTGRE_USERNAME: string;
			SERVER_POSTGRE_PASSWORD: string;
			SERVER_POSTGRE_URI: string;
			SERVER_POSTGRE_PORT: string;
			SERVER_POSTGRE_DATABASE: string;
			SERVER_POSTGRE_LOG: string;
			SERVER_MONGO_USERNAME: string;
			SERVER_MONGO_PASSWORD: string;
			SERVER_MONGO_URI: string;
			SERVER_MONGO_AUTH: string;
			SERVER_MONGO_DATABASE: string;
			SERVER_MEMCACHED_URI: string;
			SERVER_EMAIL_FROM: string;
			SERVER_EMAIL_HOST: string;
			SERVER_EMAIL_PORT: string;
			SERVER_EMAIL_USER: string;
			SERVER_EMAIL_PASS: string;
			SERVER_EMAIL_TEST: string;
			[key: string]: string;
		}

		interface ExpressGetConfig {
			(name: 'development'): boolean;
			(name: 'config'): Sigma.Envs;
			(name: 'system'): any;
			(name: string): any;
		}

		interface Server extends IExpress.Application {
			settings: Sigma.ExpressSettings;
			request: Sigma.ServerRequest;
			get: Sigma.ExpressGetConfig & IExpress.IRouterMatcher<this>;
			logger: Bunyan;
			util: Util;
			database: Sigma.Database;
			databaseAux: MongoDB.Db;
			memcached: Memcached;
			email: EmailServer;
			io: SocketIO.Server;
		}

	}


	export namespace Express {

		export interface Request {
			body: Sigma.ExpressRequestBody;
			permission: Sigma.Permissions;
			database: Sigma.Database;
		}

	}

}
