# Obsidian Modified Date Tracker Plugin

## Project Overview

An Obsidian plugin that automatically appends today's date to a `Modified` frontmatter array whenever any markdown file in the vault is saved. Creates a passive audit trail for workflows like Dataview queries.

## Structure

```
ObsidianModifedPlugin/
├── src/
│   └── main.ts          # All plugin logic
├── manifest.json        # Obsidian plugin metadata
├── package.json         # npm scripts + devDependencies
├── tsconfig.json        # TypeScript config
├── main.js              # Compiled output (generated, not authored)
└── CLAUDE.md
```

## Key Design Decisions

- **Infinite loop guard:** `processingFiles` Set prevents `processFrontMatter`'s own write from re-triggering the `modify` event
- **No-op on duplicate:** If today's date already exists, the callback returns without mutating `fm` → Obsidian skips the write → no spurious re-trigger
- **Normalization:** Handles missing, scalar, or array `Modified` values before appending
- **Date coercion:** Uses `String()` in case YAML parser returns `Date` objects instead of strings

## Build

```bash
npm install       # install devDependencies
npm run build     # produces main.js (minified)
npm run dev       # watch mode for development
```

## Install into Obsidian

```bash
cp main.js manifest.json <vault>/.obsidian/plugins/modified-date-tracker/
```

Then: **Settings → Community Plugins → enable Modified Date Tracker**

## Frontmatter Output

```yaml
Modified:
  - 2026-02-19
  - 2026-02-20
```

## Tech Stack

- TypeScript 5.x
- esbuild (bundler)
- Obsidian Plugin API (`Plugin`, `TFile`, `fileManager.processFrontMatter`)
