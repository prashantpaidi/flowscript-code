---
title: Keyboard, Expander & Page Load Triggers
description: Learn how to bind automation scripts to hotkeys, text shortcuts, and page load events.
---

FlowScript includes a built-in event routing system that triggers specific automation scripts in response to real-time user input or navigation events on any webpage. You can register triggers by writing `@trigger` annotations directly above your JavaScript/TypeScript functions in the editor.

## How Triggers Work

1. **Annotation Parsing**: When your script is saved, FlowScript dynamically parses all `@trigger` annotations.
2. **Global Monitoring**: The extension's Content Script hooks into DOM events and navigation events across all open browser tabs to detect matching triggers.
3. **Execution**: Upon a match, a message is routed through the Background Service Worker to the Sidepanel, where the target function is compiled and executed in the Sandbox.

> [!NOTE]
> Trigger annotations are automatically stripped from the script before execution (via `cleanScriptCode`) so that they don't throw syntax or execution errors in the Sandbox.

---

## 1. Hotkey Triggers

Execute functions instantly when key combinations are pressed. By default, they run globally on any page, but you can restrict them to specific websites.

* **Annotation Format**: `// @trigger('hotkey', 'combination', 'urlPattern')`
* **Supported Modifiers**: `ctrl`, `shift`, `alt`, `meta` (Win/Cmd)
* **Example (Global)**:
  ```javascript
  // @trigger('hotkey', 'ctrl+shift+k')
  async function fillLoginForm() {
    console.log('Hotkey Ctrl+Shift+K pressed!');
    await type('#username', 'test_user');
  }
  ```
* **Example (Site-Restricted)**:
  ```javascript
  // @trigger('hotkey', 'ctrl+shift+g', '*://github.com/*')
  async function githubAction() {
    console.log('Hotkey pressed on GitHub!');
  }
  ```

---

## 2. Text Expander Triggers

Type a short prefix in any input field or textarea to auto-expand it and simultaneously run associated automation logic. You can optionally restrict expansion to specific sites.

* **Annotation Format**: `// @trigger('expander', 'shortcut', 'expanded text', 'urlPattern')`
* **Example (Global)**:
  ```javascript
  // @trigger('expander', ';;tq', 'Thank you for your prompt response!')
  async function logAutoResponse() {
    console.log('Text expanded globally!');
  }
  ```
* **Example (Site-Restricted)**:
  ```javascript
  // @trigger('expander', ';;pr', '[READY] Ready for review.', '*://github.com/*')
  async function githubPrComment() {
    console.log('GitHub PR comment template inserted.');
  }
  ```

---

## 3. Page Load Triggers

Run scripts automatically as soon as you visit a webpage that matches a specific URL pattern. This is ideal for scripts that set up custom layouts, autofill forms immediately, or run scrape tasks on visit.

* **Annotation Format**: `// @trigger('load', 'urlPattern')`
* **Example**:
  ```javascript
  // @trigger('load', '*://news.ycombinator.com/*')
  async function autoScrollHackerNews() {
    console.log('Hacker News loaded. Scrolling to bottom...');
    await scroll('footer');
  }
  ```

---

## URL Pattern Syntax

URL patterns support wildcard matches (`*`) and standard scheme protocols. If a protocol is omitted, the matcher automatically expands it to match both `http://` and `https://` schemas:

* `*` or `<all_urls>`: Matches any URL.
* `*://github.com/*`: Matches any page on `github.com` via HTTP or HTTPS.
* `example.com/login`: Matches `http://example.com/login` and `https://example.com/login`.

---

## Validation and Safety

FlowScript validates all active triggers in real-time. If there is a validation issue (such as overlap/collisions on the same site), a warning card is displayed at the top of the **Editor** and **Triggers** tabs:

| Conflict Type | Description |
| :--- | :--- |
| **Hotkey Collision** | The same hotkey combination is assigned to more than one function on overlapping URL patterns. |
| **Expander Collision** | The same expander shortcut is assigned to more than one function on overlapping URL patterns. |

