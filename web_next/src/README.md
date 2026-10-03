# src

- `app/` — App Router routes (thin; see its README).
- `screens/` — full-page components the routes render.
- `components/` — shared UI.
- `context/` — React providers (auth, theme, appearance, calls).
- `lib/` — framework-free logic, unit-tested in `lib/__tests__/`.
- `middleware.ts` — only hides the admin console behind `ADMIN_PANEL_SLUG`. Its
  matcher skips `/api`, sockets, Next internals and `/.well-known/*`, so nothing
  ever sits between the app-link verification files and the OS fetching them.
