import { useAutomationStore } from '../store/useAutomationStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function HelpersTab() {
  const setCode = useAutomationStore((s) => s.setCode);
  return (
    <div className="h-full flex flex-col gap-3.5 m-0 overflow-y-auto pr-1 animate-in fade-in duration-200">
      <Card>
        <CardHeader className="p-3.5 pb-2">
          <CardTitle className="text-xs font-bold">Selectors Guide</CardTitle>
          <CardDescription className="text-[10px]">
            How to select elements on any webpage.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3.5 pt-0 flex flex-col gap-2.5 text-xs">
          <div>
            <p className="font-semibold text-[11px] text-foreground">By Class Name</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Select elements using CSS classes.</p>
            <code className="block bg-muted p-1 rounded font-mono text-[10px] mt-1 text-foreground">
              await click('.btn-submit');
            </code>
          </div>
          <div>
            <p className="font-semibold text-[11px] text-foreground">By ID</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Select a unique element with a specific ID.</p>
            <code className="block bg-muted p-1 rounded font-mono text-[10px] mt-1 text-foreground">
              await type('#username', 'myUser');
            </code>
          </div>
          <div>
            <p className="font-semibold text-[11px] text-foreground">By Attribute</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Select using any tag attribute (e.g. type, placeholder).</p>
            <code className="block bg-muted p-1 rounded font-mono text-[10px] mt-1 text-foreground">
              await click('input[type="submit"]');
            </code>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-3.5 pb-2">
          <CardTitle className="text-xs font-bold">Native CDP Actions</CardTitle>
          <CardDescription className="text-[10px]">
            Bypass page-level overrides & CAPTCHAs using DevTools Protocol.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3.5 pt-0 flex flex-col gap-2.5 text-xs">
          <div>
            <p className="font-semibold text-[11px] text-foreground">nativeClick(selector)</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Triggers a hardware mouse click at target coordinates.</p>
            <code className="block bg-muted p-1 rounded font-mono text-[10px] mt-1 text-foreground">
              await nativeClick('#submit-btn');
            </code>
          </div>
          <div>
            <p className="font-semibold text-[11px] text-foreground">nativeType(selector, text)</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Simulates hardware keystrokes (triggers native events).</p>
            <code className="block bg-muted p-1 rounded font-mono text-[10px] mt-1 text-foreground">
              await nativeType('input', 'Hello');
            </code>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-3.5 pb-2">
          <CardTitle className="text-xs font-bold">DOM Querying & Updates</CardTitle>
          <CardDescription className="text-[10px]">
            Read properties, styles, attributes, or update DOM dynamically.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3.5 pt-0 flex flex-col gap-2.5 text-xs">
          <div>
            <p className="font-semibold text-[11px] text-foreground">query(selector)</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Returns an element handle supporting chainable methods:</p>
            <code className="block bg-muted p-1 rounded font-mono text-[9px] mt-1 text-foreground leading-3.5 whitespace-pre">
{`const card = query('.product-card');
const text = await card.query('h1').getText();
const isShowing = await card.isVisible();
const attr = await card.getAttribute('href');`}
            </code>
          </div>
          <div>
            <p className="font-semibold text-[11px] text-foreground">updateDom(selector, path, value)</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Directly update properties (including nested styles or classes).</p>
            <code className="block bg-muted p-1 rounded font-mono text-[9px] mt-1 text-foreground leading-3.5 whitespace-pre">
{`await updateDom('.status', 'textContent', 'Done!');
await updateDom('.card', 'style.color', 'blue');`}
            </code>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-3.5 pb-2">
          <CardTitle className="text-xs font-bold">Full Flow Example</CardTitle>
          <CardDescription className="text-[10px]">
            Dynamic scraping and conditional automation:
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3.5 pt-0 flex flex-col gap-2">
          <pre className="bg-muted p-2 rounded font-mono text-[9px] overflow-x-auto text-foreground leading-3.5">
{`const card = query('.product-card');
const title = await card.query('h1.title').getText();
const price = await card.query('.price-tag').getText();

console.log("Scraped: " + title + " for " + price);

const submitBtn = query('button[type="submit"]');
const isBlocked = await submitBtn.isDisabled();

if (isBlocked) {
  console.log("Button is locked! Skipping click.");
} else {
  await submitBtn.click();
}`}
          </pre>
          <Button 
            onClick={() => setCode(
              `const card = query('.product-card');\n` +
              `const title = await card.query('h1.title').getText();\n` +
              `const price = await card.query('.price-tag').getText();\n\n` +
              `console.log("Scraped: " + title + " for " + price);\n\n` +
              `const submitBtn = query('button[type="submit"]');\n` +
              `const isBlocked = await submitBtn.isDisabled();\n\n` +
              `if (isBlocked) {\n` +
              `  console.log("Button is locked! Skipping click.");\n` +
              `} else {\n` +
              `  await submitBtn.click();\n` +
              `}\n`
            )}
            variant="outline" 
            size="xs" 
            className="w-full text-[10px] cursor-pointer transition-all duration-200"
          >
            Load Example into Editor
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
