---
title: Scripting API Reference
description: Detailed signatures and usage examples of the FlowScript action API.
---

These asynchronous actions are dynamically bound to the sandbox's execution context. You can use these in the sidepanel Monaco Editor.

---

## Standard Actions

### `click(selector)`
Dispatches a standard synthetic DOM click event on the first element matching the selector.
* **Parameters**:
  * `selector` (`string`): A valid CSS selector.
* **Returns**: `Promise<void>`
* **Example**:
  ```javascript
  await click('.submit-button');
  ```

### `type(selector, text)`
Focuses the matched element, sets its value (for inputs/textareas/selects) or text content directly, and dispatches standard `input` and `change` events.
* **Parameters**:
  * `selector` (`string`): A valid CSS selector.
  * `text` (`string`): The text to type.
* **Returns**: `Promise<void>`
* **Example**:
  ```javascript
  await type('#email', 'hello@flowscript.dev');
  ```

### `scroll(selector)`
Scrolls the matched element smoothly into the center of the viewport.
* **Parameters**:
  * `selector` (`string`): A valid CSS selector.
* **Returns**: `Promise<void>`
* **Example**:
  ```javascript
  await scroll('#footer-terms');
  ```

### `hover(selector)`
Dispatches `mouseenter` and `mouseover` mouse events to the target element.
* **Parameters**:
  * `selector` (`string`): A valid CSS selector.
* **Returns**: `Promise<void>`
* **Example**:
  ```javascript
  await hover('.dropdown-menu');
  ```

### `readDom(selector, property)`
Reads the value of a specific property or attribute from the matched DOM element. Supports checking visibility, existence, or arbitrary nested element properties.
* **Parameters**:
  * `selector` (`string`): A valid CSS selector.
  * `property` (`string`, optional): The property to read. Default is `'textContent'`.
    * Use `'text'` or `'textContent'` for text content.
    * Use `'html'` or `'innerHTML'` for inner HTML.
    * Use `attr:name` to read a specific HTML attribute (e.g., `attr:href`).
    * Special check values: `__exists` (returns `true`/`false`) and `__isVisible` (returns `true`/`false`).
* **Returns**: `Promise<any>`
* **Example**:
  ```javascript
  const isButtonVisible = await readDom('#submit-btn', '__isVisible');
  const linkHref = await readDom('a.external', 'attr:href');
  ```

### `updateDom(selector, property, value)`
Modifies a specific property of the matched DOM element programmatically. If the modified property is `'value'`, standard `input` and `change` events are dispatched automatically.
* **Parameters**:
  * `selector` (`string`): A valid CSS selector.
  * `property` (`string`): The target element property to modify (e.g., `'value'`, `'disabled'`).
  * `value` (`any`): The value to assign to the property.
* **Returns**: `Promise<void>`
* **Example**:
  ```javascript
  await updateDom('#custom-slider', 'value', '75');
  await updateDom('#agree-check', 'checked', true);
  ```

---

## Native CDP Actions

### `nativeClick(selector)`
Locates the matching element, calculates its viewport coordinates, and dispatches a hardware-level click event using the Chrome DevTools Protocol.
* **Parameters**:
  * `selector` (`string`): A valid CSS selector.
* **Returns**: `Promise<void>`
* **Example**:
  ```javascript
  await nativeClick('#heavy-captcha-btn');
  ```

### `nativeType(selector, text)`
Focuses the target element and inputs hardware-level keystrokes directly using debugging channels.
* **Parameters**:
  * `selector` (`string`): A valid CSS selector.
  * `text` (`string`): The text to type.
* **Returns**: `Promise<void>`
* **Example**:
  ```javascript
  await nativeType('input[type="password"]', 'myPass123!');
  ```

### `typeActive(value)`
Emulates hardware-level typing directly into whichever element currently has focus.
* **Parameters**:
  * `value` (`string`): The text to type.
* **Returns**: `Promise<void>`
* **Example**:
  ```javascript
  // Focus the input first, then type actively
  await nativeClick('#verification-code');
  await typeActive('123456');
  ```

### `press(value)`
Dispatches a hardware-level keystroke (including command/control keys) using DevTools native input injection.
* **Parameters**:
  * `value` (`string`): The name of the key to press (e.g., `'Enter'`, `'Tab'`, `'Backspace'`).
* **Returns**: `Promise<void>`
* **Example**:
  ```javascript
  await nativeType('#search-box', 'FlowScript extension');
  await press('Enter');
  ```

---

## Object-Oriented Element Handles

FlowScript provides a Puppeteer-like wrapper API to interact with elements cleanly.

### `query(selector)`
Returns an `ElementHandle` wrapper instance for the given CSS selector path.
* **Parameters**:
  * `selector` (`string`): A valid CSS selector.
* **Returns**: `ElementHandle`
* **Example**:
  ```javascript
  const input = query('#email-field');
  await input.type('hello@flowscript.dev');
  ```

### `ElementHandle` Class
An instance of `ElementHandle` maintains a reference path to a DOM element and exposes the following asynchronous methods:

* **`click()`**: Dispatches a standard DOM click.
* **`type(value)`**: Types the specified text value.
* **`scroll()`**: Smoothly scrolls the element into view.
* **`hover()`**: Emulates hovering over the element.
* **`getText()`**: Reads the element's text content. Returns `Promise<string>`.
* **`getValue()`**: Reads the element's value property. Returns `Promise<string>`.
* **`getAttribute(attributeName)`**: Reads the specified attribute. Returns `Promise<string>`.
* **`isDisabled()`**: Checks if the element has the `disabled` property. Returns `Promise<boolean>`.
* **`isVisible()`**: Checks if the element is visible in the viewport. Returns `Promise<boolean>`.
* **`exists()`**: Checks if the element exists in the DOM. Returns `Promise<boolean>`.

#### Nested Queries
You can chain queries from an `ElementHandle` to select child elements:
```javascript
const form = query('#login-form');
const submitBtn = form.query('.submit');
if (await submitBtn.exists() && !(await submitBtn.isDisabled())) {
  await submitBtn.click();
}
```

---

## Utilities

### `sleep(ms)`
Pauses the script execution flow for the specified duration.
* **Parameters**:
  * `ms` (`number`): The duration to sleep in milliseconds.
* **Returns**: `Promise<void>`
* **Example**:
  ```javascript
  await sleep(1500); // Sleep for 1.5 seconds
  ```
