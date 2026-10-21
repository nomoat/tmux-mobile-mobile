export function textSelectionHtml(text: string, background: string, foreground: string) {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><style>html,body{margin:0;background:${background};color:${foreground}}pre{margin:0;padding:16px;font:17px/1.6 -apple-system,system-ui,sans-serif;white-space:pre-wrap;overflow-wrap:anywhere;-webkit-user-select:text;user-select:text;-webkit-touch-callout:default}</style></head><body><pre>${escaped}</pre></body></html>`;
}
