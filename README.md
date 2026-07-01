# Novum

**Agentic AI forensics — a multi-agent system that investigates a question across academic literature.**

Novum orchestrates a team of Gemini-powered agents to research a topic end to end: it pulls primary sources from the [CORE](https://core.ac.uk/) academic API, reasons over them through a multi-agent orchestrator/overseer loop, and streams its findings to a web client in real time over WebSockets.

## Architecture

A TypeScript backend paired with a Vite/React web client.

| Layer | Responsibility |
|-------|----------------|
| `novum_core/` | Orchestration core — `orchestrator`, `overseer`, and `workPhase` drive the multi-agent loop |
| `services/` | Gemini client, prompt and transcript management, content generation, API policy |
| `tools/` | Multi-agent tool framework — registry, parser, and tool implementations |
| `lib/coreApi` | CORE academic-paper API integration (latest papers, lookup by DOI) |
| `web/` | Vite + React front end |

Sessions run over a WebSocket connection so agent progress streams live to the UI. Auth and persistence go through Firebase, and the app is packaged to deploy as a Google AI Studio applet on Cloud Run.

## Tech stack
- **Backend:** Node.js, TypeScript, Express, WebSocket, OpenTelemetry tracing
- **AI:** Google Gemini
- **Data:** Firebase, CORE academic API
- **Frontend:** React, Vite

## Getting started

```bash
# install dependencies (root and web/)
npm install
cd web && npm install && cd ..

# add your Gemini key
cp .env.example .env      # set GEMINI_API_KEY

# run the backend and web client together
npm run dev
```

> Requires a Google Gemini API key. See `.env.example` for the full list of environment variables.