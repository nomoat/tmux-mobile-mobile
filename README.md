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
on iOS and Android: default 24 hours, 5 days or 7 days; view only by default,
optional viewer control; copy, system share, open and stop. The link uses our
Cloudflare viewer at share.xyznot.com. The authenticated Controller creates it
for the captured machine/pane; no terminal relay runs in the mobile app.

This is a JavaScript-only change. Publish production OTA to runtime 7 for
both platforms, and backport to runtime 6 Android using its own checkout and
lockfile. Existing RMUX sharing remains in the Web client.
