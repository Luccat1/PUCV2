# Phase 1 Research — Clasp + TypeScript Setup

> Level 1 Quick Verification — 2026-03-03

## Key Findings

### clasp Version Choice
- **clasp v2.x (stable)**: Transpiles TypeScript natively via built-in `ts2gas`. Simple setup. No bundler needed.
- **clasp v3.0 (alpha)**: Removed built-in TS transpilation. Requires Rollup or similar bundler.
- **Decision**: Use **clasp v2.4.x** (latest stable) for simplicity and reliability.

### Required Packages
```
npm install -g @google/clasp
npm install --save-dev @types/google-apps-script typescript
```

### TypeScript Configuration for GAS
GAS uses V8 runtime but files are concatenated (not bundled). Key constraints:
- **No ES modules** (`import/export`) in the final output — clasp v2 handles this by stripping them
- All top-level declarations become global in GAS
- Use `namespace` pattern or bare functions for GAS exports
- `@types/google-apps-script` provides types for `SpreadsheetApp`, `GmailApp`, etc.

### tsconfig.json for GAS
```json
{
  "compilerOptions": {
    "lib": ["esnext"],
    "target": "ESNext",
    "module": "None",
    "strict": true,
    "noImplicitAny": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

### Container-Bound vs Standalone
- User chose **container-bound** (script lives inside the Sheet)
- `SpreadsheetApp.getActiveSpreadsheet()` replaces `SpreadsheetApp.openById()`
- Clone existing project with `clasp clone <scriptId>`

### File Organization
- clasp pushes all `.ts` files from the root directory (or configured `rootDir`)
- Files are processed alphabetically; order matters for global declarations
- Convention: prefix files with numbers or use clasp's `filePushOrder` if needed
- HTML files (`.html`) are pushed as-is alongside compiled `.gs` files
