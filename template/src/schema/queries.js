const { GraphQLString } = require('graphql');

const Queries = {
	testeQuery: {
		type: GraphQLString,
		description: 'testeQuery',
		resolve:  () => {
			return 'query here';
		}
	}
};

module.exports = Queries;