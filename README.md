Esta webapp ayuda a comparar medicamentos y bebe directamente de la base de datos de CIMA AEMPS -> https://sede.aemps.gob.es/docs/CIMA-REST-API_1_19.pdf

# MedInteract España

MedInteract España es una aplicación web para verificar posibles interacciones entre medicamentos utilizando datos oficiales de la Agencia Española de Medicamentos y Productos Sanitarios (AEMPS).

## Características

- Búsqueda de medicamentos por nombre usando la base de datos CIMA
- Detección de interacciones medicamentosas a partir de:
  - Fichas técnicas oficiales (sección 4.5)
  - Base de datos propia de interacciones conocidas
  - Análisis por grupos farmacológicos
- Clasificación de la severidad de las interacciones (alta, media, baja)
- Recomendaciones específicas para cada interacción
- Interfaz de usuario intuitiva y responsive
- Sistema de caché para mejorar el rendimiento

## Requisitos previos

- [Node.js](https://nodejs.org/) (v14.0.0 o superior)
- [npm](https://www.npmjs.com/) (normalmente viene con Node.js)
- Acceso a internet (para comunicación con la API de CIMA)

## Instalación

1. Clona este repositorio:
   ```bash
   git clone https://github.com/tu-usuario/medinteract-espana.git
   cd medinteract-espana
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Verifica la estructura de carpetas:
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
     │   ├── cache.js
     │   ├── database.js
     │   ├── interactions-analyzer.js
     │   ├── server.js
     │   └── data/
     │       └── interactions.json (se generará automáticamente)
     ├── package.json
     └── README.md
   ```

## Uso

1. Inicia la aplicación en modo desarrollo:
   ```bash
   npm run dev
   ```

2. Abre tu navegador y accede a:
   ```
   http://localhost:3000
   ```

3. Para usar la aplicación:
   - Busca y selecciona el primer medicamento
   - Busca y selecciona el segundo medicamento
   - Haz clic en "Comparar"
   - Revisa los resultados del análisis

## Despliegue en producción

### Opción 1: Servidor propio

1. Construye la aplicación para producción:
   ```bash
   npm run start
   ```

2. La aplicación se ejecutará en `http://localhost:3000` (o el puerto configurado en las variables de entorno)

### Opción 2: Heroku

1. Crea una cuenta en [Heroku](https://heroku.com/) si no tienes una

2. Instala la [CLI de Heroku](https://devcenter.heroku.com/articles/heroku-cli)

3. Inicia sesión y crea una nueva aplicación:
   ```bash
   heroku login
   heroku create medinteract-espana
   ```

4. Despliega la aplicación:
   ```bash
   git push heroku main
   ```

5. Abre la aplicación:
   ```bash
   heroku open
   ```

## Estructura del proyecto

- **public/**: Contiene archivos estáticos (HTML, CSS, JavaScript del cliente)
  - **css/styles.css**: Estilos de la aplicación
  - **js/app.js**: Lógica del frontend
  - **index.html**: Página principal

- **server/**: Contiene el código del servidor
  - **api.js**: Define los endpoints de la API
  - **cache.js**: Sistema de caché para reducir llamadas a CIMA
  - **database.js**: Gestión de la base de datos local de interacciones
  - **interactions-analyzer.js**: Análisis de interacciones por grupos farmacológicos
  - **server.js**: Configuración principal del servidor Express
  - **data/**: Almacenamiento de datos locales

## API y endpoints

La aplicación ofrece los siguientes endpoints:

- `GET /api/medicamentos?nombre=X`: Busca medicamentos por nombre
- `GET /api/medicamento/:nregistro`: Obtiene información detallada de un medicamento
- `GET /api/interacciones/:nregistro`: Obtiene las interacciones desde la ficha técnica
- `GET /api/comparar?nregistro1=X&nregistro2=Y`: Compara dos medicamentos para detectar interacciones

## Cómo contribuir

1. Haz un fork del repositorio
2. Crea una rama para tu función (`git checkout -b feature/amazing-feature`)
3. Realiza tus cambios y haz commit (`git commit -m 'Add some amazing feature'`)
4. Sube los cambios a tu fork (`git push origin feature/amazing-feature`)
5. Abre un Pull Request

### Áreas de mejora

- Ampliación de la base de datos de interacciones conocidas
- Mejora del algoritmo de análisis de texto de las fichas técnicas
- Implementación de interacciones medicamento-alimento
- Soporte para multiples idiomas

## Limitaciones

- La aplicación se basa en la información disponible en las fichas técnicas de CIMA
- No todas las interacciones están documentadas o son detectables automáticamente
- La aplicación es solo informativa y no sustituye el consejo médico profesional

## Tecnologías utilizadas

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js con Express
- **APIs externas**: CIMA (AEMPS)

## Contacto

Iván - [calderonmartinezivan@gmail.com](mailto:calderonmartinezivan@gmail.com)

Enlace del proyecto: [https://github.com/tu-usuario/medinteract-espana](https://github.com/tu-usuario/medinteract-espana)

## Agradecimientos

- [AEMPS](https://www.aemps.gob.es/) por proporcionar acceso a la API de CIMA
- [Bootstrap](https://getbootstrap.com/) por los componentes de UI
- [Bootstrap Icons](https://icons.getbootstrap.com/) por los iconos utilizados

## Aviso legal

Esta aplicación es solo para fines informativos y educativos. No sustituye el consejo médico profesional. Consulte siempre a un profesional de la salud antes de tomar decisiones sobre su medicación.
