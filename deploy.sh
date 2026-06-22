#!/bin/bash

################################################################################
# deploy.sh — Build and prepare PUCV2English for Google Apps Script deployment
#
# Usage: bash deploy.sh [--help]
#
# This script:
# 1. Compiles TypeScript to JavaScript
# 2. Copies compiled files to PUCV2English/ for GAS deployment
# 3. Verifies all required files exist
# 4. Displays deployment checklist
#
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE} PUCV2English Deployment${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo

# Step 1: Build
echo -e "${YELLOW}▶ Compiling TypeScript...${NC}"
if npm run build > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Build successful (0 errors)${NC}"
else
  echo -e "${RED}✗ Build failed${NC}"
  npm run build
  exit 1
fi
echo

# Step 2: Copy JavaScript files
echo -e "${YELLOW}▶ Copying compiled files to PUCV2English/...${NC}"

JS_FILES=(
  "Config.js"
  "Utils.js"
  "Correos.js"
  "ListaFinal.js"
  "Evaluacion.js"
  "Seleccionados.js"
  "InicioClases.js"
  "Menu.js"
  "Dashboard.js"
  "WebApp.js"
  "TestInicioClases.js"
)

COPIED=0
for file in "${JS_FILES[@]}"; do
  if [[ -f "dist/$file" ]]; then
    cp "dist/$file" "PUCV2English/$file"
    echo -e "  ${GREEN}✓${NC} $file"
    ((COPIED++))
  else
    echo -e "  ${RED}✗${NC} $file (not found)"
  fi
done

echo -e "${GREEN}✓ Copied: $COPIED/${#JS_FILES[@]} files${NC}"
echo

# Step 2.5: Copy HTML templates
echo -e "${YELLOW}▶ Copying HTML templates from src/...${NC}"
cp src/*.html PUCV2English/
echo -e "${GREEN}✓ HTML templates copied${NC}"
echo

# Step 3: Verify HTML files
echo -e "${YELLOW}▶ Verifying HTML templates...${NC}"

HTML_FILES=(
  "index.html"
  "DialogSalas.html"
  "CorreoInicioClases.html"
  "CorreoSeleccionado.html"
  "CorreoTestNivel.html"
  "CorreoListaEspera.html"
  "CorreoNoSeleccionado.html"
  "CorreoConfirmacionAcepta.html"
  "CorreoConfirmacionRechaza.html"
)

HTML_OK=0
for file in "${HTML_FILES[@]}"; do
  if [[ -f "PUCV2English/$file" ]]; then
    echo -e "  ${GREEN}✓${NC} $file"
    ((HTML_OK++))
  else
    echo -e "  ${RED}✗${NC} $file (missing)"
  fi
done

echo -e "${GREEN}✓ Found: $HTML_OK/${#HTML_FILES[@]} files${NC}"
echo

# Step 4: Summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Ready for Google Apps Script deployment${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo

echo "📋 Next Steps:"
echo "──────────────"
echo "1. Open: DEPLOYMENT_CHECKLIST.md"
echo "2. Follow instructions to upload files to Google Apps Script"
echo "3. Run tests in Google Sheets"
echo
echo "📁 Files in PUCV2English/:"
echo "  JavaScript: $(ls PUCV2English/*.js 2>/dev/null | wc -l) files"
echo "  HTML:       $(ls PUCV2English/*.html 2>/dev/null | wc -l) files"
echo
