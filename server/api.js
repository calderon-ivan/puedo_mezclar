const express = require('express');
const axios = require('axios');
const router = express.Router();
const database = require('./database');
const interactionsAnalyzer = require('./interactions-analyzer');
const cache = require('./cache');

// Base URL para la API de CIMA
const CIMA_BASE_URL = 'https://cima.aemps.es/cima/rest';

// Endpoint para buscar medicamentos por nombre
router.get('/medicamentos', async (req, res) => {
  try {
    const { nombre } = req.query;
    
    if (!nombre || nombre.length < 3) {
      return res.status(400).json({ error: 'El término de búsqueda debe tener al menos 3 caracteres' });
    }
    
    console.log(`Buscando medicamento: ${nombre}`);
    const url = `${CIMA_BASE_URL}/medicamentos?nombre=${encodeURIComponent(nombre)}`;
    console.log(`URL de la petición: ${url}`);
    
    const response = await axios.get(url);
    console.log(`Respuesta recibida. Total resultados: ${response.data.resultados?.length || 0}`);
    
    res.json(response.data);
  } catch (error) {
    console.error('Error al buscar medicamentos:', error.message);
    // Si hay un error de conexión, enviemos más detalles al cliente
    res.status(500).json({ 
      error: 'Error al buscar medicamentos', 
      details: error.message,
      // Si es un error de respuesta, incluimos el código
      statusCode: error.response?.status
    });
  }
});

// Endpoint para obtener un medicamento por número de registro
router.get('/medicamento/:nregistro', async (req, res) => {
  try {
    const { nregistro } = req.params;
    
    // Verificar caché
    const cacheKey = `medicamento:${nregistro}`;
    if (cache.has(cacheKey)) {
      return res.json(cache.get(cacheKey));
    }
    
    const response = await axios.get(`${CIMA_BASE_URL}/medicamento?nregistro=${nregistro}`);
    
    // Guardar en caché
    cache.set(cacheKey, response.data);
    
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
    
    // Verificar caché
    const cacheKey = `interacciones:${nregistro}`;
    if (cache.has(cacheKey)) {
      return res.json(cache.get(cacheKey));
    }
    
    // Intentamos obtener la sección 4.5 de la ficha técnica
    const response = await axios.get(`${CIMA_BASE_URL}/docSegmentado/contenido/1?nregistro=${nregistro}&seccion=4.5`, {
      headers: {
        'Accept': 'application/json'
      }
    });
    
    // Guardar en caché
    cache.set(cacheKey, response.data);
    
    res.json(response.data);
  } catch (error) {
    console.error('Error al obtener interacciones:', error.message);
    res.status(500).json({ error: 'Error al obtener interacciones' });
  }
});

// Función para extraer palabras clave de un texto de interacción
function extractKeywords(text) {
  if (!text) return [];
  
  // Lista de palabras clave que podrían indicar gravedad
  const highSeverityKeywords = ['grave', 'severo', 'contraindicado', 'prohibido', 'no administrar', 'evitar', 'riesgo alto'];
  const mediumSeverityKeywords = ['precaución', 'monitorizar', 'vigilar', 'ajustar dosis', 'reducir dosis'];
  const lowSeverityKeywords = ['leve', 'menor', 'poco frecuente', 'raramente'];
  
  text = text.toLowerCase();
  
  let severity = 'desconocida';
  
  // Determinar severidad basada en palabras clave
  if (highSeverityKeywords.some(keyword => text.includes(keyword))) {
    severity = 'alta';
  } else if (mediumSeverityKeywords.some(keyword => text.includes(keyword))) {
    severity = 'media';
  } else if (lowSeverityKeywords.some(keyword => text.includes(keyword))) {
    severity = 'baja';
  }
  
  return {
    severity,
    text
  };
}

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
    
    // Obtenemos los principios activos
    const principiosMed1 = med1.principiosActivos?.map(pa => pa.nombre.toLowerCase()) || [];
    const principiosMed2 = med2.principiosActivos?.map(pa => pa.nombre.toLowerCase()) || [];
    
    // Análisis de interacciones
    let interaccion = {
      encontrada: false,
      severidad: 'desconocida',
      descripcion: 'No se encontraron interacciones documentadas entre estos medicamentos.',
      recomendacion: 'Consulte a un profesional sanitario para obtener información específica.'
    };
    
    // 1. Primero verificamos nuestra base de datos local
    for (const principio1 of principiosMed1) {
      for (const principio2 of principiosMed2) {
        const knownInteraction = database.findInteraction(principio1, principio2);
        if (knownInteraction) {
          interaccion = {
            encontrada: true,
            severidad: knownInteraction.severidad,
            descripcion: knownInteraction.descripcion,
            recomendacion: knownInteraction.recomendacion,
            fuente: 'Base de datos local'
          };
          break;
        }
      }
      if (interaccion.encontrada) break;
    }
    
    // 2. Si no encontramos en nuestra base, buscamos en las fichas técnicas
    if (!interaccion.encontrada) {
      // Buscar menciones del principio activo de med1 en las interacciones de med2
      if (principiosMed1.length > 0 && interac2.contenido) {
        const interac2Text = interac2.contenido.toLowerCase();
        
        for (const principio of principiosMed1) {
          if (interac2Text.includes(principio)) {
            // Extraer el párrafo relevante (simplificado)
            const relevantText = extractParagraphContaining(interac2Text, principio);
            const keywords = extractKeywords(relevantText);
            
            interaccion = {
              encontrada: true,
              severidad: keywords.severity,
              descripcion: `Se ha encontrado una posible interacción en la ficha técnica. El principio activo ${principio} está mencionado en la sección de interacciones del medicamento ${med2.nombre}.`,
              detalles: relevantText,
              recomendacion: 'Consulte a un profesional sanitario para una evaluación detallada de esta interacción.',
              fuente: 'Ficha técnica CIMA'
            };
            break;
          }
        }
      }
      
      // Si no encontramos nada, buscar al revés
      if (!interaccion.encontrada && principiosMed2.length > 0 && interac1.contenido) {
        const interac1Text = interac1.contenido.toLowerCase();
        
        for (const principio of principiosMed2) {
          if (interac1Text.includes(principio)) {
            // Extraer el párrafo relevante (simplificado)
            const relevantText = extractParagraphContaining(interac1Text, principio);
            const keywords = extractKeywords(relevantText);
            
            interaccion = {
              encontrada: true,
              severidad: keywords.severity,
              descripcion: `Se ha encontrado una posible interacción en la ficha técnica. El principio activo ${principio} está mencionado en la sección de interacciones del medicamento ${med1.nombre}.`,
              detalles: relevantText,
              recomendacion: 'Consulte a un profesional sanitario para una evaluación detallada de esta interacción.',
              fuente: 'Ficha técnica CIMA'
            };
            break;
          }
        }
      }
    }
    
    // 3. Análisis basado en grupos farmacológicos
if (!interaccion.encontrada) {
  const groupInteraction = interactionsAnalyzer.analyzeGroupInteractions(principiosMed1, principiosMed2);
  
  if (groupInteraction) {
    interaccion = groupInteraction;
  }
}
    
    // Respuesta final
    res.json({
      medicamento1: {
        nombre: med1.nombre,
        principiosActivos: principiosMed1
      },
      medicamento2: {
        nombre: med2.nombre,
        principiosActivos: principiosMed2
      },
      interaccion
    });
    
  } catch (error) {
    console.error('Error al comparar medicamentos:', error.message);
    res.status(500).json({ error: 'Error al comparar medicamentos' });
  }
});

// Función auxiliar para extraer el párrafo que contiene una palabra clave
function extractParagraphContaining(text, keyword) {
  if (!text) return '';
  
  // Dividir por párrafos
  const paragraphs = text.split(/\n+/);
  
  // Buscar párrafo que contiene la palabra clave
  const relevantParagraph = paragraphs.find(p => p.includes(keyword));
  
  return relevantParagraph || '';
}

module.exports = router;