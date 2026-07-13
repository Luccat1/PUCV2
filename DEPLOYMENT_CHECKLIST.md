# 📋 PUCV2English v5.1.0 Deployment Checklist

**Updated:** 2026-07-13
**Status:** Ready for Google Apps Script deployment

---

## ✅ Files Ready to Upload

All files have been compiled and copied to `PUCV2English/` folder.

### JavaScript Files (11 total)

Upload each file as a separate **Script** file in Google Apps Script editor:

| File | Purpose | Status |
|------|---------|--------|
| `Config.js` | Configuración global y tipos | ✓ Ready |
| `Utils.js` | Funciones de soporte | ✓ Ready |
| `Correos.js` | Motor de correos (6 lotes + borradores) | ✓ Updated |
| `ListaFinal.js` | Generación de lista final (filtro Acepta+Pagado) | ✓ Updated |
| `Evaluacion.js` | Motor de evaluación de postulaciones | ✓ Ready |
| `Seleccionados.js` | Seleccionados, Lista de Espera y Promoción | ✓ Updated |
| `InicioClases.js` | Notificaciones de inicio de clases | ✓ Ready |
| `Menu.js` | Menú personalizado de Google Sheets | ✓ Updated |
| `Dashboard.js` | Generación del dashboard estadístico | ✓ Ready |
| `WebApp.js` | Panel de control web y endpoints de confirmación | ✓ Updated |
| `TestInicioClases.js` | Tests para inicio de clases | ✓ Ready |

### HTML Files (12 total)

Upload each file as a separate **HTML** file in Google Apps Script editor:

| File | Purpose | Status |
|------|---------|--------|
| `index.html` | Panel de control web (dashboard administrativo) | ✓ Updated |
| `DialogSalas.html` | Modal de entrada de salas por nivel | ✓ Ready |
| `DialogConfirmEval.html` | Diálogo de confirmación de evaluación | ✓ Ready |
| `SidebarConfig.html` | Sidebar de configuración de pesos | ✓ Ready |
| `SidebarRevision.html` | Sidebar de revisión de postulaciones | ✓ Ready |
| `CorreoSeleccionado.html` | Correo de selección (con token de aceptar/rechazar) | ✓ Ready |
| `CorreoTestNivel.html` | Correo para convocatoria a test de nivel | ✓ Ready |
| `CorreoHandPicked.html` | Correo para candidatos seleccionados manualmente | ✓ Ready |
| `CorreoListaEspera.html` | Correo de aviso de ingreso a lista de espera | ✓ Ready |
| **`CorreoEsperaSinCupo.html`** | **Correo de cierre (sin vacantes) para lista de espera** | **✓ NEW** |
| `CorreoNoSeleccionado.html` | Correo de rechazo (excluye seleccionados y lista de espera) | ✓ Ready |
| `CorreoInicioClases.html` | Correo de bienvenida con horarios y salas | ✓ Ready |

> **Nota:** Los correos de confirmación automática (`CorreoConfirmacionAcepta.html` y `CorreoConfirmacionRechaza.html`) también deben ser subidos como archivos HTML.

**Total de archivos HTML a subir: 14** (12 listados arriba + 2 de confirmación)

---

## 📤 Upload Instructions

### Step 1: Open Google Apps Script Editor

```
1. Open Google Sheet: "PUCV2 English"
2. Click: Extensions > Apps Script
3. This opens the Apps Script editor
```

### Step 2: Upload JavaScript Files

For each `.js` file in the table above:

1. Click the **[+] New File** button
2. Select **Script**
3. Name it **exactly** as shown (without `.js` extension)
   - Example: `Config`, `InicioClases`, `Menu` (not `Config.js`)
4. Open file from: `PUCV2English/{filename}.js`
5. **Select all** (Ctrl+A) and **copy** entire content
6. **Paste** into Google Apps Script editor
7. **Save** (Ctrl+S)
8. Repeat for all 11 files

**Order recommendation:**
- `Config` (constants first)
- `Utils` (utility functions)
- `Correos` (email module)
- `ListaFinal` (sheet reading)
- `Evaluacion`, `Seleccionados`, `Dashboard`, `WebApp`
- `InicioClases`, `Menu`, `TestInicioClases`

### Step 3: Upload HTML Files

For each `.html` file:

1. Click the **[+] New File** button
2. Select **HTML**
3. Name it **exactly** as shown (without `.html` extension)
4. Open file from: `PUCV2English/{filename}.html`
5. **Select all** and **copy** entire content
6. **Paste** into HTML editor
7. **Save** (Ctrl+S)
8. Repeat for all 14 files

---

## 🧪 Quick Test (In Google Apps Script)

After uploading all files:

1. In GAS editor, find the **Run** dropdown
2. Select: `testGetNivelesActivos`
3. Click **Run** (▶)
4. Check **Executions** panel (View > Executions)

Expected output:
```
testGetNivelesActivos: OK — Niveles activos: ["B1+","B2.1","B2.2","C1"]
```

---

## 📋 Manual Testing (In Google Sheets)

### Test 1: Menu Visible
```
✓ Refresh the Google Sheet (Ctrl+Shift+F5)
✓ Click menu: "PUCV2English"
✓ Verify all options appear including "👤 Promover desde Lista de Espera"
✓ Hover over "📧 Enviar Correos" and verify "⏳ Cierre Lista de Espera (Sin Cupo)" appears
```

### Test 2: Draft Mode
```
✓ Click: PUCV2English > 📧 Enviar Correos > ✅ Seleccionados
✓ At the confirmation dialog, click "NO" to create drafts
✓ Choose "SÍ" to limit to 5 sample drafts
✓ Check Gmail drafts folder for the preview emails
```

### Test 3: Waitlist Promotion
```
✓ Open "Lista de Espera" sheet
✓ Select a row with a candidate
✓ Click: PUCV2English > 👤 Promover desde Lista de Espera
✓ Verify candidate moves to "Seleccionados" and is removed from waitlist
```

### Test 4: Payment Tracking
```
✓ Open "Seleccionados" sheet
✓ Verify "Pago Matrícula" column with Pagado/Pendiente dropdown
✓ Change a value and verify it persists
```

### Test 5: Final List Generation
```
✓ Click: PUCV2English > 📋 Generar Lista Final
✓ Verify only candidates with Acepta + Pagado appear in "Lista Final Curso"
```

### Test 6: Waitlist Closure Emails
```
✓ Click: PUCV2English > 📧 Enviar Correos > ⏳ Cierre Lista de Espera (Sin Cupo)
✓ Choose draft mode to preview
✓ Verify "Fecha Notificación Cierre" column updates in "Lista de Espera"
```

---

## ❓ Troubleshooting

| Problem | Solution |
|---------|----------|
| **"Function not found" error** | Verify all 11 `.js` files uploaded correctly (Config first) |
| **Dialog doesn't open** | Refresh sheet (Ctrl+Shift+F5), check browser console |
| **"No hay destinatarios"** | Check idempotency columns — candidates may already have notification dates |
| **Email not received** | Check spam folder, verify email addresses |
| **"MailApp error" in logs** | Verify workspace account has email quota available |
| **Column count mismatch** | Ensure the target sheet is empty before restoration |
| **Promoted candidate not in SELECTED lote** | Check if their `Verificación Certificado` is `"Test de nivel"` — use `🧪 Test de Nivel` instead |

---

## 📦 Deployment Summary

- **Total files:** 25 (11 JavaScript + 14 HTML)
- **New files (v5.1.0):** 1 (`CorreoEsperaSinCupo.html`)
- **Updated files (v5.1.0):** 5 (`Correos.js`, `Seleccionados.js`, `Menu.js`, `WebApp.js`, `ListaFinal.js`)
- **Build command:** `npm run build` (TypeScript compilation, 0 errors)
- **Ready for production:** Yes, after manual testing ✓

---

## 🎯 What's Implemented (v5.1.0)

✅ Physical waitlist sheet ("Lista de Espera") with 30 candidates per level
✅ Payment tracking column ("Pago Matrícula") with interactive dropdown
✅ Strict final list filter: Acepta + Pagado required
✅ Manual promotion from waitlist to selected with one click
✅ Waitlist closure email template (CorreoEsperaSinCupo)
✅ Independent closure notification date column
✅ Gmail draft mode for email preview before sending
✅ Secure exclusion: NO_SELECTED skips selected and waitlist candidates
✅ Dynamic deadline calculation (3 days from send date)
✅ Protected "Seleccionados" sheet (not overwritten on regeneration)
✅ Emergency restoration function for lost data
✅ Expanded menu with all new administrative options
