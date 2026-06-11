---
title: "Tutorial: Your First Script"
description: Step-by-step tutorial for writing, running, and debugging your first FlowScript.
---

Welcome to FlowScript! In this tutorial, you will write a browser automation script from scratch, bind it to a keyboard shortcut (hotkey), execute it on a web page, and inspect the real-time execution logs.

By the end of this tutorial, you will understand how to build scripts using FlowScript's standard actions and element querying tools.

---

## What We Are Building

We will build a simple script that:
1. Triggers when you press `Ctrl + Shift + K`.
2. Locates a search input field on a webpage (such as Wikipedia or Google).
3. Smoothly scrolls the search field into view.
4. Types a search query character-by-character.
5. Emulates pressing `Enter` to submit the search.

---

## Step 1: Open the FlowScript Side Panel

1. Open your Google Chrome browser.
2. Click on the **FlowScript** extension icon in your toolbar.
3. The FlowScript side panel will slide open on the right side of your browser.
4. You will see three tabs at the top:
   - **Editor**: Where you write and save your scripts.
   - **Triggers**: Where you manage registered hotkeys, expanders, and load events.
   - **Logs**: A terminal console that streams script print statements and step actions.

---

## Step 2: Write the Automation Script

In the **Editor** tab, delete any placeholder content and paste the following code:

```javascript
// @trigger('hotkey', 'ctrl+shift+k')
async function searchAutomation() {
  console.log("Initiating search automation sequence...");

  // 1. Locate the input search element using query()
  const searchInput = query('input[type="search"]');

  // 2. Check if the element exists on the current web page
  if (await searchInput.exists()) {
    console.log("Search input found. Preparing to scroll...");
    
    // 3. Scroll to and focus input
    await searchInput.scroll();
    await sleep(300); // Wait for smooth scroll animation

    // 4. Type our query natively
    await searchInput.type("FlowScript Browser Automation");
    await sleep(500); // Short delay to simulate real human pacing

    // 5. Submit search by pressing Enter natively
    await press("Enter");
    console.log("Search query submitted!");
  } else {
    console.warn("Could not find search input on this page. Make sure the selector matches!");
  }
}
```

---

## Step 3: Save and Register Your Trigger

1. Press `Ctrl + S` or click the **Save** button in the editor toolbar.
2. Under the hood, FlowScript parses the `// @trigger` comment and registers a hotkey listener.
3. Navigate to the **Triggers** tab in the side panel. You should see a card showing:
   - **Hotkey**: `Ctrl + Shift + K`
   - **Target Function**: `searchAutomation()`
   - **Status**: `Active` (indicated by a green badge).

---

## Step 4: Run and Test the Automation

Now let's see it in action:

1. In your browser tab, navigate to a site that features a standard search bar, such as [wikipedia.org](https://www.wikipedia.org/).
2. Click anywhere inside the main Wikipedia page to ensure the page has focus.
3. Press **`Ctrl + Shift + K`** on your keyboard.
4. **Watch the screen**:
   - The search bar will scroll into view.
   - The element will flash with a blue outline (highlighting the action context).
   - "FlowScript Browser Automation" will type out character-by-character.
   - The page will submit the search and navigate to the results.

---

## Step 5: Check the Logs

Let's inspect what happened behind the scenes:

1. Open the **Logs** tab in the side panel.
2. You will see a detailed execution history of the script run:
   - `[log] Initiating search automation sequence...`
   - `[log] Search input found. Preparing to scroll...`
   - `[step] SCROLL TO: input[type="search"]`
   - `[step] TYPE: "FlowScript Browser Automation" into input[type="search"]`
   - `[step] NATIVE PRESS: "Enter"`
   - `[log] Search query submitted!`
   - `[log] Trigger function 'searchAutomation' completed.`

---

## Summary & Next Steps

Congratulations! You successfully built your first automated browser script.
* You learned how to declare a **Hotkey trigger**.
* You used `query()` to get an **`ElementHandle`** reference.
* You emulated interactions with `scroll()`, `type()`, and `press()`.

Now, try modifying the script to automate a different action or web form, or try writing a **Page Load trigger** by reading the [Keyboard, Expander & Load Triggers](/guides/triggers) guide!
