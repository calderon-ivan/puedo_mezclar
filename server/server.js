const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const api = require('./api');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware de CORS mejorado
app.use(cors({
  origin: '*', // O configúralo para tu dominio específico en producción
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// API Routes
app.use('/api', api);

// Servir la aplicación frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});