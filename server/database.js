// server/database.js
const fs = require('fs');
const path = require('path');

// Asegúrate de que exista el directorio de datos
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

// Ruta al archivo de interacciones
const interactionsFile = path.join(dataDir, 'interactions.json');

// Interacciones conocidas (base inicial)
const knownInteractions = [
  {
    principios: ["paracetamol", "ibuprofeno"],
    severidad: "baja",
    descripcion: "La combinación de paracetamol e ibuprofeno puede aumentar la eficacia analgésica sin aumentar significativamente los efectos adversos.",
    recomendacion: "Esta combinación es habitualmente utilizada y segura en la mayoría de los pacientes. Mantenga las dosis recomendadas de cada medicamento."
  },
  {
    principios: ["omeprazol", "clopidogrel"],
    severidad: "alta",
    descripcion: "El omeprazol puede reducir la eficacia del clopidogrel al interferir con su activación a través del citocromo P450 2C19, aumentando el riesgo de eventos cardiovasculares.",
    recomendacion: "Se recomienda usar pantoprazol u otro inhibidor de la bomba de protones que no interfiera significativamente con la activación del clopidogrel."
  },
  {
    principios: ["warfarina", "aspirina"],
    severidad: "alta",
    descripcion: "La combinación aumenta significativamente el riesgo de sangrado debido a la potenciación del efecto anticoagulante.",
    recomendacion: "Esta combinación debe evitarse. Si es absolutamente necesario, requiere monitorización estricta del INR y vigilancia de signos de sangrado."
  },
  {
    principios: ["simvastatina", "amlodipino"],
    severidad: "media",
    descripcion: "El amlodipino puede aumentar los niveles de simvastatina, incrementando el riesgo de miopatía y rabdomiólisis.",
    recomendacion: "Se recomienda no superar los 20mg diarios de simvastatina cuando se administra con amlodipino, o considerar otra estatina como atorvastatina."
  },
  {
    principios: ["fluoxetina", "tramadol"],
    severidad: "media",
    descripcion: "Aumenta el riesgo de síndrome serotoninérgico debido a la potenciación de los efectos serotoninérgicos.",
    recomendacion: "Vigilar síntomas como agitación, temblores, hipertermia y cambios en el estado mental. Considerar alternativas para el manejo del dolor."
  },
  {
    principios: ["enalapril", "espironolactona"],
    severidad: "media",
    descripcion: "Riesgo aumentado de hiperpotasemia, especialmente en pacientes con insuficiencia renal o diabetes.",
    recomendacion: "Monitorizar los niveles de potasio sérico regularmente, especialmente al iniciar el tratamiento o ajustar dosis."
  },
  {
    principios: ["levotiroxina", "carbonato de calcio"],
    severidad: "baja",
    descripcion: "El carbonato de calcio puede reducir la absorción de levotiroxina si se toman simultáneamente.",
    recomendacion: "Separar la administración al menos 4 horas para evitar la interferencia en la absorción."
  }
];

// Inicializar el archivo si no existe
if (!fs.existsSync(interactionsFile)) {
  fs.writeFileSync(interactionsFile, JSON.stringify(knownInteractions, null, 2));
}

// Leer interacciones
function getInteractions() {
  try {
    const data = fs.readFileSync(interactionsFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error al leer interacciones:', error);
    return knownInteractions;
  }
}

// Buscar interacciones para dos principios activos
function findInteraction(principio1, principio2) {
  const interactions = getInteractions();
  
  // Normalizar los nombres (minúsculas, sin espacios extras)
  const normalize = (str) => str.toLowerCase().trim();
  const p1 = normalize(principio1);
  const p2 = normalize(principio2);
  
  // Buscar interacción en cualquier orden
  return interactions.find(interaction => {
    const interactionPrinciples = interaction.principios.map(normalize);
    return (interactionPrinciples.includes(p1) && interactionPrinciples.includes(p2));
  });
}

// Guardar una nueva interacción
function saveInteraction(interaction) {
  try {
    const interactions = getInteractions();
    interactions.push(interaction);
    fs.writeFileSync(interactionsFile, JSON.stringify(interactions, null, 2));
    return true;
  } catch (error) {
    console.error('Error al guardar interacción:', error);
    return false;
  }
}

module.exports = {
  getInteractions,
  findInteraction,
  saveInteraction
};