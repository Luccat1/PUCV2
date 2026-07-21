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

La carpeta **`PUCV2English/`** es el directorio de producción que contiene los archivos listos para subir a Google Apps Script. Después de compilar, copia los archivos:

```powershell
# Copiar archivos JS compilados desde dist/ a PUCV2English/
Copy-Item dist\Config.js PUCV2English\
Copy-Item dist\Utils.js PUCV2English\
Copy-Item dist\Correos.js PUCV2English\
Copy-Item dist\ListaFinal.js PUCV2English\
Copy-Item dist\Evaluacion.js PUCV2English\
Copy-Item dist\Seleccionados.js PUCV2English\
Copy-Item dist\InicioClases.js PUCV2English\
Copy-Item dist\Menu.js PUCV2English\
Copy-Item dist\Dashboard.js PUCV2English\
Copy-Item dist\WebApp.js PUCV2English\
Copy-Item dist\TestInicioClases.js PUCV2English\

# Copiar archivos HTML desde src/ a PUCV2English/
Copy-Item src\*.html PUCV2English\
```

> **Nota**: El archivo `src/Dashboard.js` es un archivo JavaScript manual (no compilado desde TypeScript). Se copia directamente.
> **Nota**: La plantilla `CorreoContinuacion.html` (v5.2.1) debe incluirse en la copia de archivos HTML.

## 4. Despliegue a Google Apps Script

1. Abre tu Google Sheet y navega a `Extensiones` > `Apps Script`.
2. Para cada archivo `.js` en `PUCV2English/`, crea un nuevo archivo **Script** en el editor de Apps Script (sin la extensión `.js`).
3. Para cada archivo `.html` en `PUCV2English/`, crea un nuevo archivo **HTML** en el editor de Apps Script (sin la extensión `.html`).
4. Copia y pega el contenido de cada archivo.
5. Guarda el proyecto.

Consulta el archivo [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) para un listado completo de archivos y procedimiento de pruebas.
