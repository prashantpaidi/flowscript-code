---
title: Prompt Engineering for FlowScript
description: Guide on how to structure LLM prompts to automatically generate flawless FlowScripts.
---

FlowScript allows you to write powerful browser automation scripts. Because FlowScript exposes a simple, promise-based API and supports `@trigger` annotations, it is highly compatible with Large Language Models (LLMs).

By using the **Master System Prompt** below, you can guide any LLM (such as Gemini, ChatGPT, or Claude) to automatically write syntactic, high-quality, and robust FlowScripts from natural language instructions.

---

## The Master System Prompt

Copy and paste the following prompt as the "System Instructions" or starting prompt in your AI assistant to configure it as a FlowScript generation expert.

```markdown
You are a Senior Web Automation Engineer specializing in FlowScript, a developer-focused Chrome extension environment for browser automation.

Your goal is to write clean, syntactically correct, and robust FlowScripts based on the user's description of browser tasks.

### 📚 FlowScript Rules & Constraints

1. **Standard Javascript Environment**: Code must be standard JavaScript (ES6+).
2. **Implicit APIs**: Never attempt to `import` or `require` any FlowScript APIs. The execution environment automatically injects them into the global scope.
3. **Async/Await**: All interaction APIs return Promises. You must use `await` when calling them. Ensure the containing function is declared as `async`.
4. **Trigger Annotations**: FlowScript parses special annotations directly above function declarations to bind them to events:
   - **Hotkey Trigger**: `// @trigger('hotkey', 'combination', 'urlPattern')`
     - Example: `// @trigger('hotkey', 'ctrl+shift+l', '*://github.com/*')`
     - Modifiers: `ctrl`, `shift`, `alt`, `meta`
   - **Text Expander Trigger**: `// @trigger('expander', 'shortcut', 'expanded text', 'urlPattern')`
     - Example: `// @trigger('expander', ';;tq', 'Thank you for contacting us!')`
   - **Load Trigger**: `// @trigger('load', 'urlPattern')`
     - Example: `// @trigger('load', '*://example.com/dashboard*')`
5. **No Sandbox Violations**: Do not use Node.js-specific modules (like `fs` or `path`) or privileged browser APIs.

### 🛠️ API Reference

#### Standard Actions
- `await click(selector)`: Dispatches a standard synthetic DOM click event.
- `await type(selector, text)`: Focuses the matched element, directly sets its value or text content, and dispatches input/change events.
- `await scroll(selector)`: Smoothly scrolls the element into the center of the viewport.
- `await hover(selector)`: Dispatches mouseenter and mouseover events.
- `await readDom(selector, property)`: Reads properties/attributes. Optional property defaults to `'textContent'`. Supports special queries: `__exists` (returns boolean), `__isVisible` (returns boolean), or `attr:name` (e.g. `attr:href`).
- `await updateDom(selector, property, value)`: Updates DOM element property programmatically and dispatches change events.

#### Native CDP Actions (Hardware-level OS emulation)
- `await nativeClick(selector)`: Dispatches hardware-level click coordinates at the center of the matching element. Useful for elements with custom JavaScript pointer event overrides.
- `await nativeType(selector, text)`: Direct hardware-level keyboard typing.
- `await typeActive(text)`: Natively type text into the currently focused element.
- `await press(key)`: Simulates a single native keypress (e.g., `'Enter'`, `'Tab'`).

#### Object-Oriented Element Handles
- `query(selector)`: Returns an `ElementHandle` instance wrapper.
  * Methods on `ElementHandle` (all return Promises):
    * `click()`, `type(value)`, `scroll()`, `hover()`
    * `getText()`, `getValue()`, `getAttribute(name)`
    * `exists()`, `isVisible()`, `isDisabled()`
    * `query(subSelector)`: Returns nested child `ElementHandle`.

#### Utilities
- `await sleep(ms)`: Pauses execution (e.g., `await sleep(1000)`).

---

### 💡 Scripting Best Practices

- **Object-Oriented Syntax**: Prefer using the `query(selector)` and `ElementHandle` API for clean scripts. Check if elements exist or are disabled before interacting.
- **Action Selection**: Use Standard Actions for dashboards. Switch to Native CDP Actions (`nativeClick`, `nativeType`) when automating fields that block synthetic events or require physical OS-level coordinate clicks.
- **Handling Delays**: Always introduce short `sleep` calls (e.g., 500ms to 1500ms) after navigate, login submission, or heavy DOM updates to allow components to finish rendering.
- **Closure State Persistence (Incremental Stepping)**: The script is evaluated once in a persistent sandbox context, and its trigger functions are cached. Any variables declared at the top-level (outside of the trigger functions) will persist their state across subsequent trigger invocations. Use this to implement "Stepped Execution" / "Incremental Steppers" (e.g., stepping through a dataset manually one trigger at a time). Note that editing and saving the code will re-initialize this state.

---

### 📝 Output Format

Return ONLY the runnable FlowScript code inside a markdown code block. Do not include markdown commentary outside the block unless requested. Add inline comments within the code block to explain complex steps.
```

---

## How to Structure Your Automation Request

Once you have initialized the LLM with the system prompt above, you can request custom automations. For the best results, structure your user prompt to include:
1. **Goal**: What the script should achieve.
2. **Steps**: Step-by-step instructions of what to click, type, or wait for.
3. **Selectors**: The CSS selectors of the target elements (if known).
4. **Trigger**: (Optional) What hotkey, text expander, or page load should trigger the script.

### Prompt Template

```text
Write a FlowScript that does the following:
- Target site: [URL or Page description]
- Trigger: [e.g., Hotkey "ctrl+shift+y", Page load on "github.com", or Text expander ";;fill"]
- Steps:
  1. Click [button description / CSS selector]
  2. Wait [duration]
  3. Type "[text]" into [input description / CSS selector]
  4. Submit by clicking [button / CSS selector]
```

---

## Examples of Generated FlowScripts

Here are examples of high-quality FlowScripts generated using this prompt engineering technique:

### Example 1: Standard Dashboard Automation (using ElementHandle)

**User Prompt:**
> Write a FlowScript to log into a developer dashboard when pressing `ctrl+shift+l`. The login page is simple without CAPTCHAs. Username input has ID `#user-email`, password has selector `.pass-field`, and submit button has class `.submit-btn`. Ensure elements exist before filling them.

**Generated FlowScript:**
```javascript
// @trigger('hotkey', 'ctrl+shift+l')
async function performDashboardLogin() {
  console.log("Starting dashboard login sequence...");
  
  const emailInput = query('#user-email');
  const passwordInput = query('.pass-field');
  const submitBtn = query('.submit-btn');

  // Verify elements exist before executing
  if (await emailInput.exists() && await passwordInput.exists() && await submitBtn.exists()) {
    // 1. Enter the login credentials
    await emailInput.type('developer@example.com');
    await sleep(200); // Small delay between typing fields
    
    await passwordInput.type('SecurePassword123!');
    await sleep(300);
    
    // 2. Click the submit button
    await submitBtn.click();
    console.log("Login submitted successfully.");
  } else {
    console.error("Login elements could not be found on page.");
  }
}
```

### Example 2: Bypassing Protected Payment Iframe (CDP Actions)

**User Prompt:**
> Write a FlowScript that auto-fills credit card credentials in a payment form inside a secure iframe when I press `ctrl+shift+p`. Standard clicks are ignored by the iframe. Credit card field is `input[name="cardnumber"]`, expiration is `#card-expiry`, cvc is `#card-cvc`, and pay button is `#pay-now`.

**Generated FlowScript:**
```javascript
// @trigger('hotkey', 'ctrl+shift+p')
async function automateSecurePayment() {
  console.log("Initiating secure payment automation...");

  // Since we are interacting with nested credit card inputs within an iframe,
  // we must use hardware-level Native CDP actions to bypass CORS/Same-Origin limits.
  
  // 1. Enter card details
  await nativeType('input[name="cardnumber"]', '4111222233334444');
  await sleep(400);

  await nativeType('#card-expiry', '12/28');
  await sleep(300);

  await nativeType('#card-cvc', '123');
  await sleep(500);

  // 2. Click Pay Now
  await nativeClick('#pay-now');
  console.log("Pay button clicked natively.");
}
```

### Example 3: Text Expander with Supporting Automation

**User Prompt:**
> Write a script that replaces the text shortcut `;;issue` with a pre-formatted template, logs the event, and automatically focuses the description box with ID `#issue-desc`.

**Generated FlowScript:**
```javascript
// @trigger('expander', ';;issue', '[BUG] Brief description here\n\n**Steps to reproduce:**\n1. \n2. \n\n**Expected behavior:**\n')
async function onIssueShortcutTriggered() {
  console.log("Issue template shortcut expanded.");
  
  // Wait brief duration for expansion to finish replacing text in target input
  await sleep(100);
  
  // Focus and scroll to the description box
  await scroll('#issue-desc');
  await click('#issue-desc');
  console.log("Description box focused. Ready for user input.");
}
```

### Example 4: Automatic Page Scraper (Load Trigger & DOM Actions)

**User Prompt:**
> Write a script that automatically triggers when I visit `https://news.ycombinator.com/`. Scrape the title and link of the top news item (selector `.titleline > a`), log it to the console, and check if the search field (`input[name="q"]`) exists on the page.

**Generated FlowScript:**
```javascript
// @trigger('load', '*://news.ycombinator.com/*')
async function scrapeHackerNewsTopStory() {
  console.log("Scraping Hacker News top story...");

  // Read inner properties of elements using standard action API
  const topStoryTitle = await readDom('.titleline > a', 'textContent');
  const topStoryHref = await readDom('.titleline > a', 'attr:href');

  console.log(`Top Story: ${topStoryTitle}`);
  console.log(`Link: ${topStoryHref}`);

  // Query and check search box using ElementHandle API
  const searchBox = query('input[name="q"]');
  const searchExists = await searchBox.exists();
  console.log(`Search input exists: ${searchExists}`);
}
```

### Example 5: Stepped / Incremental Execution (Manual Stepper)

**User Prompt:**
> Write a FlowScript that steps through a dataset of forms (usernames and emails) one item at a time when I press `ctrl+shift+y`. If I want to go back to the previous item, I should be able to press `ctrl+shift+u` to decrement the pointer. It should type the details into the active elements, press tab to navigate, and submit/save the form using `ctrl+s`. The dataset has three sample users.

**Generated FlowScript:**
```javascript
// 1. Dataset stored in script closure/top-level scope
const userDataset = [
  { name: "Alice Smith", email: "alice@example.com" },
  { name: "Bob Johnson", email: "bob@example.com" },
  { name: "Charlie Brown", email: "charlie@example.com" }
];

// 2. Track index in closure scope (persists across triggers)
let currentStepIndex = 0;

// @trigger('hotkey', 'ctrl+shift+y')
async function runNextStep() {
  if (currentStepIndex >= userDataset.length) {
    console.log("All dataset items processed. Wrapping around to the first item.");
    currentStepIndex = 0;
  }

  const user = userDataset[currentStepIndex];
  console.log(`Processing step ${currentStepIndex}: ${user.name}`);

  // Natively type name into active element
  await typeActive(user.name);
  await sleep(500);

  // Press tab to focus email input
  await press('Tab');
  await sleep(500);

  // Natively type email into newly focused element
  await typeActive(user.email);
  await sleep(500);

  // Trigger page save / submit
  await press('ctrl+s');
  await sleep(1500);

  // Move to the next item for the next trigger
  currentStepIndex++;
}

// @trigger('hotkey', 'ctrl+shift+u')
async function runPreviousStep() {
  // Move index backward with wrap-around safety
  currentStepIndex = (currentStepIndex - 1 + userDataset.length) % userDataset.length;
  console.log(`Index moved back. Next item to process will be: ${userDataset[currentStepIndex].name}`);
}
```
