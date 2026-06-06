import { setupDebuggerListener } from '../utils/debugger-actions';

export default defineBackground(() => {
  console.log('Hello background!', { id: browser.runtime.id });

  // Register debugger commands listener (native click / type)
  setupDebuggerListener();

  // Set side panel to open when extension action icon is clicked
  browser.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error('Error setting side panel behavior:', error));
});
