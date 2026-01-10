const express = require('express');
const cors = require('cors');
const pool = require('./db'); // Importamos la conexión que acabamos de crear

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// RUTA 1: Prueba simple
app.get('/', (req, res) => {
  res.send('Servidor de Peceras activo 🚌');
});

// RUTA 2: Obtener todas las rutas (LA IMPORTANTE)
app.get('/rutas', async (req, res) => {
  try {
    // Consulta SQL: Pedimos el nombre, color y convertimos el recorrido a GeoJSON (formato para mapas web)
    const result = await pool.query(`
      SELECT id, nombre, color, ST_AsGeoJSON(recorrido) as geojson 
      FROM rutas
    `);
    
    // Le enviamos los datos al usuario
    res.json(result.rows);
    
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Error en el servidor');
  }
});

app.listen(port, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
});