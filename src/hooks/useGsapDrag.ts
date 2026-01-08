import { useRef, useState, useCallback, useEffect } from 'react';
import gsap from 'gsap';
interface RowPosition {
  top: number;
  height: number;
  element: HTMLElement;
}
interface DragState {
  draggingId: string | null;
  originalIndex: number;
  currentHoverIndex: number;
  cursor: {
    x: number;
    y: number;
  };
}
interface UseGsapDragOptions<T extends {
  id: string;
  groupId?: string;
  groupedFilters?: string[];
}> {
  items: T[];
  onReorder: (newItems: T[]) => void;
  containerRef: React.RefObject<HTMLElement>;
  isDisabled?: boolean;
  onPreviewHover?: (hoverIndex: number, originalIndex: number, draggingId: string) => void;
  onCancelPreview?: () => void;
  onGroupFilter?: (draggedId: string, baseFilterId: string) => void;
  onAddToGroup?: (draggedId: string, baseFilterId: string, insertIndex: number) => void;
  onUngroupFilter?: (filterId: string) => void;
  onGroupHover?: (baseFilterId: string | null) => void;
  onError?: (message: string) => void;
}
export function useGsapDrag<T extends {
  id: string;
  groupId?: string;
  groupedFilters?: string[];
}>({
  items,
  onReorder,
  containerRef,
  isDisabled = false,
  onPreviewHover,
  onCancelPreview,
  onGroupFilter,
  onAddToGroup,
  onUngroupFilter,
  onGroupHover,
  onError
}: UseGsapDragOptions<T>) {
  const [dragState, setDragState] = useState<DragState>({
    draggingId: null,
    originalIndex: -1,
    currentHoverIndex: -1,
    cursor: {
      x: 0,
      y: 0
    }
  });
  const rowPositionsRef = useRef<Map<string, RowPosition>>(new Map());
  const offsetMapRef = useRef<Map<string, number>>(new Map());
  const floatingElementRef = useRef<HTMLElement | null>(null);
  const placeholderRef = useRef<HTMLElement | null>(null);
  const dragOffsetRef = useRef({
    x: 0,
    y: 0
  });
  const itemsRef = useRef(items);
  const scrollContainerRef = useRef<HTMLElement | null>(null);
  const originalOverflowRef = useRef<string>('');
  const originalScrollTopRef = useRef<number>(0);
  const containerHeightRef = useRef<number>(0);
  const isOutsidePanelRef = useRef<boolean>(false);
  const groupingHoverIdRef = useRef<string | null>(null);
  const groupContainerHoverRef = useRef<{
    baseId: string;
    insertIndex: number;
  } | null>(null);

  // Keep items ref updated
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Calculate row positions
  const calculateRowPositions = useCallback(() => {
    if (!containerRef.current) return;
    const rows = containerRef.current.querySelectorAll('[data-filter-row]');
    const containerRect = containerRef.current.getBoundingClientRect();
    rowPositionsRef.current.clear();
    rows.forEach(row => {
      const id = row.getAttribute('data-filter-id');
      if (!id) return;
      const rect = row.getBoundingClientRect();
      rowPositionsRef.current.set(id, {
        top: rect.top - containerRect.top,
        height: rect.height,
        element: row as HTMLElement
      });
    });
  }, [containerRef]);

  // Restore group container heights and styles instantaneously
  const restoreGroupStyles = useCallback(() => {
    if (!containerRef.current) return;
    const groupContainers = containerRef.current.querySelectorAll('[data-group-container]');
    groupContainers.forEach((container) => {
      const containerEl = container as HTMLElement;
      const groupContent = containerEl.querySelector('[data-group-content]') as HTMLElement;
      const groupTop = containerEl.querySelector('[data-group-top]') as HTMLElement;
      const groupBottom = containerEl.querySelector('[data-group-bottom]') as HTMLElement;

      if (groupContent) {
        // Restore overflow
        if ((containerEl as any).__originalOverflow !== undefined) {
          groupContent.style.overflow = (containerEl as any).__originalOverflow;
          delete (containerEl as any).__originalOverflow;
        }

        // Restore child filter positions and visibility immediately
        const rows = groupContent.querySelectorAll('[data-filter-row]');
        rows.forEach(row => {
          const rowEl = row as HTMLElement;
          rowEl.style.position = '';
          rowEl.style.visibility = '';
          delete (rowEl as any).__originalPosition;
          delete (rowEl as any).__originalVisibility;
        });

        // Restore height immediately
        if ((containerEl as any).__originalHeight !== undefined) {
          gsap.set(groupContent, { height: 'auto', clearProps: 'all' });
          delete (containerEl as any).__originalHeight;
        }
      }

      // Restore group borders and elements immediately
      if ((containerEl as any).__originalBorder !== undefined) {
        containerEl.style.borderWidth = (containerEl as any).__originalBorder;
        delete (containerEl as any).__originalBorder;
      }
      if (groupTop && (groupTop as any).__originalDisplay !== undefined) {
        groupTop.style.display = (groupTop as any).__originalDisplay;
        delete (groupTop as any).__originalDisplay;
      }
      if (groupTop) {
        gsap.set(groupTop, { y: 0, clearProps: 'transform' });
      }
      if (groupBottom && (groupBottom as any).__originalDisplay !== undefined) {
        groupBottom.style.display = (groupBottom as any).__originalDisplay;
        delete (groupBottom as any).__originalDisplay;
      }
      if (groupBottom) {
        gsap.set(groupBottom, { y: 0, clearProps: 'transform' });
      }
    });
  }, [containerRef]);

  // Get drop index based on cursor position
  const getDropIndex = useCallback((cursorY: number, currentDraggingId: string): number => {
    if (!containerRef.current) return -1;
    const containerRect = containerRef.current.getBoundingClientRect();
    const relativeY = cursorY - containerRect.top;

    const currentItems = itemsRef.current;
    const draggedItem = currentItems.find(item => item.id === currentDraggingId);
    const isDraggingGroup = draggedItem && !draggedItem.groupId && draggedItem.groupedFilters && draggedItem.groupedFilters.length > 0;
    const groupMembers = isDraggingGroup ? [currentDraggingId, ...(draggedItem!.groupedFilters || [])] : [currentDraggingId];

    // CRITICAL FIX: Add a dedicated "top zone" for inserting at position 0
    // If cursor is within the first 40px of the container, always return 0
    // This prevents jittery behavior when trying to drag to the top
    const TOP_ZONE_HEIGHT = 40;
    if (relativeY < TOP_ZONE_HEIGHT) {
      return 0;
    }

    // Build a list of valid drop targets (non-dragged items)
    const validTargets: Array<{
      item: T;
      index: number;
      position: RowPosition;
    }> = [];
    currentItems.forEach((item, index) => {
      // Skip all members of the group being dragged
      if (groupMembers.includes(item.id)) {
        return;
      }
      const position = rowPositionsRef.current.get(item.id);
      if (position) {
        validTargets.push({
          item,
          index,
          position
        });
      }
    });
    
    if (validTargets.length === 0) {
      const originalIndex = currentItems.findIndex(f => f.id === currentDraggingId);
      return originalIndex;
    }

    // CRITICAL FIX: Add a dedicated "bottom zone" for inserting at the end
    // Find the last valid target and check if cursor is below it
    const lastTarget = validTargets[validTargets.length - 1];
    const lastTargetBottom = lastTarget.position.top + lastTarget.position.height;
    const BOTTOM_ZONE_HEIGHT = 40;

    // If cursor is below the last filter (with buffer), insert at the end
    if (relativeY > lastTargetBottom + BOTTOM_ZONE_HEIGHT) {
      return currentItems.length;
    }

    // Find which target the cursor is closest to
    let closestIndex = validTargets[0].index;
    let minDistance = Infinity;
    validTargets.forEach(({
      index,
      position
    }) => {
      // Calculate the center Y position of this target
      const centerY = position.top + position.height / 2;
      const distance = Math.abs(relativeY - centerY);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    // Determine insertion position based on cursor position relative to closest item
    const closestTarget = validTargets.find(t => t.index === closestIndex);
    if (closestTarget) {
      const { top, height } = closestTarget.position;
      const originalIndex = currentItems.findIndex(f => f.id === currentDraggingId);
      const draggedFilter = currentItems.find(f => f.id === currentDraggingId);
      
      // SENSITIVITY FIX: Drastically increase responsiveness by accounting for the 
      // visual footprint of the card being dragged.
      let threshold = top + height / 2;
      
      if (originalIndex < closestIndex) {
        threshold = top + height * 0.1; 
      } else if (originalIndex > closestIndex) {
        threshold = top + height * 0.9;
      }

      let targetIndex = relativeY < threshold ? closestIndex : closestIndex + 1;

      // RULE: Non-base filters cannot be below the base filter in a group
      // If dragging a child filter down, and targetIndex would put it below its base filter
      if (draggedFilter?.groupId && originalIndex < targetIndex) {
        const baseFilter = currentItems.find(f => f.id === draggedFilter.groupId);
        if (baseFilter) {
          const baseIndex = currentItems.findIndex(f => f.id === baseFilter.id);
          
          // If trying to go below or at the base filter's position (which is bottom of group)
          if (targetIndex > baseIndex) {
            // Check if we are still visually inside the group container
            const groupContainer = closestTarget.position.element.closest('[data-group-container]');
            const groupBaseId = groupContainer?.getAttribute('data-group-base');
            
            // CRITICAL FIX: Only apply the "sticky to base filter" logic if the 
            // container we found is actually the group the filter belongs to.
            // If groupBaseId !== draggedFilter.groupId, we are hovering over another group.
            if (groupContainer && groupBaseId === draggedFilter.groupId) {
              const groupRect = groupContainer.getBoundingClientRect();
              const containerRect = containerRef.current!.getBoundingClientRect();
              const groupBottom = groupRect.bottom - containerRect.top;
              
              // If cursor is still inside the group container (with a small buffer for the bottom border)
              if (relativeY < groupBottom - 10) {
                // Force it to stay at the base filter's position (which inserts BEFORE the base filter)
                return baseIndex;
              }
            }
          }
        }
      }

      return targetIndex;
    }
    
    const originalIndex = currentItems.findIndex(f => f.id === currentDraggingId);
    return originalIndex;
  }, [containerRef]);

  // Animate rows to make space
  const animateRowOffsets = useCallback((hoverIndex: number, originalIndex: number, draggingId: string) => {
    const currentItems = itemsRef.current;
    
    // Check if dragging a GROUP (base filter with children) - NOT a child filter
    const draggedItem = currentItems.find(item => item.id === draggingId);
    // Only treat as group if it's a BASE filter with groupedFilters (not a child with groupId)
    const isDraggingGroup = draggedItem && !draggedItem.groupId && draggedItem.groupedFilters && draggedItem.groupedFilters.length > 0;
    const groupMembers = isDraggingGroup ? [draggingId, ...(draggedItem!.groupedFilters || [])] : [draggingId];

    // ALWAYS treat the dragged item as a single card height for animations
    // This makes groups collapse visually during drag-and-drop reordering
    const draggedPosition = rowPositionsRef.current.get(draggingId);
    let draggedHeight = draggedPosition?.height || 0;

    // Calculate and apply offsets for each item
    currentItems.forEach((item, index) => {
      // Skip the dragged item and all group members if dragging a group
      if (groupMembers.includes(item.id)) return;
      
      const position = rowPositionsRef.current.get(item.id);
      if (!position) return;

      // Calculate offset for this item
      let offset = 0;
      if (originalIndex < hoverIndex) {
        // Dragging DOWN
        // Items between original and hover move up to fill the space
        if (index > originalIndex && index < hoverIndex) {
          offset = -(draggedHeight + 8);
        }
      } else if (originalIndex > hoverIndex) {
        // Dragging UP
        // Items from hover to original move down to make space
        if (index >= hoverIndex && index < originalIndex) {
          offset = draggedHeight + 8;
        }
      }

      // Apply offset
      const currentOffset = offsetMapRef.current.get(item.id) || 0;
      if (currentOffset !== offset) {
        offsetMapRef.current.set(item.id, offset);
        gsap.to(position.element, {
          y: offset,
          duration: 0.5,
          ease: 'power2.out'
        });
      }
    });

    // GROUP FURNITURE ANIMATION: 
    // Handle shrinking/expanding group containers visually when children move out/in
    if (containerRef.current) {
      const groupContainers = containerRef.current.querySelectorAll('[data-group-container]');
      groupContainers.forEach(container => {
        const baseId = container.getAttribute('data-group-base');
        if (!baseId) return;

        const groupContent = container.querySelector('[data-group-content]') as HTMLElement;
        const groupTop = container.querySelector('[data-group-top]') as HTMLElement;
        const groupBottom = container.querySelector('[data-group-bottom]') as HTMLElement;
        if (!groupContent || !groupTop || !groupBottom) return;

        // Find all members of this group in the current items list
        const memberIds = itemsRef.current
          .filter(f => f.id === baseId || f.groupId === baseId)
          .map(f => f.id);
        
        // Find the first and last member element offsets
        let minOffset = 0;
        let maxOffset = 0;
        let firstMemberId = '';
        let lastMemberId = '';

        // Determine which members are currently at the visual top and bottom
        const visibleMembers = itemsRef.current
          .filter(f => memberIds.includes(f.id) && f.id !== draggingId)
          .sort((a, b) => {
            const aIdx = itemsRef.current.findIndex(f => f.id === a.id);
            const bIdx = itemsRef.current.findIndex(f => f.id === b.id);
            return aIdx - bIdx;
          });

        if (visibleMembers.length > 0) {
          firstMemberId = visibleMembers[0].id;
          lastMemberId = visibleMembers[visibleMembers.length - 1].id;
          minOffset = offsetMapRef.current.get(firstMemberId) || 0;
          maxOffset = offsetMapRef.current.get(lastMemberId) || 0;
        }

        // Shift top and bottom borders to match the first and last visible members
        // This ensures the placeholder appears OUTSIDE the group container
        gsap.to(groupTop, {
          y: minOffset,
          duration: 0.5,
          ease: 'power2.out'
        });
        gsap.to(groupBottom, {
          y: maxOffset,
          duration: 0.5,
          ease: 'power2.out'
        });
      });
    }
  }, [containerRef]);

  // Reset all offsets to 0
  const resetAllOffsets = useCallback(() => {
    const currentItems = itemsRef.current;
    currentItems.forEach((item) => {
      if (item.id === dragState.draggingId) return;
      
      const position = rowPositionsRef.current.get(item.id);
      if (!position) return;
      
      const currentOffset = offsetMapRef.current.get(item.id) || 0;
      if (currentOffset !== 0) {
        offsetMapRef.current.set(item.id, 0);
        gsap.killTweensOf(position.element);
        gsap.to(position.element, {
          y: 0,
          duration: 0.4,
          ease: 'power2.out',
        });
      }
    });

    // Reset group furniture
    if (containerRef.current) {
      const furniture = containerRef.current.querySelectorAll('[data-group-top], [data-group-bottom]');
      if (furniture.length > 0) {
        gsap.killTweensOf(Array.from(furniture));
        gsap.to(Array.from(furniture), {
          y: 0,
          duration: 0.4,
          ease: 'power2.out',
        });
      }
    }
  }, [dragState.draggingId, containerRef]);

  // Move drag
  const handleDragMove = useCallback((e: React.PointerEvent) => {
    if (!dragState.draggingId || !floatingElementRef.current) return;
    const x = e.clientX - dragOffsetRef.current.x;
    const y = e.clientY - dragOffsetRef.current.y;

    // PERFORMANCE FIX: Use transform instead of left/top for GPU-accelerated, instant cursor tracking
    // Transform doesn't trigger layout recalculation, making it much faster
    floatingElementRef.current.style.transform = `translate(${x}px, ${y}px) scale(1.03)`;

    // Check if hovering over grouping icon button
    let currentGroupingHoverId: string | null = null;
    if (onGroupHover && containerRef.current) {
      const elementAtPoint = document.elementFromPoint(e.clientX, e.clientY);
      const groupingButton = elementAtPoint?.closest('[data-grouping-button]');
      const baseFilterId = groupingButton?.getAttribute('data-filter-id');
      
      if (baseFilterId && baseFilterId !== dragState.draggingId) {
        const draggedFilter = itemsRef.current.find(f => f.id === dragState.draggingId);
        // Prevent nesting: check if dragging a group
        const isDraggingGroup = draggedFilter && !draggedFilter.groupId && draggedFilter.groupedFilters && draggedFilter.groupedFilters.length > 0;
        
        if (isDraggingGroup) {
          // If dragging a group over a grouping button, show error pill but don't return early
          if (onError && groupingHoverIdRef.current !== baseFilterId) {
            onError("Filter groups cannot be nested");
          }
        } else if (draggedFilter?.groupId !== baseFilterId) {
          // Don't allow grouping a filter into its own group
          currentGroupingHoverId = baseFilterId;
          // Reset offsets when hovering grouping icon
          resetAllOffsets();
        }
      }
    }
    
    // Update grouping hover state
    if (groupingHoverIdRef.current !== currentGroupingHoverId) {
      groupingHoverIdRef.current = currentGroupingHoverId;
      if (onGroupHover) onGroupHover(currentGroupingHoverId);
    }

    // Check if hovering over group container groove (between thick borders)
    let currentGroupContainerHover: { baseId: string; insertIndex: number } | null = null;
    const draggedFilter = itemsRef.current.find(f => f.id === dragState.draggingId);
    
    if (onAddToGroup && containerRef.current && !currentGroupingHoverId) {
      const elementAtPoint = document.elementFromPoint(e.clientX, e.clientY);
      const groupContainer = elementAtPoint?.closest('[data-group-container]') as HTMLElement;
      
      if (groupContainer) {
        const baseId = groupContainer.getAttribute('data-group-base');
        
        // Prevent nesting: check if dragging a group
        const isDraggingGroup = draggedFilter && !draggedFilter.groupId && draggedFilter.groupedFilters && draggedFilter.groupedFilters.length > 0;
        
        if (isDraggingGroup && baseId && baseId !== dragState.draggingId) {
          if (onError && groupContainerHoverRef.current?.baseId !== baseId) {
            onError("Filter groups cannot be nested");
          }
        } else if (baseId && baseId !== dragState.draggingId && baseId !== draggedFilter?.groupId) {
          // Allow adding to group if:
          // 1. Not the base filter itself
          // 2. Not already the base filter's group
          const groupTop = groupContainer.querySelector('[data-group-top]') as HTMLElement;
          const groupBottom = groupContainer.querySelector('[data-group-bottom]') as HTMLElement;
          const groupContent = groupContainer.querySelector('[data-group-content]') as HTMLElement;
          
          if (groupTop && groupBottom && groupContent) {
            const topRect = groupTop.getBoundingClientRect();
            const bottomRect = groupBottom.getBoundingClientRect();
            const contentRect = groupContent.getBoundingClientRect();
            
            // Check if cursor is in the groove (between top and bottom thick borders, inside content)
            if (e.clientY > topRect.bottom && e.clientY < bottomRect.top && 
                e.clientX > contentRect.left && e.clientX < contentRect.right) {
              
              // Find which position in the group to insert at
              const filterRows = Array.from(groupContent.querySelectorAll('[data-filter-row]'));
              let insertIndex = 0;
              
              for (let i = 0; i < filterRows.length; i++) {
                const row = filterRows[i] as HTMLElement;
                const rowRect = row.getBoundingClientRect();
                if (e.clientY < rowRect.top + rowRect.height / 2) {
                  insertIndex = i;
                  break;
                }
                insertIndex = i + 1;
              }
              
              currentGroupContainerHover = { baseId, insertIndex };
            }
          }
        }
      }
    }
    
    // Update group container hover ref
    groupContainerHoverRef.current = currentGroupContainerHover;

    // Check if cursor is outside the container panel
    if (containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const BUFFER = 50;
      const isOutside = e.clientX < containerRect.left - BUFFER || e.clientX > containerRect.right + BUFFER;

      // Handle transition between inside/outside states
      if (isOutside !== isOutsidePanelRef.current) {
        isOutsidePanelRef.current = isOutside;
        if (isOutside) {
          // Cursor left panel - cancel preview
          if (onCancelPreview) {
            onCancelPreview();
          }

          // Make floating card slightly transparent and collapse space
          if (floatingElementRef.current) {
            gsap.to(floatingElementRef.current, {
              opacity: 0.5,
              duration: 0.2,
              ease: 'power2.out'
            });
          }

          // Collapse all card offsets back to 0 (remove space)
          const currentItems = itemsRef.current;
          currentItems.forEach(item => {
            if (item.id === dragState.draggingId) return;
            const position = rowPositionsRef.current.get(item.id);
            if (!position) return;
            offsetMapRef.current.set(item.id, 0);
            gsap.to(position.element, {
              y: 0,
              duration: 0.5,
              ease: 'power2.out'
            });
          });
        } else {
          // Cursor re-entered panel - restore opacity
          if (floatingElementRef.current) {
            gsap.to(floatingElementRef.current, {
              opacity: 1,
              duration: 0.2,
              ease: 'power2.out'
            });
          }
        }
      }

      if (!isOutside) {
        // Calculate hover index
        const newHoverIndex = getDropIndex(e.clientY, dragState.draggingId);

        // Update if hover index changed
        if (newHoverIndex !== dragState.currentHoverIndex && newHoverIndex >= 0) {
          setDragState(prev => ({
            ...prev,
            currentHoverIndex: newHoverIndex
          }));
          animateRowOffsets(newHoverIndex, dragState.originalIndex, dragState.draggingId);

          // Trigger preview callback
          if (onPreviewHover) {
            onPreviewHover(newHoverIndex, dragState.originalIndex, dragState.draggingId);
          }
        }
      }
    }

    // PERFORMANCE FIX: Don't update cursor position in state - it causes re-renders on every pixel
    // The cursor position is only used for drawing connection lines, which can read from the event directly
    // Only update state when meaningful changes occur (hover index, grouping state)
  }, [dragState.draggingId, dragState.currentHoverIndex, dragState.originalIndex, getDropIndex, animateRowOffsets, containerRef, onPreviewHover, onCancelPreview]);

  // End drag
  const handleDragEnd = useCallback((e: React.PointerEvent | PointerEvent) => {
    if (!dragState.draggingId) return;
    
    // Safety: Capture ID and immediately clear state to prevent multiple executions
    const draggingId = dragState.draggingId;
    setDragState(prev => ({
      ...prev,
      draggingId: null,
      originalIndex: -1,
      currentHoverIndex: -1
    }));

    // Remove global safety listeners
    window.removeEventListener('pointermove', handleDragMove as any);
    window.removeEventListener('pointerup', handleDragEnd as any);

    const {
      originalIndex,
      currentHoverIndex
    } = dragState;
    const floating = floatingElementRef.current;
    const placeholder = placeholderRef.current;
    const wasOutsidePanel = isOutsidePanelRef.current;

    // Cancel any pending preview
    if (onCancelPreview) {
      onCancelPreview();
    }

    // Reset outside panel flag
    isOutsidePanelRef.current = false;

    // Check if dropped on grouping icon button
    const elementAtPoint = document.elementFromPoint(e.clientX, e.clientY);
    const groupingButton = elementAtPoint?.closest('[data-grouping-button]');
    const droppedOnGroupingId = groupingButton?.getAttribute('data-filter-id');
    
    // If dropped on a grouping icon, handle grouping
    if (droppedOnGroupingId && onGroupFilter && droppedOnGroupingId !== draggingId) {
      const draggedFilter = itemsRef.current.find(f => f.id === draggingId);
      const isDraggingGroup = draggedFilter && !draggedFilter.groupId && draggedFilter.groupedFilters && draggedFilter.groupedFilters.length > 0;
      
      if (isDraggingGroup) {
        if (onError) {
          onError("Filter groups cannot be nested");
        }
        // Don't return yet, let the normal reorder logic handle it or snap back
      } else {
        // Restore group container heights and styles before callback
        restoreGroupStyles();
        
        onGroupFilter(draggingId, droppedOnGroupingId);
        
        // Clean up
        if (floating?.parentNode) floating.parentNode.removeChild(floating);
        floatingElementRef.current = null;
        if (placeholder) {
          placeholder.style.visibility = '';
          placeholder.style.pointerEvents = '';
          placeholderRef.current = null;
        }
        
        // Restore scroll container
        if (scrollContainerRef.current && containerRef.current) {
          scrollContainerRef.current.style.overflow = originalOverflowRef.current;
          containerRef.current.style.minHeight = '';
          containerRef.current.style.height = '';
          scrollContainerRef.current = null;
        }
        
        // Reset all animations
        if (containerRef.current) {
          const rows = containerRef.current.querySelectorAll('[data-filter-row]');
          rows.forEach((row) => {
            gsap.killTweensOf(row);
            gsap.set(row, { y: 0, clearProps: 'transform' });
          });
          
        // Restore group container heights and styles
        restoreGroupStyles();
      }
        
        offsetMapRef.current.clear();
        
        if (onGroupHover) onGroupHover(null);
        groupingHoverIdRef.current = null;
        groupContainerHoverRef.current = null;
        return;
      }
    }

    // Check if dropped in group container groove
    if (groupContainerHoverRef.current && onAddToGroup) {
      const draggedFilter = itemsRef.current.find(f => f.id === draggingId);
      const isDraggingGroup = draggedFilter && !draggedFilter.groupId && draggedFilter.groupedFilters && draggedFilter.groupedFilters.length > 0;
      
      if (isDraggingGroup) {
        if (onError) {
          onError("Filter groups cannot be nested");
        }
        // Let the normal reorder logic handle it
      } else {
        const { baseId, insertIndex } = groupContainerHoverRef.current;
        
        // Restore group container heights and styles before callback
        restoreGroupStyles();
        
        onAddToGroup(draggingId, baseId, insertIndex);
        
        // Clean up
        if (floating?.parentNode) floating.parentNode.removeChild(floating);
        floatingElementRef.current = null;
        if (placeholder) {
          placeholder.style.visibility = '';
          placeholder.style.pointerEvents = '';
          placeholderRef.current = null;
        }
        
        // Restore scroll container
        if (scrollContainerRef.current && containerRef.current) {
          scrollContainerRef.current.style.overflow = originalOverflowRef.current;
          containerRef.current.style.minHeight = '';
          containerRef.current.style.height = '';
          scrollContainerRef.current = null;
        }
        
        // Reset all animations
        if (containerRef.current) {
          const rows = containerRef.current.querySelectorAll('[data-filter-row]');
          rows.forEach((row) => {
            gsap.killTweensOf(row);
            gsap.set(row, { y: 0, clearProps: 'transform' });
          });
        }
        
        offsetMapRef.current.clear();
        
        if (onGroupHover) onGroupHover(null);
        groupingHoverIdRef.current = null;
        groupContainerHoverRef.current = null;
        return;
      }
    }

    // Check if dragging out of group (ungrouping)
    // This should happen early, before normal reorder logic
    const draggedFilter = itemsRef.current.find(f => f.id === draggingId);
    let shouldUngroup = false;
    let isReorderingWithinGroup = false;
    
    if (draggedFilter?.groupId && onUngroupFilter) {
      // Get the base filter to check group boundaries
      const baseFilter = itemsRef.current.find(f => f.id === draggedFilter.groupId);
      const groupMemberIds = baseFilter?.groupedFilters ? [draggedFilter.groupId, ...baseFilter.groupedFilters] : [draggedFilter.groupId];
      
      // Find the indices of all group members
      const groupIndices = groupMemberIds.map(id => itemsRef.current.findIndex(f => f.id === id)).filter(idx => idx >= 0).sort((a, b) => a - b);
      
      // Check if hover index is outside the group's index range
      let hoverIndexOutsideGroup = false;
      if (groupIndices.length > 0) {
        const minGroupIndex = Math.min(...groupIndices);
        const maxGroupIndex = Math.max(...groupIndices);
        hoverIndexOutsideGroup = currentHoverIndex < minGroupIndex || currentHoverIndex > maxGroupIndex + 1;
      } else {
        // If we can't find group indices, assume we're outside if position changed
        hoverIndexOutsideGroup = !wasOutsidePanel && originalIndex !== currentHoverIndex;
      }
      
      // Also check if cursor is outside the original group container visually
      const elementAtPoint = document.elementFromPoint(e.clientX, e.clientY);
      const groupContainerForDraggedFilter = containerRef.current?.querySelector(`[data-group-base="${draggedFilter.groupId}"]`);
      const isStillInOriginalGroup = groupContainerForDraggedFilter && groupContainerForDraggedFilter.contains(elementAtPoint);
      
      // Check if position index changed (moved to a different position)
      const positionChanged = !wasOutsidePanel && originalIndex !== currentHoverIndex;
      
      // Ungroup if:
      // 1. Hover index is outside the group's index range (dragged above or below group)
      // 2. Position changed AND cursor is no longer within the original group container
      // 3. Was dragged outside panel
      // IMPORTANT: If position hasn't changed (just a click), never ungroup
      shouldUngroup = (positionChanged && (hoverIndexOutsideGroup || !isStillInOriginalGroup)) || wasOutsidePanel;
      
      // Check if we're reordering WITHIN the group (position changed but still in group)
      isReorderingWithinGroup = positionChanged && !shouldUngroup && !!isStillInOriginalGroup;
      
      if (!shouldUngroup && !isReorderingWithinGroup) {
        // Position didn't change OR no valid reorder - snap back to original position
        if (floating && placeholder && containerRef.current) {
          // Reset all animations
          const rows = containerRef.current?.querySelectorAll('[data-filter-row]');
          if (rows) {
            gsap.killTweensOf(Array.from(rows));
            rows.forEach(row => {
              gsap.set(row, { y: 0, clearProps: 'transform' });
            });
          }
          
          // Find original position for snap-back
          const originalPosition = rowPositionsRef.current.get(draggingId);
          const containerRect = containerRef.current.getBoundingClientRect();
          let targetX = 0, targetY = 0;
          
          if (originalPosition) {
            const filterRow = containerRef.current.querySelector(`[data-filter-id="${draggingId}"]`);
            if (filterRow) {
              const rowRect = filterRow.getBoundingClientRect();
              targetX = rowRect.left - containerRect.left;
              targetY = rowRect.top - containerRect.top;
            }
          }
          
          // Animate floating element back
          gsap.to(floating, {
            x: targetX,
            y: targetY,
            scale: 1,
            opacity: 0,
            duration: 0.3,
            ease: 'power2.out',
            onComplete: () => {
              if (floating?.parentNode) floating.parentNode.removeChild(floating);
              floatingElementRef.current = null;
              if (placeholder) {
                placeholder.style.visibility = '';
                placeholder.style.pointerEvents = '';
                placeholderRef.current = null;
              }
            }
          });
        }
        
        // Clean up and reset
        offsetMapRef.current.clear();
        
        // Restore group container heights and styles
        restoreGroupStyles();
        
        if (scrollContainerRef.current && containerRef.current) {
          scrollContainerRef.current.style.overflow = originalOverflowRef.current;
          containerRef.current.style.minHeight = '';
          containerRef.current.style.height = '';
          scrollContainerRef.current = null;
        }
        
        setDragState({
          draggingId: null,
          originalIndex: -1,
          currentHoverIndex: -1,
          cursor: { x: 0, y: 0 },
        });
        
        if (onGroupHover) onGroupHover(null);
        groupingHoverIdRef.current = null;
        groupContainerHoverRef.current = null;
        return;
      }
    }

    // CRITICAL: Immediately release pointer capture to prevent stuck states
    try {
      const target = e.currentTarget as HTMLElement;
      if (target && target.releasePointerCapture) {
        target.releasePointerCapture(e.pointerId);
      }
    } catch (err) {
      // Ignore errors if pointer capture wasn't set
    }

    // Check if position actually changed (only if inside panel)
    const positionChanged = !wasOutsidePanel && originalIndex !== currentHoverIndex;
    
    // Check if we're reordering within a group (need to recalculate since variables might not be in scope)
    const draggedFilterForReorder = itemsRef.current.find(f => f.id === draggingId);
    const isReorderingWithinGroupFinal = draggedFilterForReorder?.groupId && !shouldUngroup && positionChanged;

    if (floating && placeholder && containerRef.current) {
      // CRITICAL: Kill ALL ongoing GSAP animations immediately to prevent race conditions
      gsap.killTweensOf(floating);
      const rows = containerRef.current?.querySelectorAll('[data-filter-row]');
      if (rows) {
        gsap.killTweensOf(Array.from(rows));
      }

      // Restore group container heights and styles IMMEDIATELY upon release
      // This prevents the split-second delay the user reported
      restoreGroupStyles();

      if (positionChanged || isReorderingWithinGroupFinal) {
        // Position changed OR reordering within group: hide floating element immediately
        floating.style.opacity = '0';
        floating.style.pointerEvents = 'none';
        
        // Clear ALL transforms immediately to prevent visual glitches during fast dragging
        if (rows) {
          rows.forEach(row => {
            gsap.set(row, {
              y: 0,
              clearProps: 'transform'
            });
          });
        }

        // Update React state FIRST - handle group reorder
        const draggedItem = itemsRef.current.find(f => f.id === draggingId);
        
        // If we detected ungrouping, apply it locally first before reordering
        let workingItems = [...itemsRef.current];
        if (draggedItem?.groupId && onUngroupFilter && shouldUngroup) {
          // Apply ungrouping locally: remove groupId and update base filter
          const baseId = draggedItem.groupId;
          const baseFilter = workingItems.find(f => f.id === baseId);
          if (baseFilter) {
            workingItems = workingItems.map(item => {
              if (item.id === draggingId) {
                // Remove groupId from dragged filter
                const updated = { ...item };
                delete (updated as any).groupId;
                return updated as T;
              }
              if (item.id === baseId) {
                // Remove dragged filter from base filter's groupedFilters
                return {
                  ...item,
                  groupedFilters: item.groupedFilters?.filter(id => id !== draggingId)
                };
              }
              return item;
            });
          }
          
          // Call the ungroup callback to notify parent
          onUngroupFilter(draggingId);
          
          // Update draggedItem ref since we ungrouped it
          const ungroupedItem = workingItems.find(f => f.id === draggingId);
          if (ungroupedItem) {
            draggedItem.groupId = undefined;
          }
        }
        
        // Check if dragging a GROUP (base filter with children) - NOT a child filter
        const isDraggingGroup = draggedItem && !draggedItem.groupId && draggedItem.groupedFilters && draggedItem.groupedFilters.length > 0;
        
        if (isDraggingGroup && draggedItem) {
          // Moving entire group - move all group members together
          const groupMembers = [draggingId, ...(draggedItem.groupedFilters || [])];
          const groupIndices = groupMembers.map(id => workingItems.findIndex(f => f.id === id)).sort((a, b) => a - b);
          
          // Remove all group members (from end to start to preserve indices)
          const movingItems = groupIndices.map(i => workingItems[i]).reverse();
          movingItems.forEach(item => {
            const idx = workingItems.findIndex(f => f.id === item.id);
            if (idx >= 0) workingItems.splice(idx, 1);
          });
          
          // Calculate insert position
          let insertAt = currentHoverIndex;
          // Adjust for removed items before the insert point
          const itemsBeforeInsert = groupIndices.filter(idx => idx < currentHoverIndex).length;
          insertAt -= itemsBeforeInsert;
          insertAt = Math.max(0, insertAt);
          
          // Insert all group members
          workingItems.splice(insertAt, 0, ...movingItems);
        } else {
          // Single filter reorder (including child filters that were just ungrouped or reordered within group)
          const stillInGroup = draggedItem?.groupId && !shouldUngroup;
          
          // Need to find the correct index in the workingItems array
          const workingIndex = workingItems.findIndex(f => f.id === draggingId);
          if (workingIndex >= 0) {
            let insertAt = currentHoverIndex;
            
            // If reordering within a group, calculate insert position directly from cursor position
            // IGNORE currentHoverIndex completely - calculate based on group members only
            if (stillInGroup && draggedItem.groupId) {
              const baseId = draggedItem.groupId;
              const baseFilter = itemsRef.current.find(f => f.id === baseId);
              
              if (baseFilter && containerRef.current) {
                // Get cursor position relative to container
                const containerRect = containerRef.current.getBoundingClientRect();
                const cursorY = e.clientY - containerRect.top;
                
                // Find all group member positions BEFORE removing the dragged item
                const groupMemberIds = baseFilter.groupedFilters ? [baseId, ...baseFilter.groupedFilters] : [baseId];
                const groupMembers = groupMemberIds
                  .map(id => {
                    const idx = itemsRef.current.findIndex(f => f.id === id);
                    const pos = idx >= 0 ? rowPositionsRef.current.get(id) : null;
                    return { id, idx, pos };
                  })
                  .filter(item => item.idx >= 0 && item.pos !== null)
                  .sort((a, b) => a.idx - b.idx);
                
                if (groupMembers.length > 0) {
                  const minGroupIndex = groupMembers[0].idx;
                  const maxGroupIndex = groupMembers[groupMembers.length - 1].idx;
                  const isChildFilter = draggedItem.id !== baseId;
                  
                  if (isChildFilter) {
                    // For child filters, find which group member the cursor is closest to
                    // Only consider child filters (not the base) for positioning
                    const childMembers = groupMembers.filter(item => item.id !== baseId);
                    
                    if (childMembers.length > 0) {
                      // Find closest child member
                      let closestMember = childMembers[0];
                      let minDistance = Infinity;
                      
                      childMembers.forEach(item => {
                        if (item.pos) {
                          const centerY = item.pos.top + item.pos.height / 2;
                          const distance = Math.abs(cursorY - centerY);
                          if (distance < minDistance) {
                            minDistance = distance;
                            closestMember = item;
                          }
                        }
                      });
                      
                      // Determine if inserting before or after the closest member
                      if (closestMember.pos) {
                        const centerY = closestMember.pos.top + closestMember.pos.height / 2;
                        if (cursorY < centerY) {
                          // Insert before this member
                          insertAt = closestMember.idx;
                        } else {
                          // Insert after this member (but before base)
                          insertAt = closestMember.idx + 1;
                        }
                      }
                      
                      // Clamp to group bounds (children go above base)
                      insertAt = Math.max(minGroupIndex, Math.min(insertAt, maxGroupIndex));
                    } else {
                      // No other children, stay at original position
                      insertAt = originalIndex;
                    }
                  } else {
                    // Base filter always stays at bottom
                    insertAt = maxGroupIndex;
                  }
                }
              }
            }
            
            // Now remove the item
            const [removed] = workingItems.splice(workingIndex, 1);
            
            // Adjust insert position for the removal
            if (workingIndex < insertAt) insertAt--;
            
            // Final safety check: ensure insertAt is within the actual group bounds after removal
            // This is CRITICAL - we must ensure the filter stays within the group
            if (stillInGroup && draggedItem?.groupId) {
              const baseId = draggedItem.groupId;
              const baseFilter = workingItems.find(f => f.id === baseId);
              if (baseFilter) {
                // Find all group member indices after removal (excluding the dragged item we're about to insert)
                const groupMemberIds = baseFilter.groupedFilters ? [baseId, ...baseFilter.groupedFilters] : [baseId];
                const groupIndices = groupMemberIds
                  .map(id => workingItems.findIndex(f => f.id === id))
                  .filter(idx => idx >= 0)
                  .sort((a, b) => a - b);
                
                if (groupIndices.length > 0) {
                  const finalMin = Math.min(...groupIndices);
                  const finalMax = Math.max(...groupIndices);
                  const isChildFilter = draggedItem.id !== baseId;
                  
                  // CRITICAL: Force insertAt to be within final group bounds
                  // For child filters, they can go anywhere from finalMin to finalMax (inclusive)
                  // because finalMax is the base, and children can go above it
                  // But actually, if we insert at finalMax, that's "after the last child, before base"
                  // which means the base would shift down. So children should go up to finalMax-1
                  // However, if there are no other children, finalMin == finalMax (only base), so we'd clamp to finalMax-1 which is wrong
                  // So we need: if there are other children, max is finalMax-1, else max is finalMax
                  const hasOtherChildren = groupIndices.length > 1; // More than just the base
                  
                  if (isChildFilter) {
                    // Children can go between finalMin and finalMax (inclusive)
                    // Inserting at finalMax will place the child immediately above the base filter
                    insertAt = Math.max(finalMin, Math.min(insertAt, finalMax));
                  } else {
                    // Base filter always stays at bottom
                    insertAt = finalMax;
                  }
                  
                  // ABSOLUTE SAFETY: If insertAt is still somehow outside, force it to a valid position
                  if (insertAt < finalMin) insertAt = finalMin;
                  if (isChildFilter && insertAt > finalMax) insertAt = finalMax;
                  if (!isChildFilter && insertAt !== finalMax) insertAt = finalMax;
                }
              }
            }
            
            workingItems.splice(insertAt, 0, removed);
            
            // If reordering within a group, update the base filter's groupedFilters order
            if (stillInGroup && draggedItem?.groupId) {
              const baseId = draggedItem.groupId;
              const baseFilter = workingItems.find(f => f.id === baseId);
              if (baseFilter && baseFilter.groupedFilters) {
                // Find all group members in their new order (children only, base stays at bottom)
                const groupMemberIds = [baseId, ...baseFilter.groupedFilters];
                const childrenOrder = workingItems
                  .filter(f => groupMemberIds.includes(f.id) && f.id !== baseId)
                  .map(f => f.id);
                
                // Update base filter's groupedFilters to reflect new order
                workingItems = workingItems.map(item => {
                  if (item.id === baseId) {
                    return {
                      ...item,
                      groupedFilters: childrenOrder
                    };
                  }
                  return item;
                });
              }
            }
          }
        }
        
        onReorder(workingItems);

        // IMMEDIATE cleanup for fast drags - don't wait for animation
        if (placeholder && placeholder.parentNode) {
          placeholder.style.visibility = '';
          placeholder.style.pointerEvents = '';
          placeholder.style.height = '';
          placeholder.style.overflow = '';
          placeholder.style.marginTop = '';
          placeholder.style.marginBottom = '';
        }
        placeholderRef.current = null;
        if (floating && floating.parentNode) {
          floating.parentNode.removeChild(floating);
        floatingElementRef.current = null;
        }
      } else {
        // Position unchanged OR was outside panel: animate snap back to original location
        // Clear placeholder transform immediately for snap-back
        gsap.set(placeholder, {
          y: 0,
          clearProps: 'transform'
        });

        // Clear transforms for other rows immediately
        if (rows) {
          rows.forEach(row => {
            if (row.getAttribute('data-filter-id') !== draggingId) {
              gsap.set(row, {
                y: 0,
                clearProps: 'transform'
              });
            }
          });
        }

        // KEEP PLACEHOLDER HIDDEN until animation completes
        // Find the original position
        let targetX, targetY;
        const containerRect = containerRef.current.getBoundingClientRect();
        const originalPosition = rowPositionsRef.current.get(draggingId);
        if (originalPosition) {
          targetX = containerRect.left;
          targetY = containerRect.top + originalPosition.top;
        } else {
          const rect = placeholder.getBoundingClientRect();
          targetX = rect.left;
          targetY = rect.top;
        }

        // Animate using transform (not left/top) since that's what we're using for positioning
        gsap.to(floating, {
          x: targetX,
          y: targetY,
          scale: 1,
          opacity: 1,
          duration: 0.6,
          ease: 'power2.out',
          onComplete: () => {
            // Animation complete - NOW restore placeholder visibility
            if (placeholder && placeholder.parentNode) {
        placeholder.style.visibility = '';
        placeholder.style.pointerEvents = '';
              placeholder.style.height = '';
              placeholder.style.overflow = '';
              placeholder.style.marginTop = '';
              placeholder.style.marginBottom = '';
            }

            // Clean up floating element
            if (floating && floating.parentNode) {
              floating.parentNode.removeChild(floating);
            }
            floatingElementRef.current = null;
        placeholderRef.current = null;
          }
        });

        // Safety cleanup: remove after animation duration + buffer
        setTimeout(() => {
          if (floatingElementRef.current && floatingElementRef.current.parentNode) {
            floatingElementRef.current.parentNode.removeChild(floatingElementRef.current);
            floatingElementRef.current = null;
          }
          // Also restore placeholder as safety measure
          if (placeholderRef.current && placeholderRef.current.parentNode) {
            placeholderRef.current.style.visibility = '';
            placeholderRef.current.style.pointerEvents = '';
            placeholderRef.current = null;
          }
        }, 750);
      }

      // Restore scroll container
        if (scrollContainerRef.current && containerRef.current) {
          scrollContainerRef.current.style.overflow = originalOverflowRef.current;
        scrollContainerRef.current.scrollTop = originalScrollTopRef.current;
          containerRef.current.style.minHeight = '';
          containerRef.current.style.height = '';
        scrollContainerRef.current = null;
      }
    } else {
      // Fallback cleanup - ensure floating element is removed
      if (floating?.parentNode) {
        floating.parentNode.removeChild(floating);
      }
      floatingElementRef.current = null;
      if (placeholder && placeholder.parentNode) {
        gsap.set(placeholder, {
          y: 0,
          clearProps: 'transform'
        });
        placeholder.style.visibility = '';
        placeholder.style.pointerEvents = '';
        placeholder.style.height = '';
        placeholder.style.overflow = '';
        placeholder.style.marginTop = '';
        placeholder.style.marginBottom = '';
      }
      placeholderRef.current = null;

      // Restore scroll container
      if (scrollContainerRef.current && containerRef.current) {
        scrollContainerRef.current.style.overflow = originalOverflowRef.current;
        scrollContainerRef.current.scrollTop = originalScrollTopRef.current;
        containerRef.current.style.minHeight = '';
        containerRef.current.style.height = '';
        scrollContainerRef.current = null;
      }

      // Clear all transforms immediately
      const rows = containerRef.current?.querySelectorAll('[data-filter-row]');
      if (rows) {
        gsap.killTweensOf(Array.from(rows));
        rows.forEach(row => {
          gsap.set(row, {
            y: 0,
            clearProps: 'transform'
          });
        });
      }

      // Update React state if position changed
      if (positionChanged) {
        const newItems = [...itemsRef.current];
        const draggedItem = itemsRef.current[originalIndex];
        const isDraggingGroup = draggedItem && !draggedItem.groupId && draggedItem.groupedFilters && draggedItem.groupedFilters.length > 0;

        if (isDraggingGroup && draggedItem) {
          // Find all members of the group
          const childIds = draggedItem.groupedFilters || [];
          const children = childIds.map(id => itemsRef.current.find(item => item.id === id)).filter(Boolean) as T[];
          const members = [...children, draggedItem];
          const memberIds = members.map(m => m.id);
          
          // Remove all members from their original positions
          // Sort indices descending to avoid splice shifting issues
          const memberIndices = memberIds.map(id => newItems.findIndex(f => f.id === id)).filter(idx => idx >= 0).sort((a, b) => b - a);
          memberIndices.forEach(idx => newItems.splice(idx, 1));
          
          // Calculate insertion index
          // Adjust currentHoverIndex for items removed before it
          let insertAt = currentHoverIndex;
          const removedBefore = memberIndices.filter(idx => idx < currentHoverIndex).length;
          insertAt -= removedBefore;
          
          // Ensure index is within bounds
          insertAt = Math.max(0, Math.min(newItems.length, insertAt));
          
          // Re-insert members at the new position
          newItems.splice(insertAt, 0, ...members);
          onReorder(newItems);
        } else {
          const [removed] = newItems.splice(originalIndex, 1);
          let insertAt = currentHoverIndex;
          if (insertAt > originalIndex) insertAt--;
          newItems.splice(insertAt, 0, removed);
          onReorder(newItems);
        }
      }
    }

    // Clear offset map
    offsetMapRef.current.clear();

    // Restore group container heights and styles
    restoreGroupStyles();

    // Reset state
    if (onGroupHover) onGroupHover(null);
    groupingHoverIdRef.current = null;
    groupContainerHoverRef.current = null;
  }, [dragState, containerRef, onReorder, onCancelPreview, onGroupFilter, onAddToGroup, onUngroupFilter, onGroupHover, restoreGroupStyles, handleDragMove]);

  // Start drag
  const handleDragStart = useCallback((e: React.PointerEvent, filterId: string, index: number) => {
    if (isDisabled) return;
    e.preventDefault();
    e.stopPropagation();

    // CRITICAL: Clean up any existing floating elements first (safety measure)
    if (floatingElementRef.current && floatingElementRef.current.parentNode) {
      floatingElementRef.current.parentNode.removeChild(floatingElementRef.current);
      floatingElementRef.current = null;
    }
    if (placeholderRef.current) {
      placeholderRef.current.style.visibility = '';
      placeholderRef.current.style.pointerEvents = '';
      placeholderRef.current = null;
    }
    const target = e.currentTarget as HTMLElement;
    const filterRow = target.closest('[data-filter-row]') as HTMLElement;
    if (!filterRow || !containerRef.current) return;

    // Clone the filter row
    const elementToClone: HTMLElement = filterRow;

    // FIRST: Lock container height BEFORE any other operations
    if (containerRef.current) {
    containerHeightRef.current = containerRef.current.offsetHeight;
    containerRef.current.style.minHeight = `${containerHeightRef.current}px`;
    containerRef.current.style.height = `${containerHeightRef.current}px`;
    }

    // SECOND: Lock scroll container
    const scrollContainer = containerRef.current.parentElement;
    if (scrollContainer) {
      scrollContainerRef.current = scrollContainer;
      originalOverflowRef.current = scrollContainer.style.overflow;
      originalScrollTopRef.current = scrollContainer.scrollTop;
      scrollContainer.style.overflow = 'hidden';
    }

    // NOW calculate positions (after everything is locked)
    calculateRowPositions();

    // CRITICAL FIX: Clear all previous offsets and transforms before starting new drag
    offsetMapRef.current.clear();
    const allRows = containerRef.current.querySelectorAll('[data-filter-row]');
    allRows.forEach(row => {
      gsap.killTweensOf(row);
      gsap.set(row, {
        y: 0,
        clearProps: 'transform'
      });
    });

    // CRITICAL FIX: Capture the original position and calculate offset BEFORE any layout changes
    // This ensures the ghost image stays perfectly under the cursor even if the 
    // underlying cards jump or collapse.
    const originalRect = filterRow.getBoundingClientRect();
    dragOffsetRef.current = {
      x: e.clientX - originalRect.left,
      y: e.clientY - originalRect.top
    };

    // Check if dragging a base filter with a group
    const draggedItem = itemsRef.current.find(i => i.id === filterId);
    const isDraggingGroup = draggedItem && draggedItem.groupedFilters && draggedItem.groupedFilters.length > 0;
    
    // Collapse group container when dragging base filter - DO THIS BEFORE CLONING
    // so we can capture the collapsed state for the placeholder
    const groupContainer = filterRow.closest('[data-group-container]') as HTMLElement;
    if (isDraggingGroup && groupContainer) {
      const groupContent = groupContainer.querySelector('[data-group-content]') as HTMLElement;
      const groupTop = groupContainer.querySelector('[data-group-top]') as HTMLElement;
      const groupBottom = groupContainer.querySelector('[data-group-bottom]') as HTMLElement;

      if (groupContent) {
        // Store original state for restoration
        (groupContainer as any).__originalBorder = groupContainer.style.borderWidth;
        (groupContainer as any).__originalHeight = groupContent.style.height || 'auto';
        (groupContainer as any).__originalOverflow = groupContent.style.overflow;
        
        // Collapse height to base filter card only - do it immediately for correct placeholder calculation
        groupContent.style.height = `${filterRow.offsetHeight + 8}px`;
        groupContent.style.overflow = 'hidden';
        
        // Also use GSAP for a smooth visual transition if needed, but height is already set
        gsap.from(groupContent, {
          height: (groupContainer as any).__originalHeight,
          duration: 0.3,
          ease: 'power2.out'
        });

        // Hide group elements in placeholder
        if (groupTop) {
          (groupTop as any).__originalDisplay = groupTop.style.display || 'block';
          groupTop.style.display = 'none';
        }
        if (groupBottom) {
          (groupBottom as any).__originalDisplay = groupBottom.style.display || 'block';
          groupBottom.style.display = 'none';
        }
        groupContainer.style.borderWidth = '0px';

        // Hide all child filters in the group visually and remove from flow
        // so the base filter card shifts to the top of the group container
        const allRows = groupContent.querySelectorAll('[data-filter-row]');
        allRows.forEach(row => {
          const rowEl = row as HTMLElement;
          if (rowEl !== filterRow) {
            (rowEl as any).__originalVisibility = rowEl.style.visibility || 'visible';
            (rowEl as any).__originalPosition = rowEl.style.position || 'relative';
            rowEl.style.visibility = 'hidden';
            rowEl.style.position = 'absolute';
          }
        });

        // Re-calculate positions immediately with the new height
        calculateRowPositions();
      }
    }

    // Create floating clone (always just the base filter card)
    const clone = elementToClone.cloneNode(true) as HTMLElement;

    // PERFORMANCE: Use transform instead of left/top for GPU acceleration
    clone.style.position = 'fixed';
    clone.style.left = '0';
    clone.style.top = '0';
    clone.style.transform = `translate(${originalRect.left}px, ${originalRect.top}px) scale(1.03)`;
    clone.style.width = `${originalRect.width}px`;
    clone.style.zIndex = '10000';
    clone.style.pointerEvents = 'none';
    clone.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.4), 0 10px 20px rgba(0, 0, 0, 0.3)';
    clone.style.borderRadius = '8px';
    clone.style.opacity = '1';

    // GPU acceleration hints for smooth dragging
    clone.style.willChange = 'transform';
    clone.removeAttribute('data-filter-row');
    clone.removeAttribute('data-filter-id');
    clone.removeAttribute('data-group-block');

    // Add data attribute to identify floating clones for cleanup
    clone.setAttribute('data-floating-clone', 'true');

    // If dragging a group, add badge showing count
    if (isDraggingGroup && draggedItem && draggedItem.groupedFilters) {
      const groupCount = draggedItem.groupedFilters.length + 1; // +1 for base filter
      
      // Create badge element
      const badge = document.createElement('div');
      badge.style.position = 'absolute';
      badge.style.top = '-8px';
      badge.style.right = '-8px';
      badge.style.width = '32px';
      badge.style.height = '32px';
      badge.style.borderRadius = '50%';
      badge.style.background = 'linear-gradient(135deg, rgb(168, 85, 247), rgb(147, 51, 234))';
      badge.style.border = '3px solid rgb(15, 23, 42)';
      badge.style.display = 'flex';
      badge.style.alignItems = 'center';
      badge.style.justifyContent = 'center';
      badge.style.fontSize = '14px';
      badge.style.fontWeight = '700';
      badge.style.color = 'white';
      badge.style.boxShadow = '0 4px 12px rgba(168, 85, 247, 0.4)';
      badge.textContent = groupCount.toString();
      
      // Wrap clone content in a relative container for badge positioning
      const wrapper = document.createElement('div');
      wrapper.style.position = 'relative';
      wrapper.style.width = '100%';
      wrapper.style.height = '100%';
      
      // Move all clone children into wrapper
      while (clone.firstChild) {
        wrapper.appendChild(clone.firstChild);
      }
      
      // Add wrapper and badge to clone
      clone.appendChild(wrapper);
      wrapper.appendChild(badge);
    }

    document.body.appendChild(clone);
    floatingElementRef.current = clone;

    // Create placeholder (ghost)
    elementToClone.style.visibility = 'hidden';
    elementToClone.style.pointerEvents = 'none';
    placeholderRef.current = elementToClone;

    // Set drag state
    setDragState({
      draggingId: filterId,
      originalIndex: index,
      currentHoverIndex: index,
      cursor: {
        x: e.clientX,
        y: e.clientY
      }
    });

    // Capture pointer
    target.setPointerCapture(e.pointerId);

    // SAFETY: Add global listeners to handle cases where pointer capture is lost
    // or the cursor moves too fast for the element-based events
    window.addEventListener('pointermove', handleDragMove as any);
    window.addEventListener('pointerup', handleDragEnd as any);
  }, [isDisabled, containerRef, calculateRowPositions, handleDragMove, handleDragEnd]);


  // Cancel drag on escape
  useEffect(() => {
    if (!dragState.draggingId) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Cancel preview
        if (onCancelPreview) {
          onCancelPreview();
        }

        // Clean up without reordering
        const floating = floatingElementRef.current;
        const placeholder = placeholderRef.current;
        if (floating?.parentNode) {
          gsap.to(floating, {
            opacity: 0,
            scale: 0.95,
            duration: 0.15,
            onComplete: () => {
              if (floating.parentNode) {
                floating.parentNode.removeChild(floating);
              }
            }
          });
        }
        if (placeholder) {
      placeholder.style.visibility = '';
      placeholder.style.pointerEvents = '';
          placeholder.style.height = '';
          placeholder.style.overflow = '';
          placeholder.style.marginTop = '';
          placeholder.style.marginBottom = '';
    }

    // Restore scroll container
    if (scrollContainerRef.current && containerRef.current) {
      scrollContainerRef.current.style.overflow = originalOverflowRef.current;
          scrollContainerRef.current.scrollTop = originalScrollTopRef.current;
      containerRef.current.style.minHeight = '';
      containerRef.current.style.height = '';
          scrollContainerRef.current = null;
        }

        // Reset all row transforms
        const rows = containerRef.current?.querySelectorAll('[data-filter-row]');
        if (rows) {
          gsap.to(rows, {
            y: 0,
            duration: 0.15,
            ease: 'power2.out'
          });
        }
        offsetMapRef.current.clear();
        floatingElementRef.current = null;
        placeholderRef.current = null;

        // Restore group container heights and styles
        restoreGroupStyles();

        setDragState({
          draggingId: null,
          originalIndex: -1,
          currentHoverIndex: -1,
          cursor: {
            x: 0,
            y: 0
          }
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dragState.draggingId, containerRef, onCancelPreview]);

  // Enforce scroll lock during drag
  useEffect(() => {
    if (!dragState.draggingId || !scrollContainerRef.current) return;
    const enforceScrollLock = () => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = originalScrollTopRef.current;
      }
    };

    // Check scroll position frequently during drag
    const interval = setInterval(enforceScrollLock, 16); // ~60fps

    return () => clearInterval(interval);
  }, [dragState.draggingId]);

  // Global safety cleanup: Remove any orphaned floating clones
  useEffect(() => {
    const cleanupOrphanedClones = () => {
      // Only run cleanup if we're NOT currently dragging
      if (dragState.draggingId) return;

      // Find all floating clones in the DOM
      const orphanedClones = document.querySelectorAll('[data-floating-clone="true"]');
      if (orphanedClones.length > 0) {
        console.warn(`Found ${orphanedClones.length} orphaned floating clone(s), cleaning up...`);
        orphanedClones.forEach(clone => {
          if (clone.parentNode) {
            clone.parentNode.removeChild(clone);
          }
        });
      }

      // Also restore any hidden placeholders
      if (containerRef.current) {
        const hiddenRows = containerRef.current.querySelectorAll('[data-filter-row][style*="visibility: hidden"]');
        hiddenRows.forEach(row => {
          const element = row as HTMLElement;
          element.style.visibility = '';
          element.style.pointerEvents = '';
        });
      }
    };

    // Run cleanup every 2 seconds when not dragging
    const interval = setInterval(cleanupOrphanedClones, 2000);
    return () => clearInterval(interval);
  }, [dragState.draggingId, containerRef]);
  return {
    dragState,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    isDragging: dragState.draggingId !== null,
    recalculatePositions: calculateRowPositions
  };
}