'use client';

import { useState, useCallback, useRef, MouseEvent } from 'react';

export function useDragSelect<T extends string | number>(initialSelection: Set<T> = new Set()) {
  const [selectedItems, setSelectedItems] = useState<Set<T>>(initialSelection);
  const [isDragging, setIsDragging] = useState(false);
  const [isRangeSelecting, setIsRangeSelecting] = useState(false);
  const dragStartItem = useRef<T | null>(null);
  const lastClickedItem = useRef<T | null>(null);
  const dragAction = useRef<'select' | 'deselect'>('select');

  const toggleItem = useCallback((item: T) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(item)) {
        newSet.delete(item);
      } else {
        newSet.add(item);
      }
      return newSet;
    });
  }, []);

  const selectItem = useCallback((item: T) => {
    setSelectedItems((prev) => new Set(prev).add(item));
  }, []);

  const deselectItem = useCallback((item: T) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      newSet.delete(item);
      return newSet;
    });
  }, []);

  const selectAll = useCallback((items: T[]) => {
    setSelectedItems(new Set(items));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  const selectRange = useCallback((startItem: T, endItem: T, allItems: T[]) => {
    const startIdx = allItems.indexOf(startItem);
    const endIdx = allItems.indexOf(endItem);
    
    if (startIdx === -1 || endIdx === -1) return;
    
    const [minIdx, maxIdx] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
    const itemsInRange = allItems.slice(minIdx, maxIdx + 1);
    
    setSelectedItems(new Set(itemsInRange));
  }, []);

  const handleClick = useCallback((item: T, e: MouseEvent, allItems: T[]) => {
    e.preventDefault();
    
    // Shift+Click: Range selection
    if (e.shiftKey && lastClickedItem.current) {
      setIsRangeSelecting(true);
      selectRange(lastClickedItem.current, item, allItems);
      setIsRangeSelecting(false);
    } 
    // Ctrl/Cmd+Click: Toggle individual item
    else if (e.ctrlKey || e.metaKey) {
      toggleItem(item);
      lastClickedItem.current = item;
    } 
    // Regular click: Select only this item
    else {
      setSelectedItems(new Set([item]));
      lastClickedItem.current = item;
    }
  }, [selectRange, toggleItem]);

  const handleMouseDown = useCallback((item: T, e: MouseEvent) => {
    // Don't start drag if using modifier keys
    if (e.shiftKey || e.ctrlKey || e.metaKey) return;
    
    e.preventDefault();
    setIsDragging(true);
    dragStartItem.current = item;
    
    // Determine drag action based on whether item is already selected
    const wasSelected = selectedItems.has(item);
    dragAction.current = wasSelected ? 'deselect' : 'select';
    
    // Apply action to start item
    if (dragAction.current === 'select') {
      selectItem(item);
    } else {
      deselectItem(item);
    }
  }, [selectedItems, selectItem, deselectItem]);

  const handleMouseEnter = useCallback((item: T, allItems: T[]) => {
    if (!isDragging || !dragStartItem.current) return;

    // Apply drag action to items
    if (dragAction.current === 'select') {
      // Get range and select all items in it
      const startIdx = allItems.indexOf(dragStartItem.current);
      const endIdx = allItems.indexOf(item);
      const [minIdx, maxIdx] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
      const itemsInRange = allItems.slice(minIdx, maxIdx + 1);
      
      setSelectedItems((prev) => {
        const newSet = new Set(prev);
        itemsInRange.forEach(i => newSet.add(i));
        return newSet;
      });
    } else {
      // Deselect items in range
      const startIdx = allItems.indexOf(dragStartItem.current);
      const endIdx = allItems.indexOf(item);
      const [minIdx, maxIdx] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
      const itemsInRange = allItems.slice(minIdx, maxIdx + 1);
      
      setSelectedItems((prev) => {
        const newSet = new Set(prev);
        itemsInRange.forEach(i => newSet.delete(i));
        return newSet;
      });
    }
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    dragStartItem.current = null;
  }, []);

  return {
    selectedItems,
    isDragging,
    isRangeSelecting,
    toggleItem,
    selectItem,
    deselectItem,
    selectAll,
    clearSelection,
    selectRange,
    handleClick,
    handleMouseDown,
    handleMouseEnter,
    handleMouseUp,
  };
}
