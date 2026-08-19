require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { DataTypes } = require('sequelize');
const sequelize = require('./config/database');
const { User } = require('./models');
const masterRoutes = require('./routes/masterRoutes');
const authRoutes = require('./routes/authRoutes');
const systemRoutes = require('./routes/systemRoutes');
const auditMiddleware = require('./middleware/auditMiddleware');
const { startBackupScheduler } = require('./services/backupService');

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

const requireAuth = async (req, res, next) => {
  try {
    const cleanPath = req.path.replace(/\/$/, '');
    if (cleanPath === '/products' || cleanPath.startsWith('/products/')) {
      return next();
    }

    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) {
      return res.status(401).json({ message: 'Login required.' });
    }

    const user = await User.findOne({ where: { session_token: token } });
    if (!user) {
      return res.status(401).json({ message: 'Session expired.' });
    }

    req.user = { id: user.id, username: user.username };
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ message: 'Unable to verify session.' });
  }
};

const ensureInvoiceDetailColumns = async () => {
  const queryInterface = sequelize.getQueryInterface();
  const table = 'tbl_InvoiceDetails';
  const existing = await queryInterface.describeTable(table);
  const columns = {
    broker_code1: { type: DataTypes.STRING },
    broker_code2: { type: DataTypes.STRING },
    broker_percentage2: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    lot_no: { type: DataTypes.STRING },
    convert_to_cone: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
    charity_per_bale: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    other_per: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 }
  };

  for (const [name, definition] of Object.entries(columns)) {
    if (!existing[name]) {
      await queryInterface.addColumn(table, name, definition);
    }
  }

  if (existing.convert_to_cone) {
    await queryInterface.changeColumn(table, 'convert_to_cone', {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0
    });
  }
};

const ensureUserColumns = async () => {
  const queryInterface = sequelize.getQueryInterface();
  const table = 'tbl_Users';
  const existing = await queryInterface.describeTable(table);
  const columns = {
    mobile_no: { type: DataTypes.STRING, allowNull: true, unique: true },
    otp_hash: { type: DataTypes.STRING, allowNull: true },
    otp_salt: { type: DataTypes.STRING, allowNull: true },
    otp_expires_at: { type: DataTypes.DATE, allowNull: true },
    otp_verified_at: { type: DataTypes.DATE, allowNull: true }
  };

  for (const [name, definition] of Object.entries(columns)) {
    if (!existing[name]) {
      await queryInterface.addColumn(table, name, definition);
    }
  }
};

const ensureDespatchColumns = async () => {
  const queryInterface = sequelize.getQueryInterface();
  const table = 'tbl_DespatchEntries';
  const existing = await queryInterface.describeTable(table);
  const columns = {
    original_no_of_bags: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    original_freight: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 }
  };

  let added = false;
  for (const [name, definition] of Object.entries(columns)) {
    if (!existing[name]) {
      await queryInterface.addColumn(table, name, definition);
      added = true;
    }
  }

  if (added || Object.keys(existing).length > 0) {
    await sequelize.query(`
      UPDATE tbl_DespatchEntries 
      SET original_no_of_bags = COALESCE(NULLIF(original_no_of_bags, 0), no_of_bags, 0),
          original_freight = COALESCE(NULLIF(original_freight, 0), freight, 0)
      WHERE original_no_of_bags = 0 OR original_no_of_bags IS NULL
    `);
  }
};

async function startServer() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '100mb' }));
  app.use('/auth', authRoutes);
  app.use('/api', requireAuth);
  app.use('/api', auditMiddleware);
  app.use('/api/system', systemRoutes);
  app.use('/api', masterRoutes);

  try {
    await sequelize.authenticate();
    console.log('Database connected');

    await sequelize.sync({ alter: false });
    await ensureUserColumns();
    await ensureInvoiceDetailColumns();
    await ensureDespatchColumns();

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`REST API: http://localhost:${PORT}/api`);
    });
    startBackupScheduler();
  } catch (error) {
    console.error('Server start error:', error);
  }
}

startServer();
