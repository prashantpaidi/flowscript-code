import { useAutomationStore } from '../store/useAutomationStore';
import { Badge } from '@/components/ui/badge';
import { FileCode2 } from 'lucide-react';

export function Header() {
  const status = useAutomationStore((s) => s.status);
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
      <div className="flex items-center gap-2">
        <FileCode2 className="size-5 text-muted-foreground" />
        <div>
          <h1 className="text-sm font-semibold text-foreground">
            FlowScript Studio
          </h1>
          <p className="text-[10px] text-muted-foreground">Web Automation</p>
        </div>
      </div>

      <Badge 
        variant={status === 'error' ? 'destructive' : 'secondary'}
        className="gap-1.5 capitalize animate-in fade-in zoom-in duration-200"
      >
        <span className={`size-1.5 rounded-full ${
          status === 'running' ? 'bg-amber-500 animate-pulse' :
          status === 'success' ? 'bg-emerald-500' :
          status === 'error' ? 'bg-rose-500' : 'bg-muted-foreground/60'
        }`} />
        {status}
      </Badge>
    </header>
  );
}
