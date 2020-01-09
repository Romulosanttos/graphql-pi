
const NodeUtil = require('util');
const EmailTemplates = require('email-templates');
const EJS = require('ejs');
const Juice = require('juice');


const JuiceResourcesPromise = NodeUtil.promisify(Juice.juiceResources);


/**
 * Util Functions
 */
module.exports = class EmailServer {

	constructor({
		app = 'App',
		from = 'noreply@email.com',
		preview = true,
		auth: {
			host,
			port,
			user,
			pass
		},
		getTemplate = null,
		localsDefault = {},
		to = null,
		toEmailField = null,
		toNameField = null,
		saveEmail = null,
		juice = true
	}){

		this.server = new EmailTemplates({
			message: { from: `${app} <${from}>` },
			htmlToText: true,
			send: true,
			preview,
			transport: {
				host,
				port,
				auth: {
					user,
					pass
				}
			}
		});

		this.getTemplate = getTemplate;
		this.localsDefault = localsDefault;
		this.to = to;
		this.toEmailField = toEmailField;
		this.toNameField = toNameField;
		this.saveEmail = saveEmail;
		this.juice = juice;

	}

	/**
	 * Responsável por iniciar o módulo
	 * @returns {Promise<string>} o módulo instanciado
	 */
	start() {
		return new Promise((resolve, reject) => {
			try {
				resolve(this);
			} catch (error) {
				reject(error);
			}
		});
	}

	/**
	 * Renderizar template EJS.
	 * @param {string} content
	 * @param {object} locals
	 * @param {boolean} juice
	 */
	static renderEJS(content, locals = {}, juice = false){
		let rendered = EJS.render(content, locals);
		if(juice){
			return JuiceResourcesPromise(rendered);
		}else{
			return rendered;
		}
	}


	parseTo(to){
		let toAux = null;
		if(NodeUtil.isArray(to)){
			const aux = [];
			for(const v of to){
				aux.push(this.parseTo(v));
			}
			toAux = aux.join(', ');
		}else if(NodeUtil.isObject(to) && this.toEmailField && to[this.toEmailField]){
			if(this.toNameField && to[this.toNameField])
				toAux = `${to[this.toNameField]} <${to[this.toEmailField]}>`;
			else
				toAux = to[this.toEmailField];
		}else if(!NodeUtil.isString(to)){
			toAux = null;
		}else if(NodeUtil.isString(to)){
			toAux = to;
		}

		if(!toAux) throw `Invalid value ${to}`;

		return toAux;
	}


	/**
	 * Renderizar template de e-mail.
	 * @param {string} view
	 * @param {object} locals
	 */
	async renderEmailTemplate(view, locals = {}){
		const [ viewName, viewType ] = view.split('/');
		const template = await this.getTemplate(viewName);

		if(template){
			const args = [
				{
					...({
						title: template.subject,
						subject: template.subject,
						message: '<%= message %>'
					}),
					...(template.locals || {}),
					...locals,
				},
				this.juice
			];
			if(viewType){
				return await EmailServer.renderEJS(template[viewType], ...args);
			}else{
				const [ subject, html ] = await Promise.all([
					EmailServer.renderEJS(template.subject, ...args),
					EmailServer.renderEJS(template.html, ...args)
				]);
				return { subject, html };
			}
		}else{
			throw new Error(`Template ${view} not found!`);
		}
	}


	/**
	 * Enviar email.
	 * @param {string} templateName
	 * @param {object} to
	 * @param {string} subject
	 * @param {object} params
	 */
	async send({
		template,
		to,
		params = {}
	}){

		const locals = {
			...this.localsDefault,
			...params
		};
		let toAux;

		if(this.to) toAux = this.parseTo(this.to);
		else toAux = this.parseTo(to);

		try{
			const { subject, html } = await this.renderEmailTemplate(template, locals);

			const result = await this.server.send({
				template,
				message: {
					to: toAux,
					subject,
					html
				},
				locals
			});
			if(this.saveEmail && NodeUtil.isFunction(this.saveEmail)){
				this.saveEmail({
					params: {
						template,
						to,
						params,
					},
					email: {
						to: toAux,
						subject,
						html,
						locals,
					},
					result
				});

				console.log(`Email ${subject} sent to ${toAux}`);
			}
			return result;
		}catch(err){
			if(this.saveEmail && NodeUtil.isFunction(this.saveEmail)){
				this.saveEmail({
					params: {
						template,
						to,
						params,
					},
					email: {
						to: toAux,
						subject: null,
						html: null,
						locals,
					},
					result: err
				});
			}
			throw err;
		}
	}

};
