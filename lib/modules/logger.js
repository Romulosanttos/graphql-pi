const bunyan = require('bunyan');
const bynyanPrettyStram = require('bunyan-prettystream');

const SigmaInternalsLog = Symbol.for('SigmaInternalsLog');

/**
 * @class Logger
 * @author Luciano Tavernard <luciano.tavernard@sigmast.com.br>
 */

class Logger {

	constructor({ app = 'App', streams = null, dev = true }) {
		if (!streams) {
			streams = [];
			streams.push({ type: 'raw', level: 'trace', name: 'Trace', stream: 'prettyStdOut' });
			streams.push({ type: 'raw', level: 'warn', name: 'Error', stream: 'prettyStdErr' });
			if (!dev) {
				const path = Path.resolve(process.cwd(), '.log');
				try {
					FS.mkdirSync(path);
				} catch (ignore) { }
				streams.push({ type: 'rotating-file', level: 'trace', name: 'Trace', period: '1w', file: Path.resolve(path, 'app-trace.log') });
				streams.push({ type: 'rotating-file', level: 'warn', name: 'Error', period: '1w', file: Path.resolve(path, 'app-error.log') });
			}
		}

		let prettyStdErr = null, prettyStdOut = null;

		const loggerStreams = streams
			.forEach(({ stream, file, type, level, name, period }) => {
				if (stream === 'prettyStdErr' && !prettyStdErr) {
					prettyStdErr = new bynyanPrettyStram();
					prettyStdErr.pipe(process.stderr);
				} else if (stream === 'prettyStdOut' && !prettyStdOut) {
					prettyStdOut = new bynyanPrettyStram();
					prettyStdOut.pipe(process.stdout);
				}

				const options = {
					type: type || 'rotating-file',
					level: level || 'trace',
					name: name || 'Log',
					period: period || '1w',
					count: 30,
				};

				if (file) {
					options.path = file;
				} else if (stream) {
					if (stream === 'prettyStdOut') options.stream = prettyStdOut;
					else if (stream === 'prettyStdErr') options.stream = prettyStdErr;
					else options.stream = stream;
				}

				return options;
			});

		this.bunyan = bunyan.createLogger({
			name: app,
			streams: loggerStreams,
			serializers: {
				req: bunyan.stdSerializers.req,
				res: bunyan.stdSerializers.res,
				err: bunyan.stdSerializers.err
			}
		});
	}

	/**
	 * Responsavel por iniciar o módulo
	 * @returns {Promise<string>} o módulo instanciado
	 */
	start() {
		return Promise.resolve(this);
	}

	attach({ ctx, key = 'log' }) {
		if (!this) throw 'logger deve ser informado';
		if (!ctx) throw 'ctx deve ser informado';
		if (ctx[key]) throw 'Key já existe';

		if (!ctx[SigmaInternalsLog]) ctx[SigmaInternalsLog] = {};

		if (!ctx[SigmaInternalsLog].fields) {
			ctx[SigmaInternalsLog].fields = { pid: process.pid };
		}
		ctx[SigmaInternalsLog].logger = this.bunyan.child(ctx[SigmaInternalsLog].fields);
		ctx[key] = this.logger.bind(ctx);
		return ctx;
	}

	logger(options = {}, ...rest){
		if(this[SigmaInternalsLog].logger){
			const args = { obj: {}, arguments: [] };
			if(typeof options == 'object'){
				args.level = options.level;
				args.msg = options.msg;
				args.obj = options.obj || options.err;
			}else{
				args.msg = options;
				args.obj = rest.shift();
			}

			if(args.obj instanceof Error){
				args.level = args.level || 'error';
				args.obj = {
					err: args.obj,
					...this[SigmaInternalsLog].fields
				};
			}else{
				args.level = args.level || 'info';
				if(args.obj){
					args.obj = {
						obj: args.obj,
						...this[SigmaInternalsLog].fields
					};
				}else{
					args.obj = {
						...this[SigmaInternalsLog].fields
					};
				}
			}

			args.arguments = [ args.obj, args.msg, ...rest ].filter(n => n);

			this[SigmaInternalsLog].logger[args.level]
				.apply(this[SigmaInternalsLog].logger, args.arguments);
		}else{
			throw new Error('Logger not inicialized!');
		}
	}
}

module.exports = Logger;