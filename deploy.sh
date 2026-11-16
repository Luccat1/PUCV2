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

# Step 2: Clean and Copy JavaScript files (excluding test suites from production)
echo -e "${YELLOW}▶ Preparing files for PUCV2English/...${NC}"
mkdir -p PUCV2English
rm -f PUCV2English/*.js PUCV2English/*.html

COPIED=0
for js in dist/*.js; do
  fname=$(basename "$js")
  if [[ "$fname" == Test* ]]; then
    echo -e "  ${BLUE}ℹ${NC} $fname (omitted from production package)"
  else
    cp "$js" "PUCV2English/$fname"
    echo -e "  ${GREEN}✓${NC} $fname"
    COPIED=$((COPIED + 1))
  fi
done

echo -e "${GREEN}✓ Copied: $COPIED JavaScript production files${NC}"
echo

# Step 2.5: Copy HTML templates
echo -e "${YELLOW}▶ Copying HTML templates from src/...${NC}"
cp src/*.html PUCV2English/
HTML_COUNT=$(ls -1 src/*.html 2>/dev/null | wc -l)
echo -e "${GREEN}✓ All $HTML_COUNT HTML templates copied${NC}"
echo

# Step 3: Verify build integrity
if [ "$COPIED" -eq 0 ] || [ "$HTML_COUNT" -eq 0 ]; then
  echo -e "${RED}✗ Error: No files were prepared for deployment.${NC}"
  exit 1
fi

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
