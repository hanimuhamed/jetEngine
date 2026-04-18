# jetEngine

<img src="public/static/jetengine/png" alt="Title" width="1440"/>  

A browser-based 2D game engine + editor built with React and TypeScript.

## Current Features

- Fast iteration workflow with near-instant edits while developing
- Very simple JavaScript scripting model (easy to start, no heavy framework)
- Minimal editor complexity: focused tooling instead of overloaded UI
- Component-based entity setup that stays easy to reason about
- Visual scene editing for transforms, hierarchy, and component tuning
- Integrated asset workflow for images, prefabs, and scripts
- Built-in collision preview/debug tools for quick gameplay testing

## Getting Started

### Prerequisites

- Node.js 18+ (recommended: latest LTS)
- npm

### Install

From the repository root:

```bash
cd frontend
npm install
```

### Run Development Server

```bash
cd frontend
npm run dev
```

## Tech Stack

- React 19
- TypeScript
- Zustand (state management)
- Monaco Editor (`@monaco-editor/react`)

## Future Plans

- Game exporting pipeline
- Cloud save support
- Sharing projects/scenes via links

## Status

This project is actively iterated. APIs, editor UX, and scene data format may evolve.