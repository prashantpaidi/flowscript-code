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
| **Input Emulation** | Synthetic DOM Events (`click`, `keydown`) | Raw Hardware Inputs (OS-level mouse/keyboard) |
| **CAPTCHA Bypass** | ❌ Often blocked by modern anti-bot triggers | ✅ Bypasses Cloudflare, reCAPTCHA, and Arkose Labs |
| **Iframe Boundaries** | ❌ Restricted by Same-Origin policy limits | ✅ Interacts across all nested iframes seamlessly |
| **Page Overrides** | ❌ Can be blocked by page-level `preventDefault()` | ✅ Bypasses all page-level JavaScript overrides |

---

## When to Use Which

### Use Standard Actions when:
* You are automating simple forms or dashboards without bot mitigation.
* Performance is a priority (Standard Actions have slightly less execution overhead).
* You want to run scripts in standard environments where debugging permissions might be restricted.

### Use Native CDP Actions when:
* **Anti-Bot Systems are Present**: Cloudflare, reCAPTCHA, or Akamai detect synthetic clicks. Since `nativeClick` leverages Chrome's native debugging protocol to fire actual hardware-level input coordinate events, anti-bot scripts see it as genuine human movement.
* **Complex Element Overrides**: Web applications that call `e.stopPropagation()` or custom handlers to intercept clicks will ignore synthetic clicks, but cannot block native CDP clicks.
* **Third-Party Iframes**: Credit card forms or payment gateways hosted in nested iframes often restrict DOM access due to CORS. CDP actions operate globally based on viewport coordinates, bypassing iframe boundaries entirely.

---

## Examples

### standard type vs native type
```javascript
// Standard (Synthetic DOM events)
await type('#search', 'search query');

// Native CDP (Hardware-level key presses)
await nativeType('#secure-password-input', 'my-super-secret-password');
```
