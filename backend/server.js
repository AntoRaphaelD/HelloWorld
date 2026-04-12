require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sequelize = require('./config/database');
const masterRoutes = require('./routes/masterRoutes');

async function startServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api', masterRoutes);

  try {
    await sequelize.authenticate();
    console.log('Database connected');

    await sequelize.sync({ alter: false });

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`REST API: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('Server start error:', error);
  }
}

startServer();
