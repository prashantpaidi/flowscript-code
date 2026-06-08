import React, { useState, useEffect, useRef } from 'react';
import { useAutomationStore } from '../store/useAutomationStore';
import { FileNode } from '@/utils/storage';
import { 
  Folder, 
  FolderOpen, 
  FileCode, 
  File, 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  FolderPlus, 
  Trash2, 
  Edit2, 
  Check, 
  X 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function FileTree() {
  const files = useAutomationStore((s) => s.files);
  const activeFileId = useAutomationStore((s) => s.activeFileId);
  const createFile = useAutomationStore((s) => s.createFile);
  const createFolder = useAutomationStore((s) => s.createFolder);
  const renameNode = useAutomationStore((s) => s.renameNode);
  const deleteNode = useAutomationStore((s) => s.deleteNode);
  const setActiveFileId = useAutomationStore((s) => s.setActiveFileId);

  // Expanded folders state
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    // By default, expand all folders
    const initialExpanded: Record<string, boolean> = {};
    files.forEach(n => {
      if (n.type === 'folder') {
        initialExpanded[n.id] = true;
      }
    });
    return initialExpanded;
  });

  // Auto-expand newly loaded folders from storage
  useEffect(() => {
    setExpanded(prev => {
      let changed = false;
      const next = { ...prev };
      files.forEach(n => {
        if (n.type === 'folder' && prev[n.id] === undefined) {
          next[n.id] = true;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [files]);

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // Inline creation state
  const [creatingType, setCreatingType] = useState<'file' | 'folder' | null>(null);
  const [creatingParentId, setCreatingParentId] = useState<string | null>(null);
  const [createValue, setCreateValue] = useState('');
  const createInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when editing starts
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  // Auto-focus input when creation starts
  useEffect(() => {
    if (creatingType && createInputRef.current) {
      createInputRef.current.focus();
    }
  }, [creatingType]);

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleStartRename = (node: FileNode, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(node.id);
    setEditValue(node.name);
  };

  const handleSaveRename = () => {
    if (editingId && editValue.trim()) {
      renameNode(editingId, editValue.trim());
    }
    setEditingId(null);
  };

  const handleCancelRename = () => {
    setEditingId(null);
  };

  const handleStartCreation = (type: 'file' | 'folder', parentId: string | null, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCreatingType(type);
    setCreatingParentId(parentId);
    setCreateValue('');
    
    // Automatically expand parent folder if creating inside it
    if (parentId) {
      setExpanded(prev => ({ ...prev, [parentId]: true }));
    }
  };

  const handleSaveCreation = () => {
    const trimmed = createValue.trim();
    if (trimmed && creatingType) {
      if (creatingType === 'file') {
        createFile(trimmed, creatingParentId);
      } else {
        createFolder(trimmed, creatingParentId);
      }
    }
    setCreatingType(null);
    setCreatingParentId(null);
  };

  const handleCancelCreation = () => {
    setCreatingType(null);
    setCreatingParentId(null);
  };

  const handleDelete = (node: FileNode, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmMsg = node.type === 'folder' 
      ? `Delete folder "${node.name}" and all its contents?`
      : `Delete file "${node.name}"?`;
    
    if (window.confirm(confirmMsg)) {
      deleteNode(node.id);
    }
  };

  const getSortedChildren = (parentId: string | null): FileNode[] => {
    const children = files.filter(n => n.parentId === parentId);
    const folders = children.filter(n => n.type === 'folder').sort((a, b) => a.name.localeCompare(b.name));
    const filesOnly = children.filter(n => n.type === 'file').sort((a, b) => a.name.localeCompare(b.name));
    return [...folders, ...filesOnly];
  };

  // Helper to render tree nodes recursively
  const renderNode = (node: FileNode, depth: number) => {
    const isFolder = node.type === 'folder';
    const isExpanded = !!expanded[node.id];
    const isActive = activeFileId === node.id;
    const isEditing = editingId === node.id;
    const sortedChildren = isFolder ? getSortedChildren(node.id) : [];

    return (
      <div key={node.id} className="flex flex-col select-none">
        {/* Node Row */}
        <div 
          onClick={() => !isFolder && setActiveFileId(node.id)}
          style={{ paddingLeft: `${depth * 8 + 8}px` }}
          className={`group flex items-center justify-between py-1.5 pr-2 text-xs transition-colors duration-150 rounded cursor-pointer ${
            isActive 
              ? 'bg-secondary text-primary font-medium' 
              : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {/* Expand/Collapse Chevron for Folders */}
            {isFolder ? (
              <button 
                onClick={(e) => toggleExpand(node.id, e)}
                className="p-0.5 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {isExpanded ? (
                  <ChevronDown className="size-3.5" />
                ) : (
                  <ChevronRight className="size-3.5" />
                )}
              </button>
            ) : (
              <span className="w-4.5" /> // spacer to align files with folders
            )}

            {/* File/Folder Icons */}
            {isFolder ? (
              isExpanded ? (
                <FolderOpen className="size-3.5 text-sky-400 shrink-0" />
              ) : (
                <Folder className="size-3.5 text-sky-400 shrink-0" />
              )
            ) : (
              node.name.endsWith('.ts') || node.name.endsWith('.js') ? (
                <FileCode className="size-3.5 text-emerald-400 shrink-0" />
              ) : (
                <File className="size-3.5 text-muted-foreground shrink-0" />
              )
            )}

            {/* Name label or Input */}
            {isEditing ? (
              <input
                ref={editInputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleSaveRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveRename();
                  if (e.key === 'Escape') handleCancelRename();
                }}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 min-w-0 bg-background border border-input rounded px-1 py-0.5 text-[11px] font-mono outline-none text-foreground"
              />
            ) : (
              <span className="truncate text-[11px] font-mono">{node.name}</span>
            )}
          </div>

          {/* Action buttons (Rename, Add file/folder inside, Delete) on hover */}
          {!isEditing && (
            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity duration-150 shrink-0">
              {isFolder && (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={(e) => handleStartCreation('file', node.id, e)}
                        className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/80 cursor-pointer"
                      >
                        <Plus className="size-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-[10px] p-1 px-1.5">
                      New File
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={(e) => handleStartCreation('folder', node.id, e)}
                        className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/80 cursor-pointer"
                      >
                        <FolderPlus className="size-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-[10px] p-1 px-1.5">
                      New Folder
                    </TooltipContent>
                  </Tooltip>
                </>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => handleStartRename(node, e)}
                    className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/80 cursor-pointer"
                  >
                    <Edit2 className="size-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-[10px] p-1 px-1.5">
                  Rename
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => handleDelete(node, e)}
                    className="p-0.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                  >
                    <Trash2 className="size-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-[10px] p-1 px-1.5">
                  Delete
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>

        {/* Children Render */}
        {isFolder && isExpanded && (
          <div className="flex flex-col">
            {/* Render Inline Create Input if creating inside this folder */}
            {creatingType && creatingParentId === node.id && renderCreateInput(depth + 1)}
            
            {sortedChildren.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Helper to render the inline create input box
  const renderCreateInput = (depth: number) => {
    return (
      <div 
        style={{ paddingLeft: `${depth * 8 + 8}px` }}
        className="flex items-center gap-1.5 py-1.5 pr-2 text-xs"
      >
        <span className="w-4.5 shrink-0" />
        {creatingType === 'folder' ? (
          <Folder className="size-3.5 text-sky-400 shrink-0" />
        ) : (
          <FileCode className="size-3.5 text-emerald-400 shrink-0" />
        )}
        <div className="flex-1 flex items-center gap-1 min-w-0">
          <input
            ref={createInputRef}
            placeholder={creatingType === 'folder' ? 'folder_name' : 'script_name.ts'}
            value={createValue}
            onChange={(e) => setCreateValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveCreation();
              if (e.key === 'Escape') handleCancelCreation();
            }}
            className="flex-1 min-w-0 bg-background border border-input rounded px-1 py-0.5 text-[11px] font-mono outline-none text-foreground"
          />
          <button 
            onClick={handleSaveCreation}
            className="p-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 shrink-0 cursor-pointer"
          >
            <Check className="size-3" />
          </button>
          <button 
            onClick={handleCancelCreation}
            className="p-0.5 rounded bg-muted text-muted-foreground hover:bg-muted-foreground/10 shrink-0 cursor-pointer"
          >
            <X className="size-3" />
          </button>
        </div>
      </div>
    );
  };

  const rootChildren = getSortedChildren(null);

  return (
    <div className="h-full flex flex-col gap-2">
      {/* File Tree Header Actions */}
      <div className="flex items-center justify-between pb-1.5 border-b border-border">
        <span className="text-[10px] tracking-wider uppercase font-bold text-muted-foreground">Files</span>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => handleStartCreation('file', null, e)}
                className="size-5 text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
              >
                <Plus className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-[10px] p-1 px-1.5">
              New File at Root
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => handleStartCreation('folder', null, e)}
                className="size-5 text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
              >
                <FolderPlus className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-[10px] p-1 px-1.5">
              New Folder at Root
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* File Tree Scroll List */}
      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-0.5">
        {creatingType && creatingParentId === null && renderCreateInput(0)}

        {rootChildren.length === 0 && !creatingType ? (
          <div className="text-[10px] text-center text-muted-foreground py-8">
            No files. Click "+" to create one.
          </div>
        ) : (
          rootChildren.map(node => renderNode(node, 0))
        )}
      </div>
    </div>
  );
}
