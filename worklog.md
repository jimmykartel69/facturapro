---
Task ID: 1
Agent: Main Agent
Task: Fix empty app content after login - sidebar layout and component rendering

Work Log:
- Analyzed screenshot with VLM: sidebar renders correctly, but main content area is completely empty (white)
- Identified root cause: main content used `lg:pl-64` (padding-left) instead of `lg:ml-64` (margin-left) with fixed sidebar
- With fixed positioning sidebar and padding-left, the main content's background extends behind the sidebar, and the content rendering area was below the fold
- Fixed page.tsx: changed `lg:pl-64` to `lg:ml-64` and `lg:pl-[72px]` to `lg:ml-[72px]`
- Changed mobile header padding from `pt-16` to `pt-20` for better spacing
- Fixed SettingsPage infinite spinner: added error state with retry button instead of showing spinner forever when settings is null
- Fixed store handleAuthError: removed `window.location.href = '/login'` redirect that broke SPA flow
- Added `handleAuthError` to AppState interface for proper TypeScript typing
- Verified: lint passes, build succeeds, pushed to GitHub

Stage Summary:
- Layout fix: sidebar now properly fixed, main content uses margin-left instead of padding-left
- Error handling: SettingsPage shows retry button on error instead of infinite spinner
- Auth flow: handleAuthError no longer redirects, letting SPA handle auth state gracefully
- Files changed: src/app/page.tsx, src/components/facturapro/settings.tsx, src/components/facturapro/sidebar.tsx, src/lib/store.ts
