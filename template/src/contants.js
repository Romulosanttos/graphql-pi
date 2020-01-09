module.exports.errorName = {
	UNAUTHORIZED: 'UNAUTHORIZED',
	NOT_FOUND: 'NOT_FOUND',
	CONFLITCT: 'CONFLITCT',
	BAD_REQUEST: 'BAD_REQUEST',
	NO_CONTENT: 'NO_CONTENT'
};

module.exports.errorType = {
	NO_CONTENT: {
		message: 'No content - Missing some input data.',
		statusCode: 204
	},
	BAD_REQUEST: {
		message: 'Bad Request.',
		statusCode: 400
	},
	UNAUTHORIZED: {
		message: 'Unauthorized - Authentication is needed to get request response.',
		statusCode: 401
	},
	NOT_FOUND: {
		message: 'Not Found',
		statusCode: 404
	},
	CONFLITCT: {
		message: 'This data already registered.',
		statusCode: 409
	}
};
