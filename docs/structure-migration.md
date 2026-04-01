# InterviewGuru Codebase Restructure Plan

Target layout:

```text
InterviewGuru/
  frontend/
    pages/
    components/
    hooks/
    styles/
    routes/
  backend/
    api/
    middleware/
    services/
    storage/
    auth/
  desktop/
    main/
    ipc/
    shortcuts/
    capture/
  shared/
    types/
    utils/
    constants/
    prompts/
  assets/
  docs/
  build/
  release/
```

## Migration Order

1. Move shared contracts first.
2. Move backend services and middleware second.
3. Move desktop main-process files third.
4. Move frontend pages, components, hooks, and styles last.
5. Keep root entrypoints as compatibility wrappers until every import has been updated.

## Completed So Far

- `shared/constants/planLimits.ts` is now the canonical plan tier source.
- `shared/types/index.ts` is now the canonical shared type source.
- Legacy files in `src/lib/` now re-export from `shared/` for compatibility.
- `backend/services/database.ts` is now the canonical database helper.
- `backend/storage/usageStorage.ts` is now the canonical usage/session storage layer.
- `backend/middleware/authMiddleware.ts` is now the canonical auth and quota middleware.
- `desktop/main/main.cjs` is now the canonical Electron main process file.
- `frontend/routes/App.tsx` and `frontend/routes/main.tsx` are now the canonical web entrypoints.
- `frontend/components/`, `frontend/pages/`, and `frontend/hooks/` now contain wrappers for the main UI surfaces.

## Current File Mapping

- `src/lib/types.ts` -> `shared/types/index.ts`
- `src/lib/planLimits.ts` -> `shared/constants/planLimits.ts`
- `server/lib/database.ts` -> `backend/services/database.ts`
- `server/lib/usageStorage.ts` -> `backend/storage/usageStorage.ts`
- `server/middleware/authMiddleware.ts` -> `backend/middleware/authMiddleware.ts`
- `server.ts` -> `backend/api/server.ts`
- `electron/main.cjs` -> `desktop/main/main.cjs`
- `electron-dev.cjs` -> `desktop/main/dev-launcher.cjs`
- `src/components/LandingPage.tsx` -> `frontend/pages/LandingPage.tsx`
- `src/components/FooterPages.tsx` -> `frontend/pages/FooterPages.tsx`
- `src/components/OverlayWidget.tsx` -> `frontend/components/OverlayWidget.tsx`
- `src/components/PlanBanner.tsx` -> `frontend/components/PlanBanner.tsx`
- `src/components/UsageBar.tsx` -> `frontend/components/UsageBar.tsx`
- `src/components/Visualizer.tsx` -> `frontend/components/Visualizer.tsx`
- `src/hooks/useAIAssistant.ts` -> `frontend/hooks/useAIAssistant.ts`
- `src/hooks/useTabAudioCapture.ts` -> `frontend/hooks/useTabAudioCapture.ts`
- `src/hooks/usePlanStatus.ts` -> `frontend/hooks/usePlanStatus.ts`
- `src/hooks/useSessionTracking.ts` -> `frontend/hooks/useSessionTracking.ts`
- `src/App.tsx` -> `frontend/routes/App.tsx`
- `src/main.tsx` -> `frontend/routes/main.tsx`
- `src/index.css` -> `frontend/styles/index.css`
- `src/config.ts` -> `shared/utils/config.ts`

## Notes

- The current `src/`, `server/`, and `electron/` entries can remain as wrappers while the repo migrates.
- The new aliases `@frontend`, `@backend`, `@shared`, and `@desktop` are already available in TypeScript and Vite.
- The migration should be done in small batches so the build remains valid after each step.
