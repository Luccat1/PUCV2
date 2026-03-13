---
phase: 7
plan: fix-listafinal-bug
wave: 1
gap_closure: true
---

# Fix: Exception al ejecutar generar lista final del curso

## Problem
A bug occurs when generating the final list: "El número de columnas de los datos no coincide con el del intervalo. Los datos tienen 0 y el intervalo, 4."

## Root Cause
Likely an empty data array is being written to a range that expects 4 columns, or a mismatch in the `.setValues()` call in `ListaFinal.ts`.

## Tasks

<task type="auto">
  <name>Fix output array size in ListaFinal.ts</name>
  <files>src/ListaFinal.ts</files>
  <action>Ensure that the data array written to the sheet has the correct shape and is not empty before calling setValues. Add a check `if (data.length === 0)`.</action>
  <verify>Run the `generar lista final del curso` functionality without exceptions.</verify>
  <done>Exception is resolved and data is correctly populated in the sheet.</done>
</task>
