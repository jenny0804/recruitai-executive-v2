# RecruitAI Executive - Local Setup Guide

Este proyecto es una aplicación de reclutamiento inteligente impulsada por IA (Gemini 2.5 Flash Lite). Sigue estos pasos para ejecutarla en tu máquina local.

## Requisitos Previos

*   **Node.js:** Asegúrate de tener instalada la versión 18 o superior.
*   **NPM:** Viene instalado con Node.js.
*   **API Key de Gemini:** Necesitas una clave de API de [Google AI Studio](https://aistudio.google.com/).

## Pasos para la Instalación

1.  **Descargar los archivos:**
    Descarga o clona todos los archivos del proyecto en una carpeta local.

2.  **Instalar dependencias:**
    Abre una terminal en la carpeta del proyecto y ejecuta:
    ```bash
    npm install
    ```

3.  **Configurar variables de entorno:**
    Crea un archivo llamado `.env` en la raíz del proyecto (puedes copiar el contenido de `.env.example`) y añade tu clave de API:
    ```env
    VITE_GEMINI_API_KEY=tu_clave_aqui
    ```
    *Nota: En el entorno local de Vite, las variables deben empezar con `VITE_` para ser accesibles desde el cliente.*

4.  **Actualizar el código del servicio (Local):**
    En el archivo `src/services/gemini.ts`, asegúrate de que la API Key se lea correctamente. Si usas Vite localmente, cambia `process.env.GEMINI_API_KEY` por `import.meta.env.VITE_GEMINI_API_KEY`.

5.  **Ejecutar la aplicación:**
    En la terminal, ejecuta:
    ```bash
    npm run dev
    ```
    La aplicación estará disponible en `http://localhost:3000` (o el puerto que indique la terminal).

## Estructura del Proyecto

*   `src/App.tsx`: Interfaz principal y lógica del reclutador.
*   `src/services/gemini.ts`: Conexión con el modelo de IA.
*   `src/types.ts`: Definiciones de tipos para TypeScript.

## Notas Importantes

*   **Sin Base de Datos:** Actualmente, la aplicación no guarda datos permanentemente. Si recargas la página, los archivos y el chat se borrarán. Usa la función de "Exportar" para guardar tus análisis.
*   **Seguridad:** Nunca compartas tu archivo `.env` ni subas tu API Key a repositorios públicos.
