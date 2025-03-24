// server/interactions-analyzer.js

// Mapeo simplificado de principios activos a grupos farmacológicos
const drugGroups = {
    // Antiinflamatorios no esteroideos (AINEs)
    "aines": ["ibuprofeno", "naproxeno", "diclofenaco", "ketorolaco", "dexketoprofeno", "aceclofenaco"],
    
    // Inhibidores de la bomba de protones
    "ibp": ["omeprazol", "pantoprazol", "lansoprazol", "esomeprazol", "rabeprazol"],
    
    // Anticoagulantes
    "anticoagulantes": ["warfarina", "acenocumarol", "apixaban", "rivaroxaban", "dabigatran", "edoxaban"],
    
    // Antiagregantes plaquetarios
    "antiagregantes": ["aspirina", "clopidogrel", "prasugrel", "ticagrelor", "ácido acetilsalicílico"],
    
    // Estatinas
    "estatinas": ["simvastatina", "atorvastatina", "rosuvastatina", "pravastatina", "lovastatina", "fluvastatina", "pitavastatina"],
    
    // IECA (inhibidores de la enzima convertidora de angiotensina)
    "ieca": ["enalapril", "ramipril", "lisinopril", "captopril", "perindopril", "fosinopril", "quinapril", "benazepril"],
    
    // ARA-II (antagonistas de los receptores de angiotensina II)
    "ara-ii": ["losartan", "valsartan", "candesartan", "telmisartan", "irbesartan", "olmesartan", "eprosartan"],
    
    // Diuréticos
    "diureticos": ["hidroclorotiazida", "furosemida", "espironolactona", "torasemida", "indapamida", "clortalidona", "eplerenona", "amilorida"],
    
    // ISRS (inhibidores selectivos de la recaptación de serotonina)
    "isrs": ["fluoxetina", "paroxetina", "sertralina", "citalopram", "escitalopram", "fluvoxamina"],
    
    // Opioides
    "opioides": ["tramadol", "morfina", "fentanilo", "oxicodona", "tapentadol", "codeína", "buprenorfina", "hidrocodona"]
  };
  
  // Interacciones conocidas entre grupos farmacológicos
  const groupInteractions = [
    {
      groups: ["aines", "anticoagulantes"],
      severity: "alta",
      description: "Aumento significativo del riesgo de sangrado, especialmente gastrointestinal",
      recommendation: "Evitar esta combinación. Si es necesario, considerar protección gástrica y vigilar signos de sangrado."
    },
    {
      groups: ["aines", "antiagregantes"],
      severity: "media",
      description: "Aumento del riesgo de sangrado y posible reducción del efecto antiagregante",
      recommendation: "Utilizar con precaución. Considerar dosis más bajas y durante el menor tiempo posible."
    },
    {
      groups: ["ibp", "antiagregantes"],
      severity: "media",
      description: "Posible reducción de la activación de algunos antiagregantes, especialmente clopidogrel",
      recommendation: "Considerar usar pantoprazol en lugar de omeprazol/esomeprazol con clopidogrel."
    },
    {
      groups: ["estatinas", "ibp"],
      severity: "baja",
      description: "Posible aumento de los niveles de algunas estatinas",
      recommendation: "Monitorizar efectos adversos musculares como dolor o debilidad."
    },
    {
      groups: ["ieca", "diureticos"],
      severity: "baja",
      description: "Puede potenciar el efecto hipotensor y aumentar el riesgo de hipotensión",
      recommendation: "Monitorizar presión arterial, especialmente al inicio del tratamiento o al ajustar dosis."
    },
    {
      groups: ["isrs", "opioides"],
      severity: "media",
      description: "Aumento del riesgo de síndrome serotoninérgico",
      recommendation: "Vigilar síntomas como agitación, temblor, hipertermia y alteraciones mentales."
    }
  ];
  
  // Función para identificar el grupo farmacológico de un principio activo
  function identifyDrugGroup(principioActivo) {
    if (!principioActivo) return null;
    
    const normalizedPrincipio = principioActivo.toLowerCase().trim();
    
    for (const [group, drugs] of Object.entries(drugGroups)) {
      if (drugs.some(drug => normalizedPrincipio.includes(drug))) {
        return group;
      }
    }
    
    return null;
  }
  
  // Función para analizar interacciones basadas en grupos farmacológicos
  function analyzeGroupInteractions(principiosActivos1, principiosActivos2) {
    if (!principiosActivos1 || !principiosActivos2 || 
        !principiosActivos1.length || !principiosActivos2.length) {
      return null;
    }
    
    // Identificar grupos de los principios activos
    const groups1 = principiosActivos1
      .map(identifyDrugGroup)
      .filter(Boolean); // Eliminar nulls
    
    const groups2 = principiosActivos2
      .map(identifyDrugGroup)
      .filter(Boolean); // Eliminar nulls
    
    // Si no podemos identificar grupos, no podemos analizar
    if (!groups1.length || !groups2.length) {
      return null;
    }
    
    // Buscar interacciones entre los grupos
    for (const group1 of groups1) {
      for (const group2 of groups2) {
        // Evitar comparar un grupo consigo mismo si es el mismo medicamento
        if (principiosActivos1 === principiosActivos2 && group1 === group2) {
          continue;
        }
        
        // Buscar interacción en la lista conocida
        const interaction = groupInteractions.find(i => 
          (i.groups.includes(group1) && i.groups.includes(group2))
        );
        
        if (interaction) {
          return {
            encontrada: true,
            severidad: interaction.severity,
            descripcion: `Interacción entre grupos farmacológicos: ${interaction.description}`,
            recomendacion: interaction.recommendation,
            gruposFarmacologicos: [group1, group2],
            fuente: 'Análisis de grupos farmacológicos'
          };
        }
      }
    }
    
    return null;
  }
  
  module.exports = {
    analyzeGroupInteractions,
    identifyDrugGroup,
    drugGroups
  };