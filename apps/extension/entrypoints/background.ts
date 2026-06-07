import { setupDebuggerListener } from '../utils/debugger-actions';
import { savePendingTrigger } from '../utils/storage';

export default defineBackground(() => {
  console.log('Hello background!', { id: browser.runtime.id });

  // Register debugger commands listener (native click / type)
  setupDebuggerListener();

  // Set side panel to open when extension action icon is clicked
  browser.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error('Error setting side panel behavior:', error));

  // Track if sidepanel is open via runtime connection port
  let isSidepanelOpen = false;
  browser.runtime.onConnect.addListener((port) => {
    if (port.name === 'sidepanel') {
      isSidepanelOpen = true;
      port.onDisconnect.addListener(() => {
        isSidepanelOpen = false;
      });
    }
  });

  // Listen for trigger invocation messages
  browser.runtime.onMessage.addListener((message, sender) => {
    if (message && message.source === 'content' && message.type === 'RUN_TRIGGER_FUNCTION') {
      const { functionName } = message.payload;
      const tabId = sender.tab?.id;
      
      if (!isSidepanelOpen && tabId) {
        savePendingTrigger({ functionName, tabId }).then(() => {
          browser.sidePanel.open({ tabId }).catch((error) => {
            console.error('Background: Failed to open side panel:', error);
          });
        }).catch((err) => {
          console.error('Background: Failed to save pending trigger:', err);
        });
      }
    }
  });
});
