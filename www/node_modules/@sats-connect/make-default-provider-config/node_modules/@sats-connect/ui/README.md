# `@sats-connect/ui`

A Bitcoin Web3 wallet provider selector. Built as a custom element, compatible with all major UI frameworks.

## Basic usage

```ts
import { loadSelector, selectWalletProvider } from "@sats-connect/ui";

// Call this once in your app to load the custom element.
loadSelector();

// At a later point,
//
// 1. Decide which wallet providers should be displayed to the user.
// 2. Display the selector and capture the user's selection.

// (1)
const providersToDisplay = someBusinessLogic();
// (2)
const userSelectedProviderId = await selectWalletProvider(providersToDisplay);
```

# Development

An example app using the selector is included for convenience during development. To get started, run

```bash
npm install
npm run dev
```

# Building the `@sats-connect/ui` package

To build the `@sats-connect/ui` package, run

```bash
npm run build
```

# Building the example app

To build the example app use

```bash
npm run build-app
```

## Viewing the example app live

The latest version of the example app is available at <https://sats-connect-ui.netlify.app>.

# Docs

Technical documentation is in the [`docs`](./docs/) folder.
