---
phase: 7
plan: fix-handpicked-emails
wave: 1
gap_closure: true
---

# Fix: Incluir correo nuevo o categoría para seleccionados extratemporáneos

## Problem
There is a requirement to include a new email category for applicants selected out of band ("hand picked") via certification. This needs to include regular acceptance buttons and a variable for a deadline.

## Root Cause
Missing feature implementation for this newly identified edge case.

## Tasks

<task type="auto">
  <name>Add hand picked email category</name>
  <files>src/Correos.ts</files>
  <action>Add a new email template and category for hand-picked applicants. Include logic to replace a deadline variable and embed the standard acceptance tokens/buttons.</action>
  <verify>Test the batch email generation to ensure the new category is properly handled.</verify>
  <done>Emails for hand-picked applicants are properly formatted with buttons and deadline.</done>
</task>
