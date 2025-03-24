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