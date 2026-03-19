# 📋 PUCV2English Deployment Checklist

## Phase 1: Correo Inicio de Clases (Class-Start Emails)

**Generated:** 2026-03-19
**Status:** Ready for Google Apps Script deployment

---

## ✅ Files Ready to Upload

All files have been compiled and copied to `PUCV2English/` folder.

### JavaScript Files (11 total)

Upload each file as a separate **Script** file in Google Apps Script editor:

| File | Size | Last Updated | Status |
|------|------|---|---|
| `Config.js` | 5.9 KB | 2026-03-19 | ✓ Ready |
| `Utils.js` | 3.1 KB | 2026-03-19 | ✓ Ready |
| `Correos.js` | 7.3 KB | 2026-03-19 | ✓ Ready |
| `ListaFinal.js` | 3.1 KB | 2026-03-19 | ✓ Ready (Updated for Phase 1) |
| `Evaluacion.js` | 20.4 KB | 2026-03-19 | ✓ Ready |
| `Seleccionados.js` | 5.6 KB | 2026-03-19 | ✓ Ready |
| **`InicioClases.js`** | **8.6 KB** | **2026-03-19** | **✓ NEW (Phase 1)** |
| **`Menu.js`** | **5.6 KB** | **2026-03-19** | **✓ UPDATED (Phase 1)** |
| `Dashboard.js` | 6.1 KB | 2026-03-19 | ✓ Ready |
| `WebApp.js` | 16.9 KB | 2026-03-19 | ✓ Ready |
| **`TestInicioClases.js`** | **5.1 KB** | **2026-03-19** | **✓ NEW (Phase 1)** |

### HTML Files (7 total)

Upload each file as a separate **HTML** file in Google Apps Script editor:

| File | Purpose | Status |
|------|---------|--------|
| `index.html` | Main web app dashboard | ✓ Ready |
| **`DialogSalas.html`** | **Classroom entry modal (Phase 1)** | **✓ NEW** |
| **`CorreoInicioClases.html`** | **Email template (Phase 1)** | **✓ NEW** |
| `CorreoSeleccionado.html` | Selected student email | ✓ Ready |
| `CorreoTestNivel.html` | Level test email | ✓ Ready |
| `CorreoListaEspera.html` | Waitlist email | ✓ Ready |
| `CorreoNoSeleccionado.html` | Not selected email | ✓ Ready |

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
4. Open file in text editor: `PUCV2English/{filename}.js`
5. **Select all** (Ctrl+A) and **copy** entire content
6. **Paste** into Google Apps Script editor
7. **Save** (Ctrl+S)
8. Repeat for all 11 files

**Order recommendation:**
- `Config` (contains constants)
- `Utils` (utility functions)
- `Correos` (email module)
- `ListaFinal` (sheet reading)
- `Evaluacion`, `Seleccionados`, `Dashboard`, `WebApp` (existing modules)
- **`InicioClases`** (Phase 1 new)
- **`Menu`** (Phase 1 updated)
- **`TestInicioClases`** (Phase 1 new - tests)

### Step 3: Upload HTML Files

For each `.html` file in the table above:

1. Click the **[+] New File** button
2. Select **HTML**
3. Name it **exactly** as shown (without `.html` extension)
   - Example: `DialogSalas`, `CorreoInicioClases` (not with `.html`)
4. Open file in text editor: `PUCV2English/{filename}.html`
5. **Select all** (Ctrl+A) and **copy** entire content
6. **Paste** into Google Apps Script HTML editor
7. **Save** (Ctrl+S)
8. Repeat for all 7 files

---

## 🧪 Quick Test (In Google Apps Script)

After uploading all files:

1. In GAS editor, find the **Run** dropdown (top toolbar)
2. Select: `testGetNivelesActivos`
3. Click **Run** button (▶)
4. Check **Executions** panel (View > Executions)
5. Look for successful execution in the log

Expected output:
```
testGetNivelesActivos: OK — Niveles activos: ["B1+","B2.1","B2.2","C1"]
```

If you see this → **Upload successful!** ✓

---

## 📋 Manual Testing (In Google Sheets)

After uploading, test Phase 1 features in the Google Sheet:

### Test 1: Menu Item Visible

```
✓ Refresh the Google Sheet (Ctrl+Shift+F5)
✓ Click menu: "PUCV2English"
✓ Hover over: "📧 Enviar Correos"
✓ Verify: "🏫 Inicio de Clases" option appears at bottom
```

### Test 2: Dialog Opens

```
✓ Click: PUCV2English > 📧 Enviar Correos > 🏫 Inicio de Clases
✓ Wait 2-3 seconds
✓ Verify: Modal dialog appears with loading message "Cargando niveles activos..."
```

### Test 3: Levels Load

```
✓ Wait for dialog to transition to form state
✓ Verify: Shows checkboxes for active levels (B1+, B2.1, B2.2, C1)
✓ Only levels with unnotified students in "Lista Final Curso" should appear
```

### Test 4: Sala Validation

```
✓ Leave one sala field empty
✓ Click "Continuar" button
✓ Expected: Error message "Debe ingresar una sala para cada nivel"
```

### Test 5: Preview Display

```
✓ Fill all sala fields (e.g., "Sala 101", "Sala 102", etc.)
✓ Click "Continuar"
✓ Verify: Modal transitions to PREVIEW state
✓ Shows: "Nivel → Sala" mapping (e.g., "B1+ → Sala 101")
```

### Test 6: Send Emails

```
✓ Review the preview
✓ Click "Enviar Correos" button
✓ Wait 10-30 seconds (depends on student count)
✓ Expected: Success message "Éxito: N correos enviados"
```

### Test 7: Email Content (In Student Inbox)

Check a student's email to verify it contains:

- ✓ Student name
- ✓ Nivel (Level)
- ✓ Horario (Schedule: cátedra + ayudantía)
- ✓ Sala (Classroom)
- ✓ Fechas (Start and end dates)

### Test 8: Column Updates (In "Lista Final Curso" Sheet)

```
✓ Open "Lista Final Curso" sheet
✓ Verify "Sala" column: populated with entered classrooms
✓ Verify "Notificado Inicio" column: timestamp or marker for sent students
```

### Test 9: Idempotency (Run Again)

```
✓ Click: PUCV2English > 📧 Enviar Correos > 🏫 Inicio de Clases
✓ Leave sala values the same (or change them)
✓ Complete the flow again
✓ Expected: "Éxito: 0 correos enviados" (NO duplicates to already-notified students)
✓ Verify: "Notificado Inicio" column unchanged (already has timestamp)
```

---

## ❓ Troubleshooting

| Problem | Solution |
|---------|----------|
| **"Function not found" error** | Verify all 11 `.js` files uploaded correctly in order (Config first) |
| **Dialog doesn't open** | Refresh sheet (Ctrl+Shift+F5), check browser console for errors |
| **"getNivelesActivos is not defined"** | Ensure `Config.js` and `InicioClases.js` both uploaded |
| **Email not received** | Check spam folder, verify email addresses in "Lista Final Curso" |
| **"MailApp error" in logs** | Verify workspace account has email quota available |
| **Dialog appears but no levels show** | Check that "Lista Final Curso" sheet has data and some students lack notification timestamp |

---

## 📚 Key Files (Reference)

If you need to troubleshoot or understand the code:

- **Implementation:** `src/InicioClases.ts` (core logic)
- **Server functions:** `dist/InicioClases.js` (compiled)
- **Dialog UI:** `PUCV2English/DialogSalas.html` (4-step form)
- **Email template:** `PUCV2English/CorreoInicioClases.html` (7 variables)
- **Menu entry:** `dist/Menu.js` (line 28: "Inicio de Clases")
- **Tests:** `dist/TestInicioClases.js` (4 test functions)

---

## 📦 Deployment Summary

- **Total files:** 18 (11 JavaScript + 7 HTML)
- **New files (Phase 1):** 3 (InicioClases.js, TestInicioClases.js, DialogSalas.html, CorreoInicioClases.html)
- **Updated files (Phase 1):** 1 (Menu.js - added "Inicio de Clases" option)
- **Build status:** ✓ TypeScript compilation 0 errors
- **Ready for production:** Yes, after manual testing ✓

---

## 🎯 What's Implemented (Phase 1)

✅ Admin can open a dialog showing all active class levels
✅ Admin enters classroom number for each level
✅ System displays confirmation preview (level → classroom mapping)
✅ Admin can abort and go back to edit classrooms
✅ System sends personalized class-start emails to all confirmed students
✅ Email includes: name, level, schedule, classroom, program dates
✅ Classroom persisted to "Lista Final Curso" sheet
✅ Idempotency guard: re-running skips already-notified students
✅ Menu item accessible from "Enviar Correos" submenu
✅ Quota check uses correct GAS API (MailApp.getRemainingDailyQuota)

---

**Ready to deploy?** 🚀

Start with Step 1 above, upload all files, then run the quick test.

Good luck!
