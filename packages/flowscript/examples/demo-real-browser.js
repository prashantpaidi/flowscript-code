import { FlowScriptEngine, CdpDriver } from '../dist/index.js';
import { spawn } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const CDP_PORT = 9222;

async function isCdpRunning(port = CDP_PORT) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/json/version`);
    return res.ok;
  } catch {
    return false;
  }
}

async function launchBrowser(port = CDP_PORT) {
  const exePath = existsSync(CHROME_PATH) ? CHROME_PATH : (existsSync(EDGE_PATH) ? EDGE_PATH : null);
  if (!exePath) {
    throw new Error('Neither Google Chrome nor Microsoft Edge was found in standard installation paths.');
  }

  const browserName = exePath.includes('Chrome') ? 'Google Chrome' : 'Microsoft Edge';
  console.log(`🌐 Launching real browser (${browserName}) with remote debugging on port ${port}...`);

  const tempProfileDir = join(tmpdir(), `flowscript_cdp_profile_${Date.now()}`);
  mkdirSync(tempProfileDir, { recursive: true });

  const child = spawn(exePath, [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${tempProfileDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank'
  ], {
    detached: true,
    stdio: 'ignore'
  });

  child.unref();

  // Wait for CDP endpoint to become ready
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 500));
    if (await isCdpRunning(port)) {
      console.log(`✅ ${browserName} is ready and listening on port ${port}!`);
      return;
    }
  }

  throw new Error(`Timeout waiting for browser to start on port ${port}`);
}

async function runRealBrowserDemo() {
  console.log('====================================================');
  console.log('🌐 FlowScript Real Browser Remote Control Demo');
  console.log('====================================================\n');

  // 1. Check or launch real local browser
  const running = await isCdpRunning(CDP_PORT);
  if (!running) {
    console.log(`Port ${CDP_PORT} is not active. Starting a real browser instance...`);
    await launchBrowser(CDP_PORT);
  } else {
    console.log(`Connected to existing browser listening on port ${CDP_PORT}.`);
  }

  // 2. Connect CdpDriver to the browser
  console.log('\nConnecting CdpDriver via Chrome DevTools Protocol (CDP)...');
  const driver = await CdpDriver.connect({ port: CDP_PORT });
  console.log('🔌 CdpDriver connected successfully to target page!');

  // 3. Initialize FlowScriptEngine
  const engine = new FlowScriptEngine({
    driver,
    defaultTimeoutMs: 15000,
    onLog: (entry) => {
      const icon = entry.type === 'step' ? '⚡' : entry.type === 'error' ? '❌' : 'ℹ️';
      console.log(`  ${icon} [${entry.type.toUpperCase()}] ${entry.message}`);
    }
  });

  // 4. Navigate browser to example.com
  console.log('\nNavigating real browser to https://example.com...');
  await driver.navigate('https://example.com');

  // 5. Run FlowScript automation on the real browser page
  console.log('\nExecuting FlowScript automation on the real browser...');
  const automationScript = `
    console.log('Reading content from real web page...');
    
    // Read the H1 text from the live DOM
    const header = query('h1');
    const headerText = await header.getText();
    console.log('Header text on real page:', headerText);

    // Read the link href
    const link = query('a');
    const linkText = await link.getText();
    const linkHref = await link.getAttribute('href');
    console.log('Found link:', linkText, '->', linkHref);

    // Click the real link in the real browser
    console.log('Clicking the link on the real page...');
    click('a');

    // Wait 2 seconds for navigation to complete
    sleep(2000);

    return {
      pageHeading: headerText,
      linkText: linkText,
      linkHref: linkHref
    };
  `;

  const result = await engine.run(automationScript);

  console.log('\n----------------------------------------------------');
  console.log('Automation Completed on Real Browser:');
  console.log('  Success:', result.success);
  console.log('  Extracted Data:', result.value);
  console.log('  Duration:', `${result.durationMs}ms`);
  console.log('----------------------------------------------------');

  driver.close();
  console.log('\n✅ Real browser demo finished successfully!');
}

runRealBrowserDemo().catch((err) => {
  console.error('\n❌ Demo failed:', err);
  process.exit(1);
});
