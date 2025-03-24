Esta webapp ayuda a comparar medicamentos y bebe directamente de la base de datos de CIMA AEMPS -> https://sede.aemps.gob.es/docs/CIMA-REST-API_1_19.pdf

## Paso 1: Configuración del entorno de desarrollo

1. **Instala las herramientas necesarias**:
   - Visual Studio Code: https://code.visualstudio.com/download
   - Node.js: https://nodejs.org/es/download/ (versión LTS)
   - Git: https://git-scm.com/downloads

2. **Extensiones recomendadas para VS Code**:
   - JavaScript (ES6) Code Snippets
   - HTML CSS Support
   - Live Server
   - Prettier - Code formatter

## Paso 2: Crear la estructura del proyecto

1. **Abre VS Code y crea una carpeta para tu proyecto**:
   - Abre VS Code
   - Selecciona "File" → "Open Folder"
   - Crea una nueva carpeta llamada "MedInteract"

2. **Inicializa un proyecto básico**:
   - Abre la terminal integrada en VS Code (View → Terminal)
   - Ejecuta estos comandos:

```bash
npm init -y
npm install express cors axios body-parser
npm install --save-dev nodemon
```

3. **Crea la estructura de carpetas**:

```
MedInteract/
  ├── public/
  │   ├── css/
  │   │   └── styles.css
  │   ├── js/
  │   │   └── app.js
  │   └── index.html
  ├── server/
  │   ├── api.js
  │   └── server.js
  └── package.json
```

## Paso 3: Configurar el servidor básico

1. **Crea el archivo server.js en la carpeta server/**:

```javascript
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const api = require('./api');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));

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
```

2. **Crea el archivo api.js en la carpeta server/**:

```javascript
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
```

## Paso 4: Crear la interfaz de usuario

1. **Crea el archivo index.html en la carpeta public/**:

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MedInteract España - Interacciones entre medicamentos</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="css/styles.css">
</head>
<body>
    <div class="container">
        <header class="my-4 text-center">
            <h1>MedInteract España</h1>
            <p class="lead">Compara medicamentos y verifica interacciones en España</p>
        </header>
        
        <div class="card mb-4">
            <div class="card-body">
                <h5 class="card-title">Selecciona medicamentos</h5>
                <div class="row g-3 mb-3">
                    <div class="col-md-5">
                        <label for="med1" class="form-label">Medicamento 1</label>
                        <input type="text" id="med1" class="form-control" placeholder="Buscar medicamento...">
                        <ul id="suggestions1" class="list-group mt-1 suggestions"></ul>
                    </div>
                    <div class="col-md-5">
                        <label for="med2" class="form-label">Medicamento 2</label>
                        <input type="text" id="med2" class="form-control" placeholder="Buscar medicamento...">
                        <ul id="suggestions2" class="list-group mt-1 suggestions"></ul>
                    </div>
                    <div class="col-md-2 d-flex align-items-end">
                        <button id="compareBtn" class="btn btn-primary w-100" disabled>Comparar</button>
                    </div>
                </div>
            </div>
        </div>
        
        <div id="selectedMeds" class="row mb-4">
            <!-- Medicamentos seleccionados aparecerán aquí -->
        </div>
        
        <div id="results" class="card d-none">
            <div class="card-header">
                <h5>Resultados de interacción</h5>
            </div>
            <div class="card-body">
                <div id="interactionLevel" class="alert mb-3"></div>
                <h6>Posibles efectos:</h6>
                <div id="effects" class="p-3 border rounded bg-light mb-3">
                    <!-- Efectos aparecerán aquí -->
                </div>
                <h6>Recomendaciones:</h6>
                <div id="recommendations" class="p-3 border rounded bg-light mb-3">
                    <!-- Recomendaciones aparecerán aquí -->
                </div>
                <div class="small text-muted mt-3">
                    <p>Esta información es orientativa. Consulte siempre a un profesional sanitario.</p>
                </div>
            </div>
        </div>
        
        <div id="loading" class="text-center my-5 d-none">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Cargando...</span>
            </div>
            <p class="mt-2">Analizando interacciones...</p>
        </div>
    </div>
    
    <footer class="bg-light py-3 text-center mt-5">
        <div class="container">
            <p class="small text-muted">
                MedInteract utiliza datos de la AEMPS (Agencia Española de Medicamentos y Productos Sanitarios).<br>
                Esta aplicación no sustituye el consejo médico profesional.
            </p>
        </div>
    </footer>
    
    <script src="js/app.js"></script>
</body>
</html>
```

2. **Crea el archivo styles.css en la carpeta public/css/**:

```css
.suggestions {
    position: absolute;
    z-index: 1000;
    width: 95%;
    max-height: 200px;
    overflow-y: auto;
    display: none;
}

.suggestions.show {
    display: block;
}

.list-group-item {
    cursor: pointer;
}

.list-group-item:hover {
    background-color: #f8f9fa;
}

.med-chip {
    display: inline-block;
    padding: 0.5rem 1rem;
    margin: 0.25rem;
    border-radius: 25px;
    background-color: #e9ecef;
}

.med-chip .close {
    margin-left: 0.5rem;
    cursor: pointer;
}

.severity-high {
    background-color: #f8d7da;
    color: #721c24;
}

.severity-medium {
    background-color: #fff3cd;
    color: #856404;
}

.severity-low {
    background-color: #d1ecf1;
    color: #0c5460;
}

.severity-none {
    background-color: #d4edda;
    color: #155724;
}

.severity-unknown {
    background-color: #e2e3e5;
    color: #383d41;
}
```

3. **Crea el archivo app.js en la carpeta public/js/**:

```javascript
document.addEventListener('DOMContentLoaded', () => {
    // Referencias a elementos del DOM
    const med1Input = document.getElementById('med1');
    const med2Input = document.getElementById('med2');
    const suggestions1 = document.getElementById('suggestions1');
    const suggestions2 = document.getElementById('suggestions2');
    const compareBtn = document.getElementById('compareBtn');
    const selectedMedsContainer = document.getElementById('selectedMeds');
    const resultsContainer = document.getElementById('results');
    const interactionLevelEl = document.getElementById('interactionLevel');
    const effectsEl = document.getElementById('effects');
    const recommendationsEl = document.getElementById('recommendations');
    const loadingEl = document.getElementById('loading');
    
    // Medicamentos seleccionados
    let selectedMeds = {
        med1: null,
        med2: null
    };
    
    // Configurar event listeners
    med1Input.addEventListener('input', debounce(() => handleSearch(med1Input, suggestions1, 1), 500));
    med2Input.addEventListener('input', debounce(() => handleSearch(med2Input, suggestions2, 2), 500));
    
    suggestions1.addEventListener('click', (e) => handleSelection(e, suggestions1, med1Input, 1));
    suggestions2.addEventListener('click', (e) => handleSelection(e, suggestions2, med2Input, 2));
    
    compareBtn.addEventListener('click', compareSelectedMedicines);
    
    // Ocultar sugerencias cuando se hace clic fuera
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#med1') && !e.target.closest('#suggestions1')) {
            suggestions1.classList.remove('show');
        }
        if (!e.target.closest('#med2') && !e.target.closest('#suggestions2')) {
            suggestions2.classList.remove('show');
        }
    });
    
    /**
     * Busca medicamentos y muestra sugerencias
     * @param {HTMLElement} input - El campo de entrada
     * @param {HTMLElement} suggestionsList - La lista de sugerencias
     * @param {number} medNum - Número del medicamento (1 o 2)
     */
    async function handleSearch(input, suggestionsList, medNum) {
        const query = input.value.trim();
        
        if (query.length < 3) {
            suggestionsList.innerHTML = '';
            suggestionsList.classList.remove('show');
            return;
        }
        
        try {
            const response = await fetch(`/api/medicamentos?nombre=${encodeURIComponent(query)}`);
            const data = await response.json();
            
            suggestionsList.innerHTML = '';
            
            if (data.resultados && data.resultados.length > 0) {
                suggestionsList.classList.add('show');
                
                data.resultados.slice(0, 10).forEach(med => {
                    const item = document.createElement('li');
                    item.className = 'list-group-item';
                    item.dataset.nregistro = med.nregistro;
                    
                    const principiosActivos = med.pactivos || 'No disponible';
                    
                    item.innerHTML = `
                        <strong>${med.nombre}</strong><br>
                        <small>${principiosActivos}</small>
                    `;
                    
                    suggestionsList.appendChild(item);
                });
            } else {
                suggestionsList.classList.add('show');
                const item = document.createElement('li');
                item.className = 'list-group-item text-muted';
                item.textContent = 'No se encontraron resultados';
                suggestionsList.appendChild(item);
            }
        } catch (error) {
            console.error('Error en la búsqueda:', error);
            
            suggestionsList.innerHTML = '';
            suggestionsList.classList.add('show');
            const item = document.createElement('li');
            item.className = 'list-group-item text-danger';
            item.textContent = 'Error al buscar medicamentos';
            suggestionsList.appendChild(item);
        }
    }
    
    /**
     * Maneja la selección de un medicamento
     * @param {Event} event - El evento de clic
     * @param {HTMLElement} suggestionsList - La lista de sugerencias
     * @param {HTMLElement} input - El campo de entrada
     * @param {number} medNum - Número del medicamento (1 o 2)
     */
    async function handleSelection(event, suggestionsList, input, medNum) {
        const target = event.target.closest('.list-group-item');
        
        if (!target || !target.dataset.nregistro) return;
        
        try {
            const nregistro = target.dataset.nregistro;
            
            // Obtener información completa del medicamento
            const response = await fetch(`/api/medicamento/${nregistro}`);
            const medicine = await response.json();
            
            // Almacenar el medicamento seleccionado
            selectedMeds[`med${medNum}`] = medicine;
            
            // Actualizar interfaz
            input.value = medicine.nombre;
            suggestionsList.classList.remove('show');
            
            updateSelectedMedicineDisplay(medNum, medicine);
            
            // Actualizar estado del botón de comparar
            compareBtn.disabled = !(selectedMeds.med1 && selectedMeds.med2);
            
        } catch (error) {
            console.error('Error al seleccionar medicamento:', error);
            alert('Error al seleccionar el medicamento. Inténtelo de nuevo.');
        }
    }
    
    /**
     * Actualiza la visualización de un medicamento seleccionado
     * @param {number} medNum - Número del medicamento (1 o 2)
     * @param {Object} medicine - Datos del medicamento
     */
    function updateSelectedMedicineDisplay(medNum, medicine) {
        const colId = `medCol${medNum}`;
        let col = document.getElementById(colId);
        
        if (!col) {
            col = document.createElement('div');
            col.className = 'col-md-6 mb-3';
            col.id = colId;
            selectedMedsContainer.appendChild(col);
        }
        
        // Lista de principios activos
        let principiosActivosHtml = '';
        if (medicine.principiosActivos && medicine.principiosActivos.length > 0) {
            principiosActivosHtml = '<ul class="list-unstyled mb-0">';
            medicine.principiosActivos.forEach(pa => {
                principiosActivosHtml += `<li>${pa.nombre} ${pa.cantidad || ''} ${pa.unidad || ''}</li>`;
            });
            principiosActivosHtml += '</ul>';
        } else {
            principiosActivosHtml = '<p class="mb-0">No hay información disponible</p>';
        }
        
        col.innerHTML = `
            <div class="card h-100">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h6 class="mb-0">Medicamento ${medNum}</h6>
                    <button class="btn btn-sm btn-outline-danger remove-med" data-med-num="${medNum}">
                        Eliminar
                    </button>
                </div>
                <div class="card-body">
                    <h5 class="card-title">${medicine.nombre}</h5>
                    <h6 class="card-subtitle mb-2 text-muted">Laboratorio: ${medicine.labtitular || 'No disponible'}</h6>
                    
                    <p class="mb-1"><strong>Principios activos:</strong></p>
                    ${principiosActivosHtml}
                </div>
                <div class="card-footer">
                    <small class="text-muted">Nº Registro: ${medicine.nregistro}</small>
                </div>
            </div>
        `;
        
        // Añadir event listener al botón de eliminar
        col.querySelector('.remove-med').addEventListener('click', () => {
            selectedMeds[`med${medNum}`] = null;
            col.remove();
            compareBtn.disabled = !(selectedMeds.med1 && selectedMeds.med2);
            
            // También limpiar el input correspondiente
            if (medNum === 1) {
                med1Input.value = '';
            } else {
                med2Input.value = '';
            }
            
            // Ocultar resultados si están visibles
            resultsContainer.classList.add('d-none');
        });
    }
    
    /**
     * Compara los medicamentos seleccionados
     */
    async function compareSelectedMedicines() {
        if (!selectedMeds.med1 || !selectedMeds.med2) {
            alert('Seleccione dos medicamentos para comparar');
            return;
        }
        
        try {
            // Mostrar cargando y ocultar resultados
            loadingEl.classList.remove('d-none');
            resultsContainer.classList.add('d-none');
            
            // Obtener los números de registro
            const nregistro1 = selectedMeds.med1.nregistro;
            const nregistro2 = selectedMeds.med2.nregistro;
            
            // Hacer la petición al endpoint de comparación
            const response = await fetch(`/api/comparar?nregistro1=${nregistro1}&nregistro2=${nregistro2}`);
            const result = await response.json();
            
            // Ocultar cargando
            loadingEl.classList.add('d-none');
            
            // Mostrar resultados
            displayInteractionResults(result);
            
        } catch (error) {
            console.error('Error al comparar medicamentos:', error);
            loadingEl.classList.add('d-none');
            alert('Ocurrió un error al comparar los medicamentos. Inténtelo de nuevo.');
        }
    }
    
    /**
     * Muestra los resultados de la interacción
     * @param {Object} result - Resultado de la comparación
     */
    function displayInteractionResults(result) {
        // Configurar nivel de interacción
        let severityClass = '';
        let severityText = '';
        
        if (result.interaccion.encontrada) {
            switch (result.interaccion.severidad) {
                case 'alta':
                    severityClass = 'alert-danger severity-high';
                    severityText = 'Interacción potencialmente grave';
                    break;
                case 'media':
                    severityClass = 'alert-warning severity-medium';
                    severityText = 'Interacción moderada - Precaución';
                    break;
                case 'baja':
                    severityClass = 'alert-info severity-low';
                    severityText = 'Interacción de baja gravedad';
                    break;
                default:
                    severityClass = 'alert-secondary severity-unknown';
                    severityText = 'Interacción detectada - Severidad desconocida';
            }
        } else {
            severityClass = 'alert-success severity-none';
            severityText = 'No se detectaron interacciones';
        }
        
        interactionLevelEl.className = `alert ${severityClass}`;
        interactionLevelEl.textContent = severityText;
        
        // Mostrar efectos
        effectsEl.innerHTML = result.interaccion.descripcion || 'No hay información disponible sobre los efectos.';
        
        // Mostrar recomendaciones
        recommendationsEl.innerHTML = result.interaccion.recomendacion || 'Consulte a un profesional sanitario para obtener recomendaciones específicas.';
        
        // Mostrar el contenedor de resultados
        resultsContainer.classList.remove('d-none');
        
        // Hacer scroll a los resultados
        resultsContainer.scrollIntoView({ behavior: 'smooth' });
    }
    
    /**
     * Función utilitaria para limitar la frecuencia de eventos
     * @param {Function} func - Función a ejecutar
     * @param {number} wait - Tiempo de espera en ms
     * @returns {Function} - Función con delay
     */
    function debounce(func, wait) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => {
                func.apply(context, args);
            }, wait);
        };
    }
});
```

## Paso 5: Configurar el package.json

1. **Actualiza el archivo package.json para añadir scripts**:

```json
{
  "name": "medinteract",
  "version": "1.0.0",
  "description": "Aplicación para comparar interacciones entre medicamentos",
  "main": "server/server.js",
  "scripts": {
    "start": "node server/server.js",
    "dev": "nodemon server/server.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [
    "medicamentos",
    "interacciones",
    "CIMA",
    "AEMPS"
  ],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "axios": "^1.6.2",
    "body-parser": "^1.20.2",
    "cors": "^2.8.5",
    "express": "^4.18.2"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

## Paso 6: Iniciar y probar la aplicación

1. **Inicia la aplicación en modo desarrollo**:
   - En la terminal de VS Code, ejecuta:
   ```bash
   npm run dev
   ```

2. **Abre tu navegador y accede**:
   - Visita `http://localhost:3000`
   - Deberías ver la interfaz de MedInteract

3. **Prueba la aplicación**:
   - Busca un medicamento (p. ej. "paracetamol")
   - Selecciona un resultado
   - Busca otro medicamento (p. ej. "ibuprofeno")
   - Selecciona un resultado 
   - Haz clic en "Comparar"
   - Verás los resultados de la interacción

## Paso 7: Mejoras futuras (si tienes más conocimientos)

1. **Almacenamiento en caché**:
   - Implementa Redis o almacenamiento local para guardar resultados frecuentes

2. **Mejora del análisis de texto**:
   - Añade algoritmos más sofisticados para detectar interacciones en las fichas técnicas

3. **Base de datos de interacciones**:
   - Crea una base de datos propia con interacciones conocidas para complementar los datos de CIMA

4. **Despliegue en producción**:
   - Publica tu aplicación en servicios como Heroku, Vercel o Netlify

## Notas importantes

1. **Limitaciones**:
   - Esta versión básica sólo detecta interacciones explícitamente mencionadas en las fichas técnicas
   - No incluye un análisis avanzado de severidad

2. **Disclaimer legal**:
   - Incluye claramente que la aplicación es solo informativa y no sustituye el consejo médico

3. **CORS y proxies**:
   - El servidor actúa como proxy para evitar problemas de CORS con la API de CIMA

4. **Actualizaciones de la API**:
   - Verifica periódicamente si hay cambios en la API de CIMA que puedan afectar a tu aplicación
