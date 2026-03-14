# AGENTS.md - Development Guidelines

This is a Svelte 5 + TypeScript extension project using Vite for building.

## Build Commands

```bash
bun run dev          # Start development server with hot reload
bun run build        # Build for production
bun run check        # Run svelte-check and TypeScript compiler (linter/typecheck)
```

**Running a single test:** No test framework is currently configured.

## Code Style Guidelines

### General
- Use **Svelte 5** syntax with runes (`$state`, `$derived`, `$props`)
- Use `<script lang="ts">` in all Svelte components
- Use **double quotes** for all strings and imports

### TypeScript
- Always use explicit type annotations for function parameters and return types
- Use `type` for type aliases, `interface` for object shapes
- Import types using `import type { ... }` when only used as types

### Naming Conventions
- **Components**: PascalCase (e.g., `EditorArea.svelte`)
- **Functions/variables**: camelCase
- **Constants**: camelCase or UPPER_SNAKE_CASE for compile-time constants
- **Files**: kebab-case for non-component files

### Svelte Components
- Use `$state()` for reactive state instead of `let` + `$:`
- Use `$derived()` for computed values
- Use `$props()` for component props
- Use `getContext`/`setContext` for dependency injection
- Prefer composition over inheritance

### Imports
```typescript
// Group imports by:
// 1. Types
// 2. External libraries (svelte, shiki, babel, etc.)
// 3. Internal modules (../lib, ./components)

import type { ParseResult } from "@babel/parser";
import { getContext, setContext } from "svelte";
import { createHighlighterCore, type ThemeRegistration } from "shiki/core";
import { highlight } from "../lib/highlight";
```

### Error Handling
- Use try/catch for async operations
- Display errors gracefully in the UI with meaningful messages
- Use TypeScript's type narrowing for runtime type safety

### CSS/Styling
- Use CSS custom properties (variables) for theming
- Define component styles in `<style>` blocks
- Use flexbox/grid for layout
- Follow existing color variable naming (`--foreground`, `--background`, etc.)

### Babel/AST Manipulation
- Use `@babel/parser` for parsing JavaScript/JSX
- Use `@babel/traverse` for AST traversal
- Use `@babel/types` for AST node creation
- Use `@babel/generator` for code generation
- Use `import * as t from "@babel/types"` for type guards

### File Organization
```
src/
├── lib/              # Utility functions and libraries
│   ├── highlight.ts  # Syntax highlighting with shiki
│   ├── transformer.ts # Babel AST transformations
│   ├── data.ts       # Data handling
│   └── references.ts # Reference tracking
├── components/       # Svelte components
│   └── Sidebar/
│       └── Sidebar.svelte
└── App.svelte        # Root component
```

### Key Dependencies
- **Svelte 5** - UI framework
- **Vite** - Build tool
- **Shiki** - Syntax highlighting
- **Babel packages** - AST parsing and transformation
- **lucide-svelte** - Icons

### Linting
Run `bun run check` before committing to ensure type safety and Svelte correctness.
