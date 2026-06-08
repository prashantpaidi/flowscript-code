import React, { useEffect, useRef, useState } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Code2, Terminal, Sparkles, Zap } from 'lucide-react';

import { useAutomationStore } from './store/useAutomationStore';
import { Header } from './components/Header';
import { Toolbar } from './components/Toolbar';
import { EditorTab } from './components/EditorTab';
import { ConsoleTab } from './components/ConsoleTab';
import { HelpersTab } from './components/HelpersTab';
import { TriggersTab } from './components/TriggersTab';
import { MESSAGE_TYPES } from '@flowscript/shared';
import { getPendingTrigger, savePendingTrigger } from '@/utils/storage';

export default function SidepanelApp() {
  const initStore = useAutomationStore((s) => s.initStore);
  const activeTab = useAutomationStore((s) => s.activeTab);
  const setActiveTab = useAutomationStore((s) => s.setActiveTab);
  const logs = useAutomationStore((s) => s.logs);
  const addLog = useAutomationStore((s) => s.addLog);
  const setExecutionComplete = useAutomationStore((s) => s.setExecutionComplete);
  const handleActionRequest = useAutomationStore((s) => s.handleActionRequest);
  const triggers = useAutomationStore((s) => s.triggers);
  const validationError = useAutomationStore((s) => s.validationError);
  const runTriggerFunction = useAutomationStore((s) => s.runTriggerFunction);
  const isInitialized = useAutomationStore((s) => s.isInitialized);
  const setSelectedSelector = useAutomationStore((s) => s.setSelectedSelector);
  const setSelectingState = useAutomationStore((s) => s.setSelectingState);
  const recordAction = useAutomationStore((s) => s.recordAction);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Initialize store code from storage on mount
  useEffect(() => {
    initStore();
  }, [initStore]);

  // Connect to background script to signal that sidepanel is active/open
  useEffect(() => {
    const port = browser.runtime.connect({ name: 'sidepanel' });
    return () => port.disconnect();
  }, []);

  // Handle messages from sandbox iframe
  useEffect(() => {
    const handleSandboxMessage = async (event: MessageEvent) => {
      const data = event.data;
      if (!data || data.source !== 'sandbox') return;

      if (data.type === MESSAGE_TYPES.CONSOLE_LOG) {
        addLog(data.payload);
      } else if (data.type === MESSAGE_TYPES.EXECUTE_ACTION) {
        await handleActionRequest(data.payload, iframeRef.current);
      } else if (data.type === MESSAGE_TYPES.EXECUTION_COMPLETE) {
        setExecutionComplete(data.payload);
      }
    };

    window.addEventListener('message', handleSandboxMessage);
    return () => window.removeEventListener('message', handleSandboxMessage);
  }, [addLog, handleActionRequest, setExecutionComplete]);

  // Handle messages from content script for trigger invocations and DOM selector
  useEffect(() => {
    const handleRuntimeMessage = (message: any, sender: any) => {
      if (!message || message.source !== 'content') return;

      if (message.type === 'RUN_TRIGGER_FUNCTION') {
        const { functionName } = message.payload;
        const senderTabId = sender.tab?.id;
        if (senderTabId) {
          runTriggerFunction(functionName, senderTabId, iframeRef.current);
        }
      } else if (message.type === MESSAGE_TYPES.DOM_ELEMENT_SELECTED) {
        setSelectedSelector(message.payload);
        setSelectingState(false);
      } else if (message.type === MESSAGE_TYPES.DOM_SELECT_ABORTED) {
        setSelectingState(false);
      } else if (message.type === MESSAGE_TYPES.RECORDED_ACTION) {
        const senderTabId = sender.tab?.id;
        if (senderTabId) {
          browser.tabs.query({ active: true, currentWindow: true }).then(([activeTab]) => {
            if (activeTab && activeTab.id === senderTabId) {
              recordAction(message.payload);
            }
          }).catch(err => console.error('Failed to verify active tab for recording:', err));
        }
      }
    };

    browser.runtime.onMessage.addListener(handleRuntimeMessage);
    return () => browser.runtime.onMessage.removeListener(handleRuntimeMessage);
  }, [runTriggerFunction, setSelectedSelector, setSelectingState, recordAction]);

  const [iframeLoaded, setIframeLoaded] = useState(false);

  // Handle executing any pending triggers queued while sidepanel was closed
  useEffect(() => {
    if (iframeLoaded && isInitialized) {
      const handlePending = async () => {
        const pending = await getPendingTrigger();
        if (pending) {
          await savePendingTrigger(null);
          runTriggerFunction(pending.functionName, pending.tabId, iframeRef.current);
        }
      };
      handlePending();
    }
  }, [iframeLoaded, isInitialized, runTriggerFunction]);

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen max-h-screen bg-background text-foreground select-none">
        {/* Hidden Sandbox Iframe */}
        <iframe
          ref={iframeRef}
          src={browser.runtime.getURL('/sandbox.html')}
          style={{ display: 'none' }}
          sandbox="allow-scripts"
          onLoad={() => setIframeLoaded(true)}
        />

        {/* Header Section */}
        <Header />

        {/* Action Toolbar */}
        <Toolbar iframeRef={iframeRef} />

        {/* Tabs Control Area */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="px-4 pt-2">
            <TabsList className="w-full grid grid-cols-4">
              <TabsTrigger value="editor" className="text-[10px] py-1.5 cursor-pointer px-1">
                <Code2 className="size-3 mr-0.5" />
                Editor
              </TabsTrigger>
              <TabsTrigger value="console" className="text-[10px] py-1.5 cursor-pointer relative px-1">
                <Terminal className="size-3 mr-0.5" />
                Console
                {logs.length > 0 && (
                  <Badge 
                    variant="secondary" 
                    className="ml-1 h-3.5 min-w-3.5 px-0.5 rounded-full text-[8px] font-bold animate-in zoom-in duration-200 flex items-center justify-center"
                  >
                    {logs.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="triggers" className="text-[10px] py-1.5 cursor-pointer relative px-1">
                <Zap className="size-3 mr-0.5" />
                Triggers
                {!validationError && triggers.length > 0 && (
                  <Badge 
                    variant="outline" 
                    className="ml-1 h-3.5 min-w-3.5 px-0.5 rounded-full text-[8px] font-bold border-primary text-primary bg-primary/10 flex items-center justify-center animate-in zoom-in duration-200"
                  >
                    {triggers.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="helpers" className="text-[10px] py-1.5 cursor-pointer px-1">
                <Sparkles className="size-3 mr-0.5" />
                Helpers
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab Contents Viewports */}
          <div className="flex-1 min-h-0 p-3.5">
            <TabsContent value="editor" className="h-full flex flex-col gap-3.5 m-0 data-[state=inactive]:hidden">
              <EditorTab />
            </TabsContent>

            <TabsContent value="console" className="h-full flex flex-col gap-2.5 m-0 data-[state=inactive]:hidden">
              <ConsoleTab />
            </TabsContent>

            <TabsContent value="triggers" className="h-full flex flex-col gap-3.5 m-0 data-[state=inactive]:hidden">
              <TriggersTab iframeRef={iframeRef} />
            </TabsContent>

            <TabsContent value="helpers" className="h-full flex flex-col gap-3.5 m-0 data-[state=inactive]:hidden">
              <HelpersTab />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
