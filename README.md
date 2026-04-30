# Webpack Explorer

A DevTools extension for exploring, reading, and deobfuscating production webpack modules in webapps like Discord or Slack.

## Features

- **Module Browser**: Browse through a list of all webpack chunks and modules.
- **Deobfuscator**: Renames variables based on context, converts `createElement` calls into JSX, replaces !0/!1 with true/falsed, etc.
- **Code Viewer**: Shows the code with custom syntax highlighting, navigation using Ctrl+Click, bookmarks, variable reference tracking and an AI code explainer.
- **Search**: Press Ctrl+G to search the current file or use the search tab to search globally
- **Mappings**: Press F2 to rename a variable or module.

## How It Works

1. The extension registers a custom devtools page
2. It extracts the webpack module registry from the inspected window using `chrome.devtools.inspectedWindow.eval`
3. Modules are displayed in the editor
4. The transformer (using Babel parser/traverse) rewrites obfuscated code
5. A custom printer generates tokenized output for syntax highlighting

## Development

```bash
bun run dev    # Start a hot reloading dev server
bun run build  # Package everything into an extension in /dist
```

The dev server uses mock data from `src/lib/mock.ts`. In production, it connects to the actual webpack modules via the Chrome DevTools API.
