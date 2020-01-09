const { GraphQLString } = require('graphql');

const Mutations =  {
	testeMutation: {
		type: GraphQLString,
		description: 'testeMutation',
		resolve:  () => {
			return 'mutation here';
		}
	}
};

module.exports = Mutations;