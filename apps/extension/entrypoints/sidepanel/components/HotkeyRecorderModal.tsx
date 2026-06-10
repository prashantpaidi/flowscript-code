import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Keyboard, RefreshCw, AlertCircle } from 'lucide-react';

interface HotkeyRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecord: (combo: string) => void;
  actionType: 'press' | 'trigger';
}

export function HotkeyRecorderModal({ isOpen, onClose, onRecord, actionType }: HotkeyRecorderModalProps) {
  const [ctrl, setCtrl] = useState(false);
  const [shift, setShift] = useState(false);
  const [alt, setAlt] = useState(false);
  const [meta, setMeta] = useState(false);
  const [primaryKey, setPrimaryKey] = useState('');

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setCtrl(false);
      setShift(false);
      setAlt(false);
      setMeta(false);
      setPrimaryKey('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Check modifiers
      setCtrl(e.ctrlKey);
      setShift(e.shiftKey);
      setAlt(e.altKey);
      setMeta(e.metaKey);

      // Identify key
      const keyName = e.key;
      const isModifier = ['Control', 'Shift', 'Alt', 'Meta', 'CapsLock'].includes(keyName);

      if (!isModifier) {
        if (keyName === ' ') {
          setPrimaryKey('Space');
        } else if (keyName.length === 1) {
          setPrimaryKey(keyName.toUpperCase());
        } else {
          // Normalise arrow keys or other named keys
          setPrimaryKey(keyName);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Keep modifier state in sync
      setCtrl(e.ctrlKey);
      setShift(e.shiftKey);
      setAlt(e.altKey);
      setMeta(e.metaKey);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Build the combo representation
  const getComboString = () => {
    const parts: string[] = [];
    if (ctrl) parts.push('Ctrl');
    if (shift) parts.push('Shift');
    if (alt) parts.push('Alt');
    if (meta) parts.push('Meta');
    if (primaryKey) {
      if (primaryKey === 'Space') {
        parts.push('space');
      } else {
        parts.push(primaryKey);
      }
    }
    return parts.join('+');
  };

  const currentCombo = getComboString();

  const handleInsert = () => {
    if (currentCombo) {
      onRecord(currentCombo);
    }
  };

  const handleClear = () => {
    setCtrl(false);
    setShift(false);
    setAlt(false);
    setMeta(false);
    setPrimaryKey('');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in duration-200">
      <div className="bg-card text-foreground border border-border w-full max-w-[300px] rounded-xl shadow-2xl p-5 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-border">
          <div className="flex items-center gap-2 text-xs font-bold text-primary">
            <Keyboard className="size-4" />
            <span>
              {actionType === 'press' ? 'Record press() Combo' : 'Record Trigger Hotkey'}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-6 cursor-pointer text-muted-foreground hover:text-foreground rounded"
            onClick={onClose}
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Recording Visual Display */}
        <div className="flex flex-col items-center justify-center py-6 px-3 bg-muted/30 border border-dashed border-border rounded-lg min-h-[90px] relative overflow-hidden group">
          {currentCombo ? (
            <div className="flex flex-wrap items-center justify-center gap-1.5 animate-in fade-in zoom-in-95 duration-150">
              {ctrl && <kbd className="px-2 py-1 bg-background text-[10px] font-bold border-b-2 border-muted-foreground/30 rounded font-mono shadow-sm">Ctrl</kbd>}
              {shift && <kbd className="px-2 py-1 bg-background text-[10px] font-bold border-b-2 border-muted-foreground/30 rounded font-mono shadow-sm">Shift</kbd>}
              {alt && <kbd className="px-2 py-1 bg-background text-[10px] font-bold border-b-2 border-muted-foreground/30 rounded font-mono shadow-sm">Alt</kbd>}
              {meta && <kbd className="px-2 py-1 bg-background text-[10px] font-bold border-b-2 border-muted-foreground/30 rounded font-mono shadow-sm">Meta</kbd>}
              {primaryKey && <kbd className="px-2 py-1 bg-primary text-primary-foreground text-[10px] font-bold border-b-2 border-primary-foreground/30 rounded font-mono shadow-sm animate-in scale-100 duration-100">{primaryKey}</kbd>}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5 animate-pulse">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Listening...</span>
              <span className="text-[10px] text-muted-foreground text-center">Press key combination on your keyboard</span>
            </div>
          )}
        </div>

        {/* Instructions / Info */}
        <div className="flex items-start gap-2 bg-muted/20 p-2.5 rounded-lg border border-border/50 text-[10px] text-muted-foreground leading-relaxed">
          <AlertCircle className="size-3.5 mt-0.5 text-primary shrink-0" />
          <p>
            Press modifiers like <kbd className="font-mono bg-muted px-1 rounded">Ctrl</kbd> or <kbd className="font-mono bg-muted px-1 rounded">Shift</kbd> first, followed by the main key to record.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <Button
            variant="ghost"
            size="xs"
            className="cursor-pointer text-[10px] flex-1"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            size="xs"
            className="cursor-pointer text-[10px] flex items-center gap-1 text-muted-foreground"
            onClick={handleClear}
            disabled={!currentCombo}
          >
            <RefreshCw className="size-3" />
            Reset
          </Button>
          <Button
            variant="default"
            size="xs"
            className="cursor-pointer text-[10px] flex-1 font-bold"
            onClick={handleInsert}
            disabled={!currentCombo}
          >
            Insert
          </Button>
        </div>

      </div>
    </div>
  );
}
