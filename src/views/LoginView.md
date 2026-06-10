# LoginView

Route: `/login` — public, no auth guard.

## Purpose
Entry point for the app. Authenticates the user and stores identity in `userStore`. After login, redirects to `/ships`.

## Auth flows
- **Admin**: nickname `admin` + password verified via `verifyAdminPassword()` → `userStore.login(nickname, true)`
- **Guild leader**: nickname checked via `isLeaderNickname()` (debounced watcher); if leader, password field appears; access granted via `getLeaderGuildAccess()` which returns `accessibleGuildIds`
- **Regular user**: any nickname, no password required

## Key behaviors
- Password field only appears when nickname is `admin` or `requireLeaderPassword` is true
- Leader check fires on each nickname change using an incrementing integer token (`checkToken`) — stale async responses are discarded by comparing the token after `await`
- Regular users: **any non-empty nickname is accepted** — no server-side validation that the nickname exists
- Redirect target after login is hardcoded to `/ships` for all user types
- Errors use `mdi-skull-crossbones` icon per pirate theme

## Session persistence
`userStore` is plain in-memory Pinia — **no persistence across page refreshes**. This is why most routes have `requiresAuth: false`: there is no server session to verify, only client-side state. A hard refresh always returns the user to the login screen.

## `accessibleGuildIds` downstream effect
`getLeaderGuildAccess()` returns `accessibleGuildIds` which is stored as `userStore.leaderGuildAccessIds`. This powers `userStore.canAccessGuild(guildId)`, which gates guild withdrawal and log viewing on `GuildsPage`. It is set only at login time and cleared on logout.

## Logout
`userStore.logout()` clears `nickname`, `isAdmin`, and `leaderGuildAccessIds`. It is called from `Navbar.vue` — not from this page.

## Stores & services
- `useUserStore` — `login(nickname, isAdmin, accessibleGuildIds?)`
- `authService.js` — `isLeaderNickname`, `verifyAdminPassword`, `getLeaderGuildAccess`

## UI
Animated wave sea background + scroll card. No Vuetify standard layout — fully custom CSS with pirate design tokens (`--wi-gold`, `--wi-font-heading`).
