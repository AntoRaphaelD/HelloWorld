require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { ApolloServer } = require('apollo-server-express'); // Import Apollo
const sequelize = require('./config/database');
let masterRoutes = null;
try {
  masterRoutes = require('./routes/masterRoutes');
} catch (err) {
  masterRoutes = null;
}

// Import GraphQL Schema and Resolvers
const typeDefs = require('./graphql/typeDefs');
const resolvers = require('./graphql/resolvers');

async function startServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());


  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }) => ({ req }) // Pass request to context for auth if needed
  });

  await server.start();
  server.applyMiddleware({ app, path: '/graphql' }); // Mount GraphQL at /graphql

  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    // Use sync({ alter: true }) only in dev
    await sequelize.sync({ alter: false });

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      if (typeof masterRoutes === 'function') {
        console.log(`🚀 REST API: http://localhost:${PORT}/api`);
      }
      console.log(`🚀 GraphQL:  http://localhost:${PORT}/graphql`);
    });
  } catch (error) {
    console.error('❌ Server start error:', error);
  }
}

startServer();
