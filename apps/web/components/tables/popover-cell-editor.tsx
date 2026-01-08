'use client';

import { forwardRef, useImperativeHandle, useState, useRef, useEffect } from 'react';
import { ICellEditorParams } from 'ag-grid-community';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Button } from '../ui/button';
import { Check, X } from 'lucide-react';

export interface PopoverCellEditorParams extends ICellEditorParams {
  maxLength?: number;
}

export const PopoverCellEditor = forwardRef((props: PopoverCellEditorParams, ref) => {
  const { value, stopEditing } = props;
  const [editValue, setEditValue] = useState<string>(value || '');
  const [isOpen, setIsOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-open popover when editor is activated
  useEffect(() => {
    setIsOpen(true);
    // Focus textarea after popover opens
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.select();
    }, 100);
  }, []);

  useImperativeHandle(ref, () => ({
    getValue: () => editValue,
    
    isCancelBeforeStart: () => false,
    
    isCancelAfterEnd: () => false,
  }));

  const handleSave = () => {
    setIsOpen(false);
    stopEditing();
  };

  const handleCancel = () => {
    setEditValue(value || '');
    setIsOpen(false);
    stopEditing(true); // Cancel the edit
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Prevent AG Grid from handling these keys
    e.stopPropagation();
    
    if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Enter' && e.ctrlKey) {
      handleSave();
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={(open) => {
      if (!open) {
        handleCancel();
      }
    }}>
      <PopoverTrigger asChild>
        <div className="w-full h-full flex items-center px-2">
          <span className="truncate">{editValue}</span>
        </div>
      </PopoverTrigger>
      <PopoverContent 
        className="p-0 w-100"
        align="start"
        sideOffset={0}
        style={{
          // Position relative to the cell
          maxHeight: '400px',
        }}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          textareaRef.current?.focus();
        }}
      >
        <div className="flex flex-col h-full">
          <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Edit Cell</span>
            <span className="text-xs text-slate-500">
              Ctrl+Enter to save, Esc to cancel
            </span>
          </div>
          
          <div className="p-3">
            <textarea
              ref={textareaRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full min-h-30 max-h-75 p-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              placeholder="Enter value..."
              autoFocus
            />
          </div>

          <div className="p-3 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancel}
              className="flex items-center gap-1"
            >
              <X size={14} />
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700"
            >
              <Check size={14} />
              Save
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
});

PopoverCellEditor.displayName = 'PopoverCellEditor';
