# SETUP_GUIDE.md — TypeScript Build Setup

Este proyecto utiliza **TypeScript** para permitir el desarrollo local estructurado antes de llevar tu código a Google Apps Script.

## 1. Instalación de dependencias

Asegúrate de tener Node.js instalado. Luego ejecuta en la raíz del proyecto:

```bash
npm install
```

## 2. Desarrollo y Compilación

Cualquier cambio dentro de la carpeta `src/` (en tus archivos `.ts` y `.html`) debe ser compilado.

Para transpilar los archivos de TypeScript a JavaScript, ejecuta:
```bash
npm run build
```
Esto generará los archivos JavaScript puros dentro de la carpeta `dist/`.

## 3. Despliegue Manual a Apps Script

- Copia el contenido de los archivos `.js` recien generados en la carpeta `dist/`.
- Pégalos sobre los archivos de código correspondientes en el editor de Apps Script en la web (`Extensiones > Apps Script`).
- Los archivos `.html` debes copiarlos directamente desde la carpeta `src/` hacia el editor web.
