const express = require('express');
const router = express.Router();

// Importujemy wyspecjalizowane routery
const fileRoutes = require('./fileRoutes');
const zipRoutes = require('./zipRoutes');

// Podłączamy je do głównego routera
router.use(fileRoutes);
router.use(zipRoutes);

module.exports = router;