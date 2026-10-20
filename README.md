# AMUX

React Native Command Center client for tmux-mobile.

This app is a client only. It authenticates against a tmux-mobile controller
with the existing Google device-login flow, stores the returned browser session
token in SecureStore, and calls the same HTTPS API used by the web Command
Center.

## Scope

First screen:

- Machine filter
- Agent session cards
- Start Codex/Claude in a machine directory
- Send text to a pane
- Rename tmux/rmux window
- View pane tail
- View structured transcript

The older browser main app/window-driver UI is intentionally not ported yet.

## Development

```bash
yarn install
yarn dev
yarn ios
yarn typecheck
```

The default controller is `https://eng.xyznot.com`. Override it at build time with:

```bash
TMUX_MOBILE_CONTROLLER_URL=https://example.com yarn dev
```

## Terminal share links (2026-10-19)

The globe action on tmux cards and in Terminal opens the same sharing controls
on iOS and Android: 10 minutes, 24 hours, 5 days or 7 days; 24 hours and viewer control by default; copy, system share, open and stop. The link uses our
Cloudflare viewer at share.xyznot.com. The authenticated Controller creates it
for the captured machine/pane; no terminal relay runs in the mobile app.

This is a JavaScript-only change. Publish production OTA to runtime 7 for
both platforms, and backport to runtime 6 Android using its own checkout and
lockfile. Existing RMUX sharing remains in the Web client.

## Temporary authentication terminals (2026-10-20)

More → Temporary terminal opens the authenticated Controller page inside the app,
with the current machine filter selected. Create a bare login shell, share for ten
minutes, extend, stop, reopen or explicitly close it. Expiry stops sharing only.
The Controller owns the shell lifecycle; the app does not run a second relay or
polling loop. Only same-controller pages and signed share.xyznot.com viewer links
are allowed inside this view. iOS waits for the menu to dismiss before presenting
it. App confirmation/error dialogs use the theme and preserve explicit destructive
and cancel actions, including SSH trust decisions.

Publish runtime 7 iOS/Android OTA and the runtime 6 Android backport from its own
checkout/lockfile. This change adds no native module and requires no binary build.
