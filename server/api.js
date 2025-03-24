const express = require('express');
const axios = require('axios');
const router = express.Router();

// Base URL para la API de CIMA
const CIMA_BASE_URL = 'https://cima.aemps.es/cima/rest';

// Endpoint para buscar medicamentos por nombre
router.get('/medicamentos', async (req, res) => {
  try {
    const { nombre } = req.query;
    
    if (!nombre || nombre.length < 3) {
      return res.status(400).json({ error: 'El término de búsqueda debe tener al menos 3 caracteres' });
    }
    
    const response = await axios.get(`${CIMA_BASE_URL}/medicamentos?nombre=${encodeURIComponent(nombre)}`);
    
    res.json(response.data);
  } catch (error) {
    console.error('Error al buscar medicamentos:', error.message);
    res.status(500).json({ error: 'Error al buscar medicamentos' });
  }
});

// Endpoint para obtener un medicamento por número de registro
router.get('/medicamento/:nregistro', async (req, res) => {
  try {
    const { nregistro } = req.params;
    
    const response = await axios.get(`${CIMA_BASE_URL}/medicamento?nregistro=${nregistro}`);
    
    res.json(response.data);
  } catch (error) {
    console.error('Error al obtener medicamento:', error.message);
    res.status(500).json({ error: 'Error al obtener medicamento' });
  }
});

// Endpoint para obtener las interacciones (sección 4.5 de la ficha técnica)
router.get('/interacciones/:nregistro', async (req, res) => {
  try {
    const { nregistro } = req.params;
    
    // Intentamos obtener la sección 4.5 de la ficha técnica
    const response = await axios.get(`${CIMA_BASE_URL}/docSegmentado/contenido/1?nregistro=${nregistro}&seccion=4.5`, {
      headers: {
        'Accept': 'application/json'
      }
    });
    
    res.json(response.data);
  } catch (error) {
    console.error('Error al obtener interacciones:', error.message);
    res.status(500).json({ error: 'Error al obtener interacciones' });
  }
});

// Endpoint para comparar dos medicamentos
router.get('/comparar', async (req, res) => {
  try {
    const { nregistro1, nregistro2 } = req.query;
    
    if (!nregistro1 || !nregistro2) {
      return res.status(400).json({ error: 'Se requieren dos números de registro' });
    }
    
    // Obtenemos la información de ambos medicamentos
    const [med1Res, med2Res, interac1Res, interac2Res] = await Promise.all([
      axios.get(`${CIMA_BASE_URL}/medicamento?nregistro=${nregistro1}`),
      axios.get(`${CIMA_BASE_URL}/medicamento?nregistro=${nregistro2}`),
      axios.get(`${CIMA_BASE_URL}/docSegmentado/contenido/1?nregistro=${nregistro1}&seccion=4.5`, {
        headers: { 'Accept': 'application/json' }
      }).catch(() => ({ data: { contenido: '' } })),
      axios.get(`${CIMA_BASE_URL}/docSegmentado/contenido/1?nregistro=${nregistro2}&seccion=4.5`, {
        headers: { 'Accept': 'application/json' }
      }).catch(() => ({ data: { contenido: '' } }))
    ]);
    
    const med1 = med1Res.data;
    const med2 = med2Res.data;
    const interac1 = interac1Res.data;
    const interac2 = interac2Res.data;
    
    // Análisis básico de interacciones
    let interaccion = {
      encontrada: false,
      severidad: 'desconocida',
      descripcion: 'No se encontraron interacciones documentadas entre estos medicamentos.',
      recomendacion: 'Consulte a un profesional sanitario para obtener información específica.'
    };
    
    // Buscar menciones del principio activo de med1 en las interacciones de med2
    if (med1.principiosActivos && med2.principiosActivos && interac2.contenido) {
      const principios1 = med1.principiosActivos.map(pa => pa.nombre.toLowerCase());
      
      for (const principio of principios1) {
        if (interac2.contenido.toLowerCase().includes(principio)) {
          interaccion.encontrada = true;
          interaccion.descripcion = 'Se ha encontrado una posible interacción. El principio activo ' + 
                                    principio + ' está mencionado en la ficha técnica del segundo medicamento.';
          break;
        }
      }
    }
    
    // Buscar menciones del principio activo de med2 en las interacciones de med1
    if (!interaccion.encontrada && med1.principiosActivos && med2.principiosActivos && interac1.contenido) {
      const principios2 = med2.principiosActivos.map(pa => pa.nombre.toLowerCase());
      
      for (const principio of principios2) {
        if (interac1.contenido.toLowerCase().includes(principio)) {
          interaccion.encontrada = true;
          interaccion.descripcion = 'Se ha encontrado una posible interacción. El principio activo ' + 
                                    principio + ' está mencionado en la ficha técnica del primer medicamento.';
          break;
        }
      }
    }
    
    // Respuesta final
    res.json({
      medicamento1: {
        nombre: med1.nombre,
        principiosActivos: med1.principiosActivos?.map(pa => pa.nombre) || []
      },
      medicamento2: {
        nombre: med2.nombre,
        principiosActivos: med2.principiosActivos?.map(pa => pa.nombre) || []
      },
      interaccion
    });
    
  } catch (error) {
    console.error('Error al comparar medicamentos:', error.message);
    res.status(500).json({ error: 'Error al comparar medicamentos' });
  }
});

module.exports = router;