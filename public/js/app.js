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
     * Busca medicamentos y muestra sugerencias con mejoras
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
            // Mostrar indicador de carga en la lista de sugerencias
            suggestionsList.innerHTML = '<li class="list-group-item text-center"><div class="spinner-border spinner-border-sm text-primary" role="status"></div> Buscando...</li>';
            suggestionsList.classList.add('show');
            
            const response = await fetch(`/api/medicamentos?nombre=${encodeURIComponent(query)}`);
            const data = await response.json();
            
            suggestionsList.innerHTML = '';
            
            if (data.resultados && data.resultados.length > 0) {
                suggestionsList.classList.add('show');
                
                // Limitar a 10 resultados para mejor rendimiento
                data.resultados.slice(0, 10).forEach(med => {
                    const item = document.createElement('li');
                    item.className = 'list-group-item';
                    item.dataset.nregistro = med.nregistro;
                    
                    const principiosActivos = med.pactivos || 'No disponible';
                    
                    // Destacar la parte del texto que coincide con la búsqueda
                    const nombreHighlighted = highlightMatch(med.nombre, query);
                    
                    item.innerHTML = `
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <strong>${nombreHighlighted}</strong><br>
                                <small class="text-muted">${principiosActivos}</small>
                            </div>
                            <span class="badge bg-light text-secondary rounded-pill">Seleccionar</span>
                        </div>
                    `;
                    
                    suggestionsList.appendChild(item);
                });
                
                // Añadir mensaje si hay más resultados
                if (data.resultados.length > 10) {
                    const moreItem = document.createElement('li');
                    moreItem.className = 'list-group-item text-center text-muted';
                    moreItem.innerHTML = `<small>Mostrando 10 de ${data.resultados.length} resultados. Refine su búsqueda para ver más opciones.</small>`;
                    suggestionsList.appendChild(moreItem);
                }
            } else {
                suggestionsList.classList.add('show');
                const item = document.createElement('li');
                item.className = 'list-group-item text-center';
                item.innerHTML = '<i class="bi bi-search"></i> No se encontraron resultados';
                suggestionsList.appendChild(item);
            }
        } catch (error) {
            console.error('Error en la búsqueda:', error);
            
            suggestionsList.innerHTML = '';
            suggestionsList.classList.add('show');
            const item = document.createElement('li');
            item.className = 'list-group-item text-danger text-center';
            item.innerHTML = '<i class="bi bi-exclamation-triangle"></i> Error al buscar medicamentos';
            suggestionsList.appendChild(item);
        }
    }
    
    /**
     * Resalta la parte del texto que coincide con la consulta
     * @param {string} text - Texto completo
     * @param {string} query - Término de búsqueda
     * @returns {string} - Texto con la parte coincidente resaltada
     */
    function highlightMatch(text, query) {
        if (!text || !query) return text;
        
        const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
        return text.replace(regex, '<span class="highlight">$1</span>');
    }
    
    /**
     * Escapa caracteres especiales para RegExp
     * @param {string} string - Cadena a escapar
     * @returns {string} - Cadena escapada
     */
    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
            // Mostrar indicador de carga
            target.innerHTML = '<div class="text-center"><div class="spinner-border spinner-border-sm text-primary" role="status"></div> Cargando información...</div>';
            
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
                principiosActivosHtml += `<li><i class="bi bi-dot"></i> ${pa.nombre} ${pa.cantidad || ''} ${pa.unidad || ''}</li>`;
            });
            principiosActivosHtml += '</ul>';
        } else {
            principiosActivosHtml = '<p class="mb-0 text-muted fst-italic">No hay información disponible</p>';
        }
        
        // Información adicional
        let infoAdicional = '';
        if (medicine.formaFarmaceutica) {
            infoAdicional += `<p class="mb-1 small"><strong>Forma farmacéutica:</strong> ${medicine.formaFarmaceutica.nombre || 'No disponible'}</p>`;
        }
        if (medicine.dosis) {
            infoAdicional += `<p class="mb-1 small"><strong>Dosis:</strong> ${medicine.dosis}</p>`;
        }
        if (medicine.cpresc) {
            infoAdicional += `<p class="mb-1 small"><strong>Prescripción:</strong> ${medicine.cpresc}</p>`;
        }
        
        col.innerHTML = `
            <div class="card h-100 shadow-sm scale-in">
                <div class="card-header bg-light d-flex justify-content-between align-items-center">
                    <h6 class="mb-0"><i class="bi bi-capsule me-2"></i>Medicamento ${medNum}</h6>
                    <button class="btn btn-sm btn-outline-danger remove-med" data-med-num="${medNum}">
                        <i class="bi bi-x-lg"></i>
                    </button>
                </div>
                <div class="card-body">
                    <h5 class="card-title">${medicine.nombre}</h5>
                    <h6 class="card-subtitle mb-3 text-muted">${medicine.labtitular || 'Laboratorio no disponible'}</h6>
                    
                    <div class="mb-3">
                        <p class="mb-1"><strong>Principios activos:</strong></p>
                        ${principiosActivosHtml}
                    </div>
                    
                    <div class="mt-3">
                        ${infoAdicional}
                    </div>
                </div>
                <div class="card-footer bg-white">
                    <small class="text-muted">
                        <i class="bi bi-info-circle me-1"></i>
                        Nº Registro: ${medicine.nregistro}
                        ${medicine.ema ? ' · Registro centralizado (EMA)' : ''}
                    </small>
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
            
            // Hacer scroll al indicador de carga
            loadingEl.scrollIntoView({ behavior: 'smooth' });
            
            // Obtener los números de registro
            const nregistro1 = selectedMeds.med1.nregistro;
            const nregistro2 = selectedMeds.med2.nregistro;
            
            // Hacer la petición al endpoint de comparación
            const response = await fetch(`/api/comparar?nregistro1=${nregistro1}&nregistro2=${nregistro2}`);
            const result = await response.json();
            
            // Pequeña pausa para mostrar el cargador (mejor UX)
            await new Promise(resolve => setTimeout(resolve, 800));
            
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
        let severityIcon = '';
        
        if (result.interaccion.encontrada) {
            switch (result.interaccion.severidad) {
                case 'alta':
                    severityClass = 'alert-danger severity-high';
                    severityText = 'Interacción potencialmente grave';
                    severityIcon = 'exclamation-triangle-fill';
                    break;
                case 'media':
                    severityClass = 'alert-warning severity-medium';
                    severityText = 'Interacción moderada - Precaución';
                    severityIcon = 'exclamation-circle';
                    break;
                case 'baja':
                    severityClass = 'alert-info severity-low';
                    severityText = 'Interacción de baja gravedad';
                    severityIcon = 'info-circle';
                    break;
                default:
                    severityClass = 'alert-secondary severity-unknown';
                    severityText = 'Interacción detectada - Severidad desconocida';
                    severityIcon = 'question-circle';
            }
        } else {
            severityClass = 'alert-success severity-none';
            severityText = 'No se detectaron interacciones';
            severityIcon = 'check-circle';
        }
        
        interactionLevelEl.className = `alert ${severityClass}`;
        interactionLevelEl.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="bi bi-${severityIcon} fs-4 me-2"></i>
                <div>
                    <strong>${severityText}</strong>
                    ${result.interaccion.encontrada ? 
                        `<div class="mt-1 small">Entre ${result.medicamento1.nombre} y ${result.medicamento2.nombre}</div>` 
                        : ''}
                </div>
            </div>`;
        
        // Mostrar efectos con más detalle
        let effectsHtml = `<p>${result.interaccion.descripcion || 'No hay información disponible sobre los efectos.'}</p>`;
        
        if (result.interaccion.detalles) {
            effectsHtml += `
                <div class="mt-3 p-3 bg-light border rounded interaction-details">
                    <small class="text-muted d-block mb-1">Extracto de la ficha técnica:</small>
                    <p class="mb-0">${result.interaccion.detalles}</p>
                </div>
            `;
        }
        
        if (result.interaccion.gruposFarmacologicos) {
            effectsHtml += `
                <div class="mt-2 small text-muted">
                    <i class="bi bi-diagram-3 me-1"></i>
                    Grupos farmacológicos involucrados: ${result.interaccion.gruposFarmacologicos.join(', ')}
                </div>
            `;
        }
        
        if (result.interaccion.fuente) {
            effectsHtml += `
                <div class="mt-2 small interaction-source">
                    <i class="bi bi-journal-text me-1"></i>
                    Fuente: ${result.interaccion.fuente}
                </div>
            `;
        }
        
        effectsEl.innerHTML = effectsHtml;
        
        // Mostrar recomendaciones
        recommendationsEl.innerHTML = `
            <div class="d-flex">
                <div class="me-2">
                    <i class="bi bi-lightbulb-fill text-warning fs-4"></i>
                </div>
                <div>
                    ${result.interaccion.recomendacion || 
                    'Consulte a un profesional sanitario para obtener recomendaciones específicas.'}
                </div>
            </div>
        `;
        
        // Mostrar el contenedor de resultados con animación
        resultsContainer.classList.remove('d-none');
        resultsContainer.classList.add('scale-in');
        
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