import { FlowScriptEngine, CdpDriver } from '../dist/index.js';

async function runAttachLiveDemo() {
  console.log('====================================================');
  console.log('⚡ FlowScript Live Browser Connector (`attachLive`) Demo');
  console.log('====================================================\n');

  console.log('🔍 Auto-discovering live browser via DevToolsActivePort...');

  // 1. One line to attach directly to live Edge or Chrome!
  const driver = await CdpDriver.attachLive({
    browser: 'auto', // 'edge' | 'chrome' | 'auto'
  });

  console.log('🔌 Connected to live browser!');
  console.log(`🎯 Active Tab Target ID: ${driver.targetId}`);
  console.log(`🌐 Session ID: ${driver.sessionId}`);
  console.log(`🔗 Target URL: ${driver.targetUrl}\n`);

  // 2. List all open tabs in the browser
  console.log('📑 Open Browser Tabs:');
  const tabs = await driver.listTabs();
  const pageTabs = tabs.filter(t => t.type === 'page');
  pageTabs.slice(0, 5).forEach((t, i) => {
    console.log(`   ${i + 1}. [${t.title || 'Untitled'}] -> ${t.url}`);
  });
  if (pageTabs.length > 5) {
    console.log(`   ...and ${pageTabs.length - 5} more tabs.`);
  }

  // 3. Initialize FlowScriptEngine bound to this live tab
  const engine = new FlowScriptEngine({
    driver,
    defaultTimeoutMs: 15000,
    onLog: (entry) => {
      const icon = entry.type === 'step' ? '⚡' : entry.type === 'error' ? '❌' : 'ℹ️';
      console.log(`  ${icon} [${entry.type.toUpperCase()}] ${entry.message}`);
    }
  });

  // 4. Run automation script on the live tab
  console.log('\nExecuting FlowScript automation inside the live tab...');
  const script = `
    console.log('Running inside live browser tab!');
    
    // Read page title directly from DOM
    const title = await readDom('title', 'textContent');
    console.log('Live Page Title:', title);

    // Read current page location
    const currentUrl = await readDom('body', '__exists');
    console.log('Page body element exists:', currentUrl);

    return {
      title: title,
      bodyFound: currentUrl
    };
  `;

  const result = await engine.run(script);

  console.log('\n----------------------------------------------------');
  console.log('Automation Result:');
  console.log('  Success:', result.success);
  console.log('  Extracted:', result.value);
  console.log('  Duration:', `${result.durationMs}ms`);
  console.log('----------------------------------------------------');

  await driver.close();
  console.log('\n✅ Successfully detached from live browser!');
}

runAttachLiveDemo().catch((err) => {
  console.error('\n❌ Attach live demo failed:', err.message);
  process.exit(1);
});
