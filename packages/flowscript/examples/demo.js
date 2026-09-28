import { FlowScriptEngine, MockDriver, CallbackDriver } from '../dist/index.js';

async function runDemo() {
  console.log('====================================================');
  console.log('🚀 FlowScript Core Engine & Driver Architecture Demo');
  console.log('====================================================\n');

  // --------------------------------------------------------------------------
  // Scenario 1: Standalone Automation with MockDriver
  // --------------------------------------------------------------------------
  console.log('--- 1. Running Flow with MockDriver ---');
  const mockDriver = new MockDriver({ enableRealSleep: true });
  
  // Pre-populate mock DOM values (simulating a target webpage)
  mockDriver.setMockDom('#welcome-banner', 'textContent', 'Welcome back, Alice!');
  mockDriver.setMockDom('#cart-total', 'textContent', '$149.99');
  mockDriver.setMockDom('#agree-terms', 'checked', false);

  const engine = new FlowScriptEngine({
    driver: mockDriver,
    defaultTimeoutMs: 5000,
    onLog: (entry) => {
      const icon = entry.type === 'step' ? '⚡' : entry.type === 'error' ? '❌' : 'ℹ️';
      console.log(`  ${icon} [${entry.type.toUpperCase()}] ${entry.message}`);
    }
  });

  const automationScript = `
    console.log('Starting automated checkout flow...');
    
    // Auto-awaited actions (no need to write await manually)
    click('.cart-icon');
    type('#discount-input', 'SUMMER2026');
    click('.apply-coupon-btn');
    
    // Object-Oriented Element Handle
    const banner = query('#welcome-banner');
    const userGreeting = await banner.getText();
    console.log('Read greeting:', userGreeting);

    const totalEl = query('#cart-total');
    const totalAmount = await totalEl.getText();
    console.log('Final Cart Total:', totalAmount);

    return {
      greeting: userGreeting,
      total: totalAmount
    };
  `;

  console.log('\nExecuting Script...');
  const result = await engine.run(automationScript);

  console.log('\nExecution Result:');
  console.log('  Success:', result.success);
  console.log('  Returned Value:', result.value);
  console.log('  Duration:', `${result.durationMs}ms`);
  console.log('  Recorded Actions:', mockDriver.actions.map(a => `${a.action}(${a.args.map(x => JSON.stringify(x)).join(', ')})`));

  // --------------------------------------------------------------------------
  // Scenario 2: Remote Browser Control via CallbackDriver (WebSocket Simulation)
  // --------------------------------------------------------------------------
  console.log('\n----------------------------------------------------');
  console.log('--- 2. Remote Browser Control via CallbackDriver ---');
  console.log('----------------------------------------------------');
  console.log('Simulating a remote browser WebSocket bridge on port 9222...\n');

  // CallbackDriver forwards actions over your transport layer (WebSocket / CDP / RPC)
  const remoteDriver = new CallbackDriver(async (action, args) => {
    console.log(`  🌐 [REMOTE WS -> BROWSER] Action: "${action}" | Payload:`, args);
    // Simulate network delay
    await new Promise(r => setTimeout(r, 50));
    
    // Simulated remote DOM return values
    if (action === 'readDom') {
      return 'Logged In: admin@example.com';
    }
    return { ok: true };
  });

  const remoteEngine = new FlowScriptEngine({
    driver: remoteDriver,
    onLog: (entry) => {
      if (entry.type !== 'step') {
        console.log(`  ℹ️ [SERVER] ${entry.message}`);
      }
    }
  });

  const remoteScript = `
    click('#login-submit');
    type('#search-box', 'FlowScript Remote Control');
    press('Enter');
    const userStatus = await query('.user-badge').getText();
    return userStatus;
  `;

  const remoteResult = await remoteEngine.run(remoteScript);
  console.log('\nRemote Execution Completed:');
  console.log('  Status:', remoteResult.success ? 'SUCCESS' : 'FAILED');
  console.log('  Value from Remote Browser:', remoteResult.value);

  // --------------------------------------------------------------------------
  // Scenario 3: Trigger Function Execution (e.g. Hotkeys or Expander Triggers)
  // --------------------------------------------------------------------------
  console.log('\n----------------------------------------------------');
  console.log('--- 3. Running Specific Trigger Function ---');
  console.log('----------------------------------------------------');

  const triggerScript = `
    // @trigger('hotkey', 'ctrl+shift+f')
    async function fillFeedbackForm() {
      console.log('Hotkey Ctrl+Shift+F triggered!');
      await type('#feedback-textarea', 'FlowScript is fast and modular!');
      await click('#submit-feedback-btn');
    }
  `;

  const triggerResult = await engine.runTrigger(triggerScript, 'fillFeedbackForm');
  console.log('Trigger Function Result:', triggerResult.success ? 'SUCCESS' : 'FAILED');

  console.log('\n====================================================');
  console.log('✅ Demo Finished Successfully!');
  console.log('====================================================\n');
}

runDemo().catch((err) => {
  console.error('Demo error:', err);
});
