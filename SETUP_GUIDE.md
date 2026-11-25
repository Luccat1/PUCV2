# SETUP_GUIDE.md — TypeScript Build & Deployment Setup

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

## 3. Preparar los Archivos de Producción

La carpeta **`PUCV2English/`** es el directorio de producción con los archivos listos para Google Apps Script. El script `deploy.sh` compila y copia todo (los `.js` desde `dist/`, los `.html` desde `src/`; los tests no se incluyen):

```bash
bash deploy.sh
```

## 4. Despliegue a Google Apps Script

**Recomendado: `clasp`.** Una sola vez: `npm i -g @google/clasp`, `clasp login` y un archivo `.clasp.json` con `{"scriptId":"<ID del script>","rootDir":"PUCV2English"}`. Luego, cada vez:

```bash
bash deploy.sh && clasp push -f
```

`clasp push` reemplaza todos los archivos del proyecto remoto. Mantiene el `appsscript.json` de `PUCV2English/`.

**Alternativa manual:** en el Sheet, `Extensiones` > `Apps Script`, crea un archivo por cada `.js` (tipo Script) y `.html` (tipo HTML) de `PUCV2English/`, sin extensión, y pega su contenido. Sube **todos**: los módulos se llaman entre sí y un archivo desactualizado produce `ReferenceError`.

Consulta el archivo [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) para un listado completo de archivos y procedimiento de pruebas.
