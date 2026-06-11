---
title: Native CDP vs Standard Actions
description: Understand when to use hardware-level native CDP inputs.
---

FlowScript provides two categories of automation actions: **Standard Actions** (which run via standard DOM events) and **Native CDP Actions** (which run via the Chrome DevTools Protocol). 

Understanding the differences between these actions is key to building resilient web automation.

---

## Direct Comparison

| Feature | Standard Actions (`click`, `type`) | Native CDP Actions (`nativeClick`, `nativeType`) |
| :--- | :--- | :--- |
| **Execution Layer** | Sandbox ➔ Content Script ➔ DOM | Sandbox ➔ Extension ➔ Chrome DevTools Protocol |
| **Input Emulation** | Synthetic DOM Events (`click`, `input`/`change`) | Raw Hardware Inputs (OS-level mouse/keyboard) |
| **Input Authenticity** | Synthetic events (can be detected by pages) | Emulated OS-level inputs (looks more genuine to some scripts) |
| **Same-Origin Boundaries** | ❌ Restricted by standard DOM access | ❌ Selector resolution still runs in main document context |
| **Page Overrides** | ❌ Can be blocked by page-level `preventDefault()` | ✅ Bypasses page-level JavaScript click handlers |

---

## When to Use Which

## Use Standard Actions when:
* You are automating simple forms or dashboards.
* Performance is a priority (Standard Actions have slightly less execution overhead).
* You want to run scripts in standard environments where debugging permissions might be restricted.

### Use Native CDP Actions when:
* **Simulated User Input**: You need to emulate actual hardware mouse/keyboard events rather than dispatching synthetic DOM events (which some web applications inspect or reject).
* **Complex Element Overrides**: Web applications that call `e.stopPropagation()` or custom event overrides to block synthetic clicks can be bypassed by native CDP clicks, since the click coordinates are dispatched directly.

---

## Examples

### standard type vs native type
```javascript
// Standard (Synthetic DOM events)
await type('#search', 'search query');

// Native CDP (Hardware-level key presses)
await nativeType('#secure-password-input', 'my-super-secret-password');
```
