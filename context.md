1. Architectural Overview
To comply with Manifest V3 security restrictions (which block arbitrary code execution like eval() and new Function() in privileged contexts), the extension splits responsibilities into four distinct execution environments:
code
Code
┌────────────────────────────────────────────────────────────────────────┐
│                        Chrome Web Browser                              │
│                                                                        │
│  ┌────────────────────────┐          ┌──────────────────────────────┐  │
│  │   React Dashboard      │          │       Sandbox Iframe         │  │
│  │ (Privileged Ext Context)│          │        (Relaxed CSP)         │  │
│  │                        │          │                              │  │
│  │  - Code Editor (Monaco)│  Post    │  - eval() User Code          │  │
│  │  - Trigger Config      │◄────────►│  - Mock APIs (click, type)   │  │
│  │  - Log Terminal        │  Message │  - Promise orchestration     │  │
│  └───────────▲────────────┘          └──────────────▲───────────────┘  │
│              │                                      │                  │
│       Chrome │ Message                              │ Chrome           │
│       Runtime│ Passing                              │ Runtime          │
│              ▼                                      ▼                  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    Background Service Worker                     │  │
│  │                   (Privileged Extension Context)                 │  │
│  │                                                                  │  │
│  │  - Coordinates messaging between Sandbox and Content Script      │  │
│  │  - Context menu registration & Tab/Window state management       │  │
│  └───────────────────────────────────▲──────────────────────────────┘  │
│                                      │                                 │
│                               Chrome │ Message                         │
│                               Tabs   │ Passing                         │
│                                      ▼                                 │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                         Content Script                           │  │
│  │                      (Target Webpage Context)                    │  │
│  │                                                                  │  │
│  │  - Executes DOM actions (click, type, scroll, extract)           │  │
│  │  - Renders the interactive hover overlay during inspection       │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
Context Definitions
Background Service Worker (Privileged Extension Context):
Scope: Standard extension APIs (chrome.tabs, chrome.storage, chrome.runtime, chrome.contextMenus).
Role: Acts as the system router ("The Postman"). Receives logical automation actions from the Sandbox and routes them to the active webpage's Content Script. Orchestrates extension-level events (kill-switches, hotkey triggers).
Content Script (Target Webpage Context):
Scope: Direct access to webpage DOM, isolated JavaScript execution environment.
Role: The physical executor. Implements low-level browser interaction APIs (auto-wait clicking, text inputting, DOM property extraction). Implements the capturing-phase click hijacker and hover overlay during element inspection.
Sandbox Iframe (Isolated, Relaxed CSP Context):
Scope: No access to Chrome extension APIs or target DOM. Allowed to run standard eval() and new Function() inside a dedicated sandbox context (chrome-extension://.../sandbox/index.html).
Role: The logical execution engine. Parses, runs, and monitors user-defined JavaScript code. Exposes mock asynchronous APIs that wrap execution commands into message-passing payloads.
React Dashboard (Privileged Extension UI Context):
Scope: Full Chrome extension APIs. Contains Monaco Editor, run controls, trigger configuration panel, log terminal, and backup controls. Runs as a side panel, popup, or options page.


---
we are using pnpm