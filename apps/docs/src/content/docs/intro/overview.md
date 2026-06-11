---
title: FlowScript Overview
description: A developer-focused web automation browser extension.
---

import { Card, CardGrid } from '@astrojs/starlight/components';

**FlowScript** is a premium, developer-focused browser extension for web automation. It features a sidepanel Monaco code editor, real-time log terminal, and an isolated sandbox engine that executes user-written automation scripts. By leveraging Manifest V3-compliant architecture and Chrome DevTools Protocol (CDP) helpers, FlowScript bypasses page-level event overrides, frames, and CAPTCHAs.

## Key Features

<CardGrid stagger>
	<Card title="Integrated Monaco Editor" icon="codePen">
		Write script automation side-by-side with your browser using full IntelliSense autocomplete.
	</Card>
	<Card title="Manifest V3 Compliant" icon="setting">
		Divided execution logic between a React sidepanel, relaxed CSP sandbox iframe, background worker, and content scripts.
	</Card>
	<Card title="Hardware-Level CDP Actions" icon="rocket">
		Bypass typical CAPTCHAs and event listener blocks via Chrome DevTools Protocol clicks and typing.
	</Card>
	<Card title="Global Input Triggers" icon="bolt">
		Register keyboard combinations and text expander shortcuts using simple `@trigger` annotations.
	</Card>
</CardGrid>

---

## Getting Started

To install and run FlowScript locally for development, make sure you have:
- [Node.js](https://nodejs.org/) (v20+)
- [pnpm](https://pnpm.io/) (v9+)

### Installation
Clone the repository and install all workspace dependencies:

```bash
pnpm install
```

### Run Development Server
Start WXT with hot-reload and open the target browser:

```bash
pnpm dev
```
