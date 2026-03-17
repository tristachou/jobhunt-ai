# Project Setup Instructions

This document provides instructions on how to set up and run the `oh-my-cv` project locally.

## Prerequisites

Before you begin, ensure you have the following installed:
- [Node.js](https://nodejs.org/) (Recommended version: LTS)
- [pnpm](https://pnpm.io/) (Version 9+)

This project uses `pnpm` as its package manager and enforces version 9.4.0 in `package.json`.

## Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd oh-my-cv
    ```

2.  Install dependencies:
    ```bash
    pnpm install
    ```

## Development

To start the development server for the site:

```bash
pnpm dev
```
or specifically:
```bash
pnpm --filter=site dev
```

This will start the Nuxt development server, usually accessible at `http://localhost:3000`.

## Building for Production

To build the static site:

```bash
pnpm build
```
or specifically:
```bash
pnpm --filter=site build
```

The output will be in the `site/.output` directory.

## Linting

To run the linter across the project:

```bash
pnpm lint
```

## Project Structure

This is a monorepo managed by pnpm workspaces.

- `packages/`: Contains shared packages and utilities.
- `site/`: The main Nuxt application for the CV generator.
  - `i18n.config.ts`: Internationalization configuration.

## Configuration

### Internationalization (i18n)

The project supports internationalization. The configuration can be found in `site/i18n.config.ts`. The default locale is set to `en`.

```typescript
export default defineI18nConfig(() => ({
  legacy: false,
  locale: "en"
}));
```
