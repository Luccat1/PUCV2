#!/bin/bash
set -e

echo "Building and deploying PUCV2English..."
npm run build

cp dist/Config.js PUCV2English/
cp dist/Utils.js PUCV2English/
cp dist/Correos.js PUCV2English/
cp dist/ListaFinal.js PUCV2English/
cp dist/Evaluacion.js PUCV2English/
cp dist/Seleccionados.js PUCV2English/
cp dist/InicioClases.js PUCV2English/
cp dist/Menu.js PUCV2English/
cp dist/Dashboard.js PUCV2English/
cp dist/WebApp.js PUCV2English/
cp dist/TestInicioClases.js PUCV2English/
cp dist/Placement.js PUCV2English/
cp src/*.html PUCV2English/

echo "✓ All files copied"
ls PUCV2English/*.js | wc -l | xargs echo "✓ JavaScript files:"
ls PUCV2English/*.html | wc -l | xargs echo "✓ HTML files:"
echo "✓ Ready for Google Apps Script deployment"
echo "📋 See DEPLOYMENT_CHECKLIST.md for next steps"
