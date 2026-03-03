# SETUP_GUIDE.md — Clasp + TypeScript Setup

Este proyecto utiliza **clasp** para permitir el desarrollo local con **TypeScript**. Sigue estos pasos para conectar tu entorno local con el script de Google.

## 1. Instalación de dependencias
Asegúrate de tener Node.js instalado. Luego ejecuta:
```bash
npm install
```

## 2. Habilitar Google Apps Script API
Debes habilitar la API de Apps Script en tu cuenta de Google:
👉 [https://script.google.com/home/usersettings](https://script.google.com/home/usersettings)

## 3. Login en clasp
Ejecuta el siguiente comando y sigue las instrucciones en el navegador:
```bash
npx clasp login
```

## 4. Vincular el proyecto
Como este es un proyecto vinculado a una hoja de cálculo (container-bound), necesitamos el ID del script.
1. Abre tu Google Sheet.
2. Ve a **Extensiones** > **Apps Script**.
3. En la configuración del proyecto (icono de engranaje ⚙️), copia el **ID del script**.
4. En tu terminal (dentro de la carpeta `src/`), ejecuta:
```bash
cd src
npx clasp clone "TU_SCRIPT_ID_AQUI"
```

## 5. Desarrollo y Despliegue
- Para subir tus cambios al Sheet: `npm run push`
- Para bajar cambios hechos en el editor web: `npm run pull`
- Para ver errores de TypeScript: `npm run build`

> **Nota**: El archivo `src/.clasp.json` se creará automáticamente al clonar. No lo subas a Git si contiene información privada, aunque normalmente solo tiene el scriptId.
