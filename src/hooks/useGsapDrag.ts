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
  onMaskFilter?: (draggedId: string, maskingId: string) => void;
  onMaskHover?: (maskingId: string | null) => void;
  onError?: (message: string) => void;
}

export function useGsapDrag<T extends {
  id: string;
  groupId?: string;
  groupedFilters?: string[];
  maskId?: string;
  maskedFilterId?: string;
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
  onMaskFilter,
  onMaskHover,
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
  const maskingHoverIdRef = useRef<string | null>(null);
  const groupContainerHoverRef = useRef<{
    baseId: string;
    insertIndex: number;
  } | null>(null);
  const lastYRef = useRef<number>(0);
  const isMovingUpRef = useRef<boolean>(false);
  const draggingIdRef = useRef<string | null>(null);
  const dragStateRef = useRef<DragState>(dragState);

  // Sync ref with state
  useEffect(() => {
    dragStateRef.current = dragState;
  }, [dragState]);

  const COLLAPSED_CARD_HEIGHT = 52; // Standard card height + margin

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

  // Restore group and mask container heights and styles instantaneously
  const restoreFurnitureStyles = useCallback(() => {
    if (!containerRef.current) return;
    
    // Restore group containers
    const groupContainers = containerRef.current.querySelectorAll('[data-group-container]');
    groupContainers.forEach((container) => {
      const containerEl = container as HTMLElement;
      const groupContent = containerEl.querySelector('[data-group-content]') as HTMLElement;
      const groupBorder = containerEl.querySelector('[data-group-border]') as HTMLElement;
      const groupHandle = containerEl.querySelector('[data-group-handle]') as HTMLElement;

      // CRITICAL: Kill any ongoing animations on group furniture
      if (groupContent) gsap.killTweensOf(groupContent);
      if (groupBorder) gsap.killTweensOf(groupBorder);
      if (groupHandle) gsap.killTweensOf(groupHandle);

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
        if (groupBorder) {
          groupBorder.style.borderWidth = (containerEl as any).__originalBorder;
        }
        delete (containerEl as any).__originalBorder;
      }
      
      if (groupBorder) {
        gsap.set(groupBorder, { y: 0, height: '100%', width: '100%', clearProps: 'all' });
      }
      if (groupHandle) {
        gsap.set(groupHandle, { y: 0, clearProps: 'all' });
      }
    });

    // Restore mask containers
    const maskContainers = containerRef.current.querySelectorAll('[data-mask-container]');
    maskContainers.forEach((container) => {
      const containerEl = container as HTMLElement;
      const maskContent = containerEl.querySelector('.space-y-2') as HTMLElement;
      const maskBorder = containerEl.querySelector('[data-mask-border]') as HTMLElement;
      const maskHandle = containerEl.querySelector('[data-mask-handle]') as HTMLElement;

      if (maskContent) {
        gsap.killTweensOf(maskContent);
        
        if ((containerEl as any).__originalOverflow !== undefined) {
          maskContent.style.overflow = (containerEl as any).__originalOverflow;
          delete (containerEl as any).__originalOverflow;
        }

        const rows = maskContent.querySelectorAll('[data-filter-row]');
        rows.forEach(row => {
          const rowEl = row as HTMLElement;
          rowEl.style.position = '';
          rowEl.style.visibility = '';
          delete (rowEl as any).__originalPosition;
          delete (rowEl as any).__originalVisibility;
        });

        if ((containerEl as any).__originalHeight !== undefined) {
          gsap.set(maskContent, { height: 'auto', clearProps: 'all' });
          delete (containerEl as any).__originalHeight;
        }
      }

      if (maskBorder) {
        gsap.killTweensOf(maskBorder);
        gsap.set(maskBorder, { y: 0, height: '100%', clearProps: 'all' });
      }
      if (maskHandle) {
        gsap.killTweensOf(maskHandle);
        gsap.set(maskHandle, { y: 0, clearProps: 'all' });
      }
    });
  }, [containerRef]);

  // Get drop index based on cursor position
  const getDropIndex = useCallback((cursorX: number, cursorY: number, currentDraggingId: string): number => {
    if (!containerRef.current) return -1;
    const containerRect = containerRef.current.getBoundingClientRect();
    const relativeY = cursorY - containerRect.top;

    const currentItems = itemsRef.current;
    const draggedItem = currentItems.find(item => item.id === currentDraggingId);
    const isDraggingGroup = draggedItem && !draggedItem.groupId && draggedItem.groupedFilters && draggedItem.groupedFilters.length > 0;
    const isDraggingMask = !!(draggedItem && (draggedItem.maskId || draggedItem.maskedFilterId));
    const isDraggingComplex = isDraggingGroup || isDraggingMask;

    let groupMembers: string[] = [currentDraggingId];
    if (isDraggingGroup) {
      groupMembers = [currentDraggingId, ...(draggedItem!.groupedFilters || [])];
    }
    if (isDraggingMask) {
      const maskingId = draggedItem!.maskId || (draggedItem!.maskedFilterId ? draggedItem!.id : null);
      const maskedId = draggedItem!.maskedFilterId || (draggedItem!.maskId ? draggedItem!.id : null);
      
      if (maskingId && maskedId) {
        const maskedFilter = currentItems.find(f => f.id === maskedId);
        groupMembers = [maskingId, maskedId];
        if (maskedFilter?.groupedFilters) {
          groupMembers.push(...maskedFilter.groupedFilters);
        }
        groupMembers = Array.from(new Set(groupMembers));
      }
    }

    // CRITICAL FIX: Add a dedicated "top zone" for inserting at position 0
    // If cursor is within the first 40px of the container, always return 0
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

    // SENSITIVITY FIX: Check if we are hovering over a group handle visually
    // and if we are moving up, favor the "Outside Above" position.
    const pointsToCheck = [
      { x: cursorX, y: cursorY },
      { x: cursorX - 20, y: cursorY },
      { x: cursorX + 20, y: cursorY }
    ];
    
    let targetGroupBaseId: string | null = null;

    for (const pt of pointsToCheck) {
      const el = document.elementFromPoint(pt.x, pt.y);
      const groupHandle = el?.closest('[data-group-handle]');
      const maskHandle = el?.closest('[data-mask-handle]');
      
      if (groupHandle) {
        const container = groupHandle.closest('[data-group-container]');
        targetGroupBaseId = container?.getAttribute('data-group-base') || null;
        if (targetGroupBaseId) break;
      } else if (maskHandle) {
        const container = maskHandle.closest('[data-mask-container]');
        // For masks, the "base" is the masking filter
        targetGroupBaseId = container?.getAttribute('data-mask-masking') || null;
        if (targetGroupBaseId) break;
      }
    }

    if (targetGroupBaseId && isMovingUpRef.current) {
      // Find the topmost member of this complex unit in the visual list
      const firstMember = currentItems.find(f => 
        f.id === targetGroupBaseId || 
        f.groupId === targetGroupBaseId || 
        f.maskId === targetGroupBaseId
      );
      if (firstMember) {
        return currentItems.findIndex(f => f.id === firstMember.id);
      }
    }

    // CRITICAL FIX: Add a dedicated "bottom zone" for inserting at the end
    // Find the last valid target and check if cursor is below its visual bottom
    const lastTarget = validTargets[validTargets.length - 1];
    const lastOffset = offsetMapRef.current.get(lastTarget.item.id) || 0;
    const lastTargetBottom = lastTarget.position.top + lastOffset + lastTarget.position.height;
    const BOTTOM_ZONE_HEIGHT = 40;

    // If cursor is below the last filter (with buffer), insert at the end
    if (relativeY > lastTargetBottom + BOTTOM_ZONE_HEIGHT) {
      return currentItems.length;
    }

    // Find which target the cursor is closest to
    let closestIndex = validTargets[0].index;
    let minDistance = Infinity;
    validTargets.forEach(({
      item,
      index,
      position
    }) => {
      // CRITICAL FIX: Account for visual offsets when calculating distance.
      // Without this, the drag-and-drop logic uses original positions, 
      // causing an off-by-one error when dragging downwards as items shift up.
      const offset = offsetMapRef.current.get(item.id) || 0;
      const visualCenterY = position.top + offset + position.height / 2;
      const distance = Math.abs(relativeY - visualCenterY);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    // Determine insertion position based on cursor position relative to closest item
    const closestTarget = validTargets.find(t => t.index === closestIndex);
    if (closestTarget) {
      const { position } = closestTarget;
      const offset = offsetMapRef.current.get(closestTarget.item.id) || 0;
      const visualTop = position.top + offset;
      const height = position.height;
      
      const originalIndex = currentItems.findIndex(f => f.id === currentDraggingId);
      const draggedFilter = currentItems.find(f => f.id === currentDraggingId);
      
      // SENSITIVITY FIX: Balanced responsiveness for both directions using visual positions
      let threshold = visualTop + height * 0.5; 
      
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

      // RULE: Prevent dragging a group into another group
      if (isDraggingGroup && targetIndex > 0 && targetIndex < currentItems.length) {
        const prevItem = currentItems[targetIndex - 1];
        const nextItem = currentItems[targetIndex];
        
        // Check if they belong to the same group
        const belongToSameGroup = (prevItem.groupId && prevItem.groupId === nextItem.groupId) || 
                                 (prevItem.groupId && prevItem.groupId === nextItem.id) ||
                                 (nextItem.groupId && nextItem.groupId === prevItem.id);
        
        if (belongToSameGroup) {
          // Snap targetIndex to either the start or end of this group
          const groupId = prevItem.groupId || nextItem.groupId || prevItem.id;
          const groupIndices = currentItems
            .map((f, i) => (f.id === groupId || f.groupId === groupId) ? i : -1)
            .filter(i => i !== -1)
            .sort((a, b) => a - b);
          
          if (groupIndices.length > 0) {
            const start = groupIndices[0];
            const end = groupIndices[groupIndices.length - 1];
            // Snap to whichever group boundary is closer
            targetIndex = (targetIndex <= (start + end + 1) / 2) ? start : end + 1;
          }
        }
      }

      // RULE: Prevent insertion between masked filters
      if (targetIndex > 0 && targetIndex < currentItems.length) {
        const prevItem = currentItems[targetIndex - 1];
        const nextItem = currentItems[targetIndex];
        
        // Check if they are part of the same masking relationship
        const sameMask = (prevItem.maskId && prevItem.maskId === nextItem.id) || 
                        (nextItem.maskId && nextItem.maskId === prevItem.id) ||
                        (prevItem.maskedFilterId && prevItem.maskedFilterId === nextItem.id) ||
                        (nextItem.maskedFilterId && nextItem.maskedFilterId === prevItem.id);
        
        if (sameMask) {
          // Snap targetIndex to either the start or end of this mask unit
          const maskUnitIds = [];
          const maskingId = prevItem.maskId || prevItem.id || nextItem.maskId || nextItem.id;
          const maskingFilter = currentItems.find(f => f.id === maskingId || f.maskedFilterId); // This logic is simplified
          
          // Better logic: find all members of this mask unit
          let unitMaskingId = prevItem.maskId || prevItem.id;
          if (!currentItems.find(f => f.id === unitMaskingId)?.maskedFilterId) {
            unitMaskingId = nextItem.id;
          }
          
          const unitMaskingFilter = currentItems.find(f => f.id === unitMaskingId);
          if (unitMaskingFilter?.maskedFilterId) {
            const unitMaskedId = unitMaskingFilter.maskedFilterId;
            const unitMaskedFilter = currentItems.find(f => f.id === unitMaskedId);
            const ids = [unitMaskingId, unitMaskedId];
            if (unitMaskedFilter?.groupedFilters) {
              ids.push(...unitMaskedFilter.groupedFilters);
            }
            
            const indices = ids.map(id => currentItems.findIndex(f => f.id === id)).filter(idx => idx >= 0).sort((a, b) => a - b);
            if (indices.length > 0) {
              const start = indices[0];
              const end = indices[indices.length - 1];
              targetIndex = (targetIndex <= (start + end + 1) / 2) ? start : end + 1;
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
    const isDraggingMask = !!(draggedItem && (draggedItem.maskId || draggedItem.maskedFilterId));
    const isDraggingComplex = isDraggingGroup || isDraggingMask;

    let groupMembers: string[] = [draggingId];
    if (isDraggingGroup) {
      groupMembers = [draggingId, ...(draggedItem!.groupedFilters || [])];
    }
    if (isDraggingMask) {
      const maskingId = draggedItem!.maskId || (draggedItem!.maskedFilterId ? draggedItem!.id : null);
      const maskedId = draggedItem!.maskedFilterId || (draggedItem!.maskId ? draggedItem!.id : null);
      
      if (maskingId && maskedId) {
        const maskedFilter = currentItems.find(f => f.id === maskedId);
        groupMembers = [maskingId, maskedId];
        if (maskedFilter?.groupedFilters) {
          groupMembers.push(...maskedFilter.groupedFilters);
        }
        groupMembers = Array.from(new Set(groupMembers));
      }
    }

    // ALWAYS treat the dragged item as a single card height for animations
    // This makes groups collapse visually during drag-and-drop reordering
    // We use a gap of 4px to match the Tailwind space-y-1 (4px)
    const placeholderSpace = COLLAPSED_CARD_HEIGHT + 4;

    // Find visual bounds of the group being dragged to ensure consistent reordering
    const memberIndices = groupMembers.map(id => currentItems.findIndex(f => f.id === id)).filter(idx => idx >= 0).sort((a, b) => a - b);
    if (memberIndices.length === 0) return;
    const groupStart = memberIndices[0];
    const groupEnd = memberIndices[memberIndices.length - 1];

    // Calculate and apply offsets for each item
    currentItems.forEach((item, index) => {
      // Skip the dragged item and all group members if dragging a group
      if (groupMembers.includes(item.id)) return;
      
      const position = rowPositionsRef.current.get(item.id);
      if (!position) return;

      // Calculate offset for this item
      let offset = 0;
      
      if (hoverIndex > groupEnd) {
        // Dragging DOWN
        // Items between the original group end and the hover position move UP 
        // to fill the space. We use index < hoverIndex to ensure the gap 
        // appears EXACTLY at the insertion point.
        if (index > groupEnd && index < hoverIndex) {
          offset = -placeholderSpace;
        }
      } else if (hoverIndex < groupStart) {
        // Dragging UP
        // Items between the hover position and the original group start move DOWN
        if (index >= hoverIndex && index < groupStart) {
          offset = placeholderSpace;
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
        const groupBorder = container.querySelector('[data-group-border]') as HTMLElement;
        const groupHandle = container.querySelector('[data-group-handle]') as HTMLElement;
        if (!groupContent || !groupBorder) return;

        // Find all members of this group in the current items list
        const memberIds = itemsRef.current
          .filter(f => f.id === baseId || f.groupId === baseId)
          .map(f => f.id);
        
        // Determine visual bounds of the group's items (including potential placeholder space)
        let visualTop = Infinity;
        let visualBottom = -Infinity;
        let hasVisibleMembers = false;

        const currentItems = itemsRef.current;
        const groupIndices = memberIds.map(mId => currentItems.findIndex(f => f.id === mId)).filter(idx => idx >= 0);
        const minGroupIdx = Math.min(...groupIndices);
        const maxGroupIdx = Math.max(...groupIndices);
        
        const groupHover = groupContainerHoverRef.current;
        const isCurrentlyBeingGroupInserted = groupHover?.baseId === baseId;
        
        // CRITICAL FIX: A filter is only "inside" visually if:
        // 1. It is explicitly being inserted into this group from outside (groupHover set)
        // 2. It was ALREADY a member of this group and is being reordered within it
        const isAlreadyInThisGroup = draggingId && memberIds.includes(draggingId);
        const isReorderingWithinThisGroup = isAlreadyInThisGroup && (hoverIndex >= minGroupIdx && hoverIndex <= maxGroupIdx);
        
        const isHoveringInsideGroup = isCurrentlyBeingGroupInserted || isReorderingWithinThisGroup;

        // Visual distinction: If we are about to insert INTO this group, make the border more prominent
        if (isCurrentlyBeingGroupInserted) {
          gsap.to(groupBorder, {
            borderColor: 'rgba(37, 99, 235, 0.8)', // Brighter blue
            borderWidth: '3px',
            boxShadow: '0 0 15px rgba(37, 99, 235, 0.2)',
            duration: 0.3,
            overwrite: 'auto'
          });
        } else {
          gsap.to(groupBorder, {
            borderColor: 'rgba(37, 99, 235, 0.4)', // Original blue
            borderWidth: '2px',
            boxShadow: '0 0 0px rgba(37, 99, 235, 0)',
            duration: 0.3,
            overwrite: 'auto'
          });
        }

        // MANUALLY account for the ghost space if we are inserting INTO this group
        if (isCurrentlyBeingGroupInserted && memberIds.length > 0) {
          const insertIdx = groupHover!.insertIndex;
          const memberIdsVisual = [...memberIds.filter(id => id !== baseId), baseId];
          
          if (insertIdx < memberIdsVisual.length) {
            // Ghost is at the position of an existing member (which shifted down)
            const displacedId = memberIdsVisual[insertIdx];
            const displacedPos = rowPositionsRef.current.get(displacedId);
            if (displacedPos) {
              visualTop = Math.min(visualTop, displacedPos.top);
              visualBottom = Math.max(visualBottom, displacedPos.top + COLLAPSED_CARD_HEIGHT);
            }
          } else {
            // Ghost is at the bottom of the group
            const lastMemberId = memberIdsVisual[memberIdsVisual.length - 1];
            const lastMemberPos = rowPositionsRef.current.get(lastMemberId);
            if (lastMemberPos) {
              const gap = 4;
              const newTop = lastMemberPos.top + lastMemberPos.height + gap;
              visualTop = Math.min(visualTop, newTop);
              visualBottom = Math.max(visualBottom, newTop + COLLAPSED_CARD_HEIGHT);
            }
          }
        }

        memberIds.forEach(id => {
          const pos = rowPositionsRef.current.get(id);
          if (!pos) return;

          if (id === draggingId && !isHoveringInsideGroup) {
            // Dragged member is leaving the group, don't include its placeholder
            return;
          }

          // Regular member or its placeholder - account for its visual position
          // including any animation offsets. This automatically expands/contracts
          // the border as members move to make space for the dragged item.
          const offset = offsetMapRef.current.get(id) || 0;
          visualTop = Math.min(visualTop, pos.top + offset);
          visualBottom = Math.max(visualBottom, pos.top + pos.height + offset);
          hasVisibleMembers = true;
        });

        if (!hasVisibleMembers) return;

        // Find group container top relative to pipeline
        const pipelineRect = containerRef.current!.getBoundingClientRect();
        const groupRect = container.getBoundingClientRect();
        const groupTopInPipeline = groupRect.top - pipelineRect.top;
        
        // Layout constants from FilterPipeline (pt-8 is 32px, p-3 is 12px)
        const topPadding = 32;
        const bottomPadding = 12;
        
        // Target positions in pipeline coordinates
        const targetTopY = visualTop - topPadding;
        const targetBottomY = visualBottom + bottomPadding;
        
        // Convert to relative y for GSAP (relative to their original DOM positions)
        const deltaTopY = targetTopY - groupTopInPipeline;
        const targetBorderHeight = targetBottomY - targetTopY;

        const isCurrentlyDraggingThisGroup = baseId === draggingId;

        // Only animate if values actually changed to prevent unnecessary layout/paint
        const currentY = gsap.getProperty(groupBorder, 'y') as number;
        const currentHeight = gsap.getProperty(groupBorder, 'height') as number;
        
        if (Math.abs(currentY - deltaTopY) > 0.1 || Math.abs(currentHeight - targetBorderHeight) > 0.1) {
          gsap.to(groupBorder, {
            y: deltaTopY,
            height: targetBorderHeight,
            duration: 0.5,
            ease: 'power2.out',
            width: '100%',
            overwrite: 'auto'
          });

          if (groupHandle) {
            gsap.to(groupHandle, {
              y: deltaTopY,
              duration: 0.5,
              ease: 'power2.out',
              overwrite: 'auto'
            });
          }
        }
      });
    }

    // MASK FURNITURE ANIMATION:
    // Handle shrinking/expanding mask containers visually when members move
    if (containerRef.current) {
      const maskContainers = containerRef.current.querySelectorAll('[data-mask-container]');
      maskContainers.forEach(container => {
        const maskingId = container.getAttribute('data-mask-masking');
        const maskedId = container.getAttribute('data-mask-masked');
        if (!maskingId || !maskedId) return;

        const maskBorder = container.querySelector('[data-mask-border]') as HTMLElement;
        const maskHandle = container.querySelector('[data-mask-handle]') as HTMLElement;
        if (!maskBorder) return;

        // Find all members of this mask unit
        const maskedFilter = itemsRef.current.find(f => f.id === maskedId);
        const memberIds = [maskingId, maskedId];
        if (maskedFilter?.groupedFilters) {
          memberIds.push(...maskedFilter.groupedFilters);
        }
        
        let visualTop = Infinity;
        let visualBottom = -Infinity;
        let hasVisibleMembers = false;

        const currentItems = itemsRef.current;
        const maskIndices = memberIds.map(mId => currentItems.findIndex(f => f.id === mId)).filter(idx => idx >= 0);
        const minMaskIdx = Math.min(...maskIndices);
        const maxMaskIdx = Math.max(...maskIndices);
        
        // A filter is "inside" visually if it's one of the members and not being dragged out
        const isDraggingMember = draggingId && memberIds.includes(draggingId);
        
        memberIds.forEach(id => {
          const pos = rowPositionsRef.current.get(id);
          if (!pos) return;

          // If a member is the one being dragged, it is currently "floating"
          // and its DOM row is acting as a placeholder.
          // If other members are hidden (collapsed), they should not contribute to the border size.
          
          if (id === draggingId) {
            // Include placeholder position
            const offset = offsetMapRef.current.get(id) || 0;
            visualTop = Math.min(visualTop, pos.top + offset);
            visualBottom = Math.max(visualBottom, pos.top + pos.height + offset);
            hasVisibleMembers = true;
          } else {
            // Check if this member is hidden (part of a collapsed group/mask)
            const row = container.querySelector(`[data-filter-id="${id}"]`) as HTMLElement;
            if (row && row.style.visibility !== 'hidden') {
              const offset = offsetMapRef.current.get(id) || 0;
              visualTop = Math.min(visualTop, pos.top + offset);
              visualBottom = Math.max(visualBottom, pos.top + pos.height + offset);
              hasVisibleMembers = true;
            }
          }
        });

        if (!hasVisibleMembers) return;

        // Find mask container top relative to pipeline
        const pipelineRect = containerRef.current!.getBoundingClientRect();
        const maskRect = container.getBoundingClientRect();
        const maskTopInPipeline = maskRect.top - pipelineRect.top;
        
        // Layout constants from FilterPipeline (mx-3 p-3 pt-8)
        const topPadding = 32;
        const bottomPadding = 12;
        
        const targetTopY = visualTop - topPadding;
        const targetBottomY = visualBottom + bottomPadding;
        
        const deltaTopY = targetTopY - maskTopInPipeline;
        const targetBorderHeight = targetBottomY - targetTopY;

        const currentY = gsap.getProperty(maskBorder, 'y') as number;
        const currentHeight = gsap.getProperty(maskBorder, 'height') as number;
        
        if (Math.abs(currentY - deltaTopY) > 0.1 || Math.abs(currentHeight - targetBorderHeight) > 0.1) {
          gsap.to(maskBorder, {
            y: deltaTopY,
            height: targetBorderHeight,
            duration: 0.5,
            ease: 'power2.out',
            overwrite: 'auto'
          });

          if (maskHandle) {
            gsap.to(maskHandle, {
              y: deltaTopY,
              duration: 0.5,
              ease: 'power2.out',
              overwrite: 'auto'
            });
          }
        }
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
      const borders = containerRef.current.querySelectorAll('[data-group-border]');
      const handles = containerRef.current.querySelectorAll('[data-group-handle]');
      
      if (borders.length > 0) {
        gsap.killTweensOf(Array.from(borders));
        gsap.to(Array.from(borders), {
          y: 0,
          height: '100%',
          width: '100%',
          duration: 0.4,
          ease: 'power2.out',
          clearProps: 'all'
        });
      }

      if (handles.length > 0) {
        gsap.killTweensOf(Array.from(handles));
        gsap.to(Array.from(handles), {
          y: 0,
          duration: 0.4,
          ease: 'power2.out',
          clearProps: 'all'
        });
      }

      const maskBorders = containerRef.current.querySelectorAll('[data-mask-border]');
      const maskHandles = containerRef.current.querySelectorAll('[data-mask-handle]');
      if (maskBorders.length > 0) {
        gsap.killTweensOf(Array.from(maskBorders));
        gsap.to(Array.from(maskBorders), {
          y: 0,
          height: '100%',
          duration: 0.4,
          ease: 'power2.out',
          clearProps: 'all'
        });
      }
      if (maskHandles.length > 0) {
        gsap.killTweensOf(Array.from(maskHandles));
        gsap.to(Array.from(maskHandles), {
          y: 0,
          duration: 0.4,
          ease: 'power2.out',
          clearProps: 'all'
        });
      }
    }
  }, [dragState.draggingId, containerRef]);

  // Move drag
  const handleDragMove = useCallback((e: React.PointerEvent | PointerEvent) => {
    const draggingId = draggingIdRef.current;
    if (!draggingId || !floatingElementRef.current) return;
    
    // Track direction for edge-sensitive logic
    const dy = e.clientY - lastYRef.current;
    if (dy !== 0) {
      isMovingUpRef.current = dy < 0;
      lastYRef.current = e.clientY;
    }
    const isMovingUp = isMovingUpRef.current;

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
      
      if (baseFilterId && baseFilterId !== draggingId) {
        const draggedFilter = itemsRef.current.find(f => f.id === draggingId);
        // Prevent nesting: check if dragging a group
        const isDraggingGroup = draggedFilter && !draggedFilter.groupId && draggedFilter.groupedFilters && draggedFilter.groupedFilters.length > 0;
        
        if (!isDraggingGroup && draggedFilter?.groupId !== baseFilterId) {
          // Don't allow grouping a filter into its own group
          currentGroupingHoverId = baseFilterId;
          // Reset offsets when hovering grouping icon
          resetAllOffsets();
        }
      }
    }
    
    // Check if we just left a grouping hover state to restore reorder space
    const leftGroupingIcon = groupingHoverIdRef.current !== null && currentGroupingHoverId === null;

    // Update grouping hover state
    if (groupingHoverIdRef.current !== currentGroupingHoverId) {
      groupingHoverIdRef.current = currentGroupingHoverId;
      if (onGroupHover) onGroupHover(currentGroupingHoverId);
    }

    // Check if hovering over masking icon button
    let currentMaskingHoverId: string | null = null;
    if (onMaskFilter && containerRef.current && !currentGroupingHoverId) {
      const elementAtPoint = document.elementFromPoint(e.clientX, e.clientY);
      const maskingButton = elementAtPoint?.closest('[data-masking-button]');
      const maskingFilterId = maskingButton?.getAttribute('data-filter-id');
      
      if (maskingFilterId && maskingFilterId !== draggingId) {
        const maskingFilter = itemsRef.current.find(f => f.id === maskingFilterId);
        // Only allow masking if the pattern filter is not already masking something
        if (maskingFilter && !maskingFilter.maskedFilterId) {
          currentMaskingHoverId = maskingFilterId;
          // Reset offsets when hovering masking icon
          resetAllOffsets();
        }
      }
    }

    // Update masking hover state
    if (maskingHoverIdRef.current !== currentMaskingHoverId) {
      maskingHoverIdRef.current = currentMaskingHoverId;
      if (onMaskHover) onMaskHover(currentMaskingHoverId);
    }

    // Check if hovering over group container groove (between thick borders)
    let currentGroupContainerHover: { baseId: string; insertIndex: number } | null = null;
    const draggedFilter = itemsRef.current.find(f => f.id === draggingId);
    
    // Allow pattern filters (even if masking something) to be added to groups
    if (onAddToGroup && containerRef.current && !currentGroupingHoverId) {
      const elementAtPoint = document.elementFromPoint(e.clientX, e.clientY);
      const handle = elementAtPoint?.closest('[data-group-handle]') as HTMLElement;
      const groupContainer = (handle?.closest('[data-group-container]') || elementAtPoint?.closest('[data-group-container]')) as HTMLElement;
      
      if (groupContainer) {
        const baseId = groupContainer.getAttribute('data-group-base');
        
        // Prevent nesting: check if dragging a group
        const isDraggingGroup = draggedFilter && !draggedFilter.groupId && draggedFilter.groupedFilters && draggedFilter.groupedFilters.length > 0;
        
        if (!isDraggingGroup && baseId && baseId !== draggingId && baseId !== draggedFilter?.groupId) {
          const groupContent = groupContainer.querySelector('[data-group-content]') as HTMLElement;
          
          if (groupContent) {
            const groupRect = groupContainer.getBoundingClientRect();
            
            // Check if cursor is inside the group container
            if (e.clientY > groupRect.top - 20 && e.clientY < groupRect.bottom + 20 && 
                e.clientX > groupRect.left - 20 && e.clientX < groupRect.right + 20) {
              
              // EDGE SENSITIVE LOGIC:
              // Top handle height is 32px (handle area), Bottom padding is 12px.
              const BOTTOM_PADDING = 12;
              
              const isInTopEdgeZone = !!handle;
              const isInBottomEdgeZone = e.clientY > groupRect.bottom - BOTTOM_PADDING;
              
              let isOutside = false;
              let insertIndex = 0;
              
              if (isInTopEdgeZone) {
                // USER REQUIREMENT: When dragging UPWARDS, hitting the handle triggers "Outside Above" (entire bar).
                // When dragging DOWNWARDS, hitting the handle triggers "Inside Group" (at the top).
                if (isMovingUp) {
                  isOutside = true;
                } else {
                  // Dragging down: insert at top of group
                  isOutside = false;
                  insertIndex = 0;
                }
              } else if (isInBottomEdgeZone) {
                // ANY cursor position in the bottom padding area or below the base filter is Outside Below
                isOutside = true;
              } else {
                // Middle area -> Definitely Inside
                // Find which position in the group to insert at
                const filterRows = Array.from(groupContent.querySelectorAll('[data-filter-row]'));
                const baseRow = filterRows[filterRows.length - 1];
                const baseRect = baseRow?.getBoundingClientRect();
                
                // CRITICAL FIX: If cursor is below the base filter's vertical center, it's Outside Below
                if (baseRect && e.clientY > baseRect.top + baseRect.height / 2) {
                  isOutside = true;
                } else {
                  insertIndex = 0;
                  for (let i = 0; i < filterRows.length; i++) {
                    const row = filterRows[i] as HTMLElement;
                    const rowRect = row.getBoundingClientRect();
                    if (e.clientY < rowRect.top + rowRect.height / 2) {
                      insertIndex = i;
                      break;
                    }
                    insertIndex = i + 1;
                  }
                }
              }
              
              if (!isOutside) {
                currentGroupContainerHover = { baseId, insertIndex };
              }
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
            if (item.id === draggingId) return;
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
        const newHoverIndex = getDropIndex(e.clientX, e.clientY, draggingId);

        // Update if hover index changed OR if we just left a grouping icon (to restore space)
        if ((newHoverIndex !== dragStateRef.current.currentHoverIndex || leftGroupingIcon) && newHoverIndex >= 0) {
          setDragState(prev => ({
            ...prev,
            currentHoverIndex: newHoverIndex
          }));
          animateRowOffsets(newHoverIndex, dragStateRef.current.originalIndex, draggingId);

          // Trigger preview callback
          if (onPreviewHover) {
            onPreviewHover(newHoverIndex, dragStateRef.current.originalIndex, draggingId);
          }
        }
      }
    }

    // PERFORMANCE FIX: Don't update cursor position in state - it causes re-renders on every pixel
    // The cursor position is only used for drawing connection lines, which can read from the event directly
    // Only update state when meaningful changes occur (hover index, grouping state)
  }, [getDropIndex, animateRowOffsets, containerRef, onPreviewHover, onCancelPreview, resetAllOffsets, onGroupHover, onError, onAddToGroup]);

  // End drag
  const handleDragEnd = useCallback((e: React.PointerEvent | PointerEvent) => {
    const draggingId = draggingIdRef.current;
    if (!draggingId) return;
    
    // Safety: Capture ID and immediately clear state to prevent multiple executions
    draggingIdRef.current = null;
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
    } = dragStateRef.current;
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
    
    // Check if dropped on masking icon button
    const maskingButton = elementAtPoint?.closest('[data-masking-button]');
    const droppedOnMaskingId = maskingButton?.getAttribute('data-filter-id');

    // If dropped on a grouping icon, handle grouping
    const draggedFilter = itemsRef.current.find(f => f.id === draggingId);
    const isDraggingGroup = !!(draggedFilter && !draggedFilter.groupId && draggedFilter.groupedFilters && draggedFilter.groupedFilters.length > 0);

    if (droppedOnMaskingId && onMaskFilter && droppedOnMaskingId !== draggingId) {
      // Handle masking drop
      restoreFurnitureStyles();
      onMaskFilter(draggingId, droppedOnMaskingId);
      
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
      const rows = containerRef.current?.querySelectorAll('[data-filter-row]');
      if (rows) {
        gsap.killTweensOf(Array.from(rows));
        rows.forEach(row => {
          gsap.set(row, { y: 0, clearProps: 'transform' });
        });
      }
      
      offsetMapRef.current.clear();
      groupingHoverIdRef.current = null;
      maskingHoverIdRef.current = null;
      if (onGroupHover) onGroupHover(null);
      if (onMaskHover) onMaskHover(null);
      
      return;
    }

    if (droppedOnGroupingId && onGroupFilter && droppedOnGroupingId !== draggingId) {
      if (isDraggingGroup) {
        if (onError) {
          onError("Filter groups cannot be nested");
        }
        // Snap back logic below will handle it
      } else {
        // Restore group and mask container heights and styles before callback
        restoreFurnitureStyles();
        
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
      const { baseId } = groupContainerHoverRef.current;
      
      // VERIFICATION: Check if cursor is actually over the target group container
      // and not in its "Outside" zones. This ensures consistency between 
      // the visual hover animation and the final drop result.
      const handleAtDrop = elementAtPoint?.closest('[data-group-handle]') as HTMLElement;
      const groupContainerAtDrop = (handleAtDrop?.closest('[data-group-container]') || elementAtPoint?.closest('[data-group-container]')) as HTMLElement;
      const dropBaseId = groupContainerAtDrop?.getAttribute('data-group-base');
      
      let isActuallyInside = false;
      let finalInsertIndex = groupContainerHoverRef.current.insertIndex;

      // Only proceed with group insertion if we are still visually over the SAME group
      if (groupContainerAtDrop && dropBaseId === baseId) {
        const dropRect = groupContainerAtDrop.getBoundingClientRect();
        const groupContent = groupContainerAtDrop.querySelector('[data-group-content]') as HTMLElement;
        
        if (groupContent) {
          const BOTTOM_PADDING = 12;

          // Consistency check: Use the same directional logic as handleDragMove
          const isInTopEdgeZone = !!handleAtDrop;
          const isInBottomEdgeZone = e.clientY > dropRect.bottom - BOTTOM_PADDING;
          
          let isActuallyOutside = false;
          if (isInTopEdgeZone) {
            // If we are in the handle bar zone at the moment of drop
            if (isMovingUpRef.current) {
              isActuallyOutside = true;
            } else {
              isActuallyOutside = false;
              finalInsertIndex = 0;
            }
          } else if (isInBottomEdgeZone) {
            isActuallyOutside = true;
          } else {
            // Middle area check
            const filterRows = Array.from(groupContent.querySelectorAll('[data-filter-row]'));
            const baseRow = filterRows[filterRows.length - 1];
            const baseRect = baseRow?.getBoundingClientRect();
            if (baseRect && e.clientY > baseRect.top + baseRect.height / 2) {
              isActuallyOutside = true;
            }
          }
          
          if (!isActuallyOutside) {
            isActuallyInside = true;
            
            // Recalculate insert index for inside area
            const filterRows = Array.from(groupContent.querySelectorAll('[data-filter-row]'));
            finalInsertIndex = 0;
            for (let i = 0; i < filterRows.length; i++) {
              const row = filterRows[i] as HTMLElement;
              const rowRect = row.getBoundingClientRect();
              if (e.clientY < rowRect.top + rowRect.height / 2) {
                finalInsertIndex = i;
                break;
              }
              finalInsertIndex = i + 1;
            }
          }
        }
      }

      if (isDraggingGroup) {
        if (onError) {
          onError("Filter groups cannot be nested");
        }
        // Let the normal reorder logic handle it
      } else if (isActuallyInside) {
        // Allow mask units to be added to groups
        // For pattern filters that are masking something, we need to unlink the mask
        // relationship first before adding to the group, or handle it differently
        // Restore group and mask container heights and styles before callback
        restoreFurnitureStyles();
        
        // If this is a mask unit (pattern filter masking something), 
        // we should still add it to the group but preserve the mask relationship
        // by only adding the dragged filter itself, not the entire mask unit
        onAddToGroup(draggingId, baseId, finalInsertIndex);
        
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
        // Correct boundary check: maxGroupIndex + 1 is the first position OUTSIDE the group at the bottom
        hoverIndexOutsideGroup = currentHoverIndex < minGroupIndex || currentHoverIndex > maxGroupIndex;
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
      // 2. Cursor is no longer within the original group container (DRAGGED OUT HORIZONTALLY)
      // 3. Was dragged outside panel
      // IMPORTANT: Even if position hasn't changed vertically, moving horizontally out of the group should ungroup.
      shouldUngroup = hoverIndexOutsideGroup || !isStillInOriginalGroup || wasOutsidePanel;
      
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
          let targetX = 0, targetY = 0;
          
          if (originalPosition) {
            const filterRow = containerRef.current.querySelector(`[data-filter-id="${draggingId}"]`);
            if (filterRow) {
              const rowRect = filterRow.getBoundingClientRect();
              targetX = isDraggingGroup ? rowRect.left - 12 : rowRect.left;
              targetY = isDraggingGroup ? rowRect.top - 12 : rowRect.top;
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
        
        // Restore group and mask container heights and styles
        restoreFurnitureStyles();
        
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
    const isReorderingWithinGroupFinal = draggedFilter?.groupId && !shouldUngroup && positionChanged;

    if (floating && placeholder && containerRef.current) {
      // CRITICAL: Kill ALL ongoing GSAP animations immediately to prevent race conditions
      gsap.killTweensOf(floating);
      const rows = containerRef.current?.querySelectorAll('[data-filter-row]');
      if (rows) {
        gsap.killTweensOf(Array.from(rows));
      }
      
      // Also kill all group furniture animations
      const furniture = containerRef.current?.querySelectorAll('[data-group-top], [data-group-bottom], [data-group-border], [data-group-content]');
      if (furniture) {
        gsap.killTweensOf(Array.from(furniture));
      }

      // Restore group and mask container heights and styles IMMEDIATELY upon release
      // This prevents the split-second delay the user reported
      restoreFurnitureStyles();

      // CRITICAL: We should update if position changed OR if the structure changed (ungrouping)
      if (positionChanged || isReorderingWithinGroupFinal || shouldUngroup) {
        // Position changed OR reordering within group OR ungrouping: hide floating element immediately
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
        let workingItems = [...itemsRef.current];
        
        // If we detected ungrouping, apply it locally first before reordering
        if (draggedFilter?.groupId && onUngroupFilter && shouldUngroup) {
          // Apply ungrouping locally: remove groupId and update base filter
          const baseId = draggedFilter.groupId;
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
                const updatedGrouped = item.groupedFilters?.filter(id => id !== draggingId) || [];
                return {
                  ...item,
                  groupedFilters: updatedGrouped.length > 0 ? updatedGrouped : undefined
                };
              }
              return item;
            });
          }
        }
        
        // Use the updated filter object for the rest of the reorder logic
        const finalDraggedFilter = workingItems.find(f => f.id === draggingId) || draggedFilter;
        
        if (isDraggingGroup && finalDraggedFilter) {
          // Moving entire group - move all group members together in their visual order
          const groupMembers = [draggingId, ...(finalDraggedFilter.groupedFilters || [])];
          // Use a Set to ensure uniqueness and find all relevant items in visualFilters
          const memberIds = new Set(groupMembers);
          const groupIndices = workingItems
            .map((f, i) => memberIds.has(f.id) ? i : -1)
            .filter(idx => idx >= 0)
            .sort((a, b) => a - b);
          
          const movingItems = groupIndices.map(i => workingItems[i]);
          
          // Remove all group members from back to front to preserve indices
          [...groupIndices].reverse().forEach(idx => {
            workingItems.splice(idx, 1);
          });
          
          // Calculate insert position
          let insertAt = currentHoverIndex;
          // Adjust for removed items before the insert point
          const itemsBeforeInsert = groupIndices.filter(idx => idx < currentHoverIndex).length;
          insertAt -= itemsBeforeInsert;
          insertAt = Math.max(0, insertAt);
          
          // Insert all group members at once in their original order
          workingItems.splice(insertAt, 0, ...movingItems);
        } else {
          // Single filter reorder (including child filters that were just ungrouped or reordered within group)
          const stillInGroup = finalDraggedFilter?.groupId && !shouldUngroup;
          
          // Need to find the correct index in the workingItems array
          const workingIndex = workingItems.findIndex(f => f.id === draggingId);
          if (workingIndex >= 0) {
            // Use currentHoverIndex directly - it's already calculated correctly by getDropIndex
            // based on the visual order of filters
            let insertAt = currentHoverIndex;
            
          // Now remove the item
          const [removed] = workingItems.splice(workingIndex, 1);
          
          // Adjust insert position for the removal
          // If we removed an item from before the target, the target index shifts down by 1
          if (workingIndex < insertAt) {
            insertAt--;
          }
          
          // Final safety check: ensure insertAt is within the actual group bounds after removal
          // This is CRITICAL - we must ensure the filter stays within the group
          if (stillInGroup && finalDraggedFilter?.groupId) {
              const baseId = finalDraggedFilter.groupId;
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
                  const isChildFilter = finalDraggedFilter.id !== baseId;
                  
                  if (isChildFilter) {
                    // Children can go between finalMin and finalMax (inclusive)
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
            if (stillInGroup && finalDraggedFilter?.groupId) {
              const baseId = finalDraggedFilter.groupId;
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
                              groupedFilters: childrenOrder.length > 0 ? childrenOrder : undefined
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
        let targetX = 0, targetY = 0;
        const originalPosition = rowPositionsRef.current.get(draggingId);

        if (originalPosition) {
          const filterRow = containerRef.current.querySelector(`[data-filter-id="${draggingId}"]`);
          if (filterRow) {
            const rowRect = filterRow.getBoundingClientRect();
            targetX = isDraggingGroup ? rowRect.left - 12 : rowRect.left;
            targetY = isDraggingGroup ? rowRect.top - 12 : rowRect.top;
          }
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

      // Clear all group furniture animations and transforms
      const furniture = containerRef.current?.querySelectorAll('[data-group-top], [data-group-bottom], [data-group-border], [data-group-content]');
      if (furniture) {
        gsap.killTweensOf(Array.from(furniture));
        furniture.forEach(el => {
          gsap.set(el, { y: 0, clearProps: 'all' });
        });
      }

      // CRITICAL: Check if we tried to add to a group but the first check didn't catch it
      // This can happen if isDraggingMask is true and the filter wasn't detected as inside the group
      // In this case, we should still try to add it to the group if groupContainerHoverRef is set
      // This check must run BEFORE positionChanged check to ensure it runs even if position didn't change
      if (groupContainerHoverRef.current && onAddToGroup && !isDraggingGroup && !shouldUngroup) {
        const { baseId, insertIndex } = groupContainerHoverRef.current;
        
        // Double-check that we're actually inside the group container
        const elementAtPoint = document.elementFromPoint(e.clientX, e.clientY);
        const groupContainerAtDrop = elementAtPoint?.closest('[data-group-container]') as HTMLElement;
        const dropBaseId = groupContainerAtDrop?.getAttribute('data-group-base');
        
        if (dropBaseId === baseId) {
          restoreFurnitureStyles();
          onAddToGroup(draggingId, baseId, insertIndex);
          
          // Clean up and return early
          if (floating?.parentNode) floating.parentNode.removeChild(floating);
          floatingElementRef.current = null;
          if (placeholder) {
            placeholder.style.visibility = '';
            placeholder.style.pointerEvents = '';
            placeholderRef.current = null;
          }
          if (scrollContainerRef.current && containerRef.current) {
            scrollContainerRef.current.style.overflow = originalOverflowRef.current;
            containerRef.current.style.minHeight = '';
            containerRef.current.style.height = '';
            scrollContainerRef.current = null;
          }
          const rows = containerRef.current?.querySelectorAll('[data-filter-row]');
          if (rows) {
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

      // Update React state if position changed
      if (positionChanged) {
        const newItems = [...itemsRef.current];

        if (isDraggingComplex && draggedItem) {
          // Find all members of the complex unit (group or mask)
          const memberIds: string[] = [draggedItem.id];
          
          if (isDraggingGroup) {
            memberIds.push(...(draggedItem.groupedFilters || []));
          } else if (isDraggingMask) {
            // Find all members of the masking relationship
            const maskingId = draggedItem.maskId || (draggedItem.maskedFilterId ? draggedItem.id : null);
            const maskedId = draggedItem.maskedFilterId || (draggedItem.maskId ? draggedItem.id : null);
            
            if (maskingId && maskedId) {
              const maskingFilter = itemsRef.current.find(f => f.id === maskingId);
              const maskedFilter = itemsRef.current.find(f => f.id === maskedId);
              
              const ids = [maskingId, maskedId];
              if (maskedFilter?.groupedFilters) {
                ids.push(...maskedFilter.groupedFilters);
              }
              // Unique IDs only
              memberIds.length = 0;
              memberIds.push(...Array.from(new Set(ids)));
            }
          }

          const members = memberIds.map(id => itemsRef.current.find(item => item.id === id)).filter(Boolean) as T[];
          
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

    // Restore group and mask container heights and styles
    restoreFurnitureStyles();

    // Reset state
    if (onGroupHover) onGroupHover(null);
    groupingHoverIdRef.current = null;
    groupContainerHoverRef.current = null;
  }, [dragState, containerRef, onReorder, onCancelPreview, onGroupFilter, onAddToGroup, onUngroupFilter, onGroupHover, restoreFurnitureStyles, handleDragMove]);

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
    let filterRow = target.closest('[data-filter-row]') as HTMLElement;
    let groupContainer = target.closest('[data-group-container]') as HTMLElement;
    let maskContainer = target.closest('[data-mask-container]') as HTMLElement;
    
    // If not on a row, check if we're on a furniture handle
    if (!filterRow) {
      if (groupContainer) {
        const baseId = groupContainer.getAttribute('data-group-base');
        filterRow = groupContainer.querySelector(`[data-filter-id="${baseId}"]`) as HTMLElement;
      } else if (maskContainer) {
        const maskingId = maskContainer.getAttribute('data-mask-masking');
        filterRow = maskContainer.querySelector(`[data-filter-id="${maskingId}"]`) as HTMLElement;
      }
    }

    if (!filterRow || !containerRef.current) return;

    // Check if dragging a base filter with a group
    const draggedItem = itemsRef.current.find(i => i.id === filterId);
    const isDraggingGroup = !!(draggedItem && !draggedItem.groupId && draggedItem.groupedFilters && draggedItem.groupedFilters.length > 0);
    const isDraggingMask = !!(draggedItem && (draggedItem.maskId || draggedItem.maskedFilterId));
    const isDraggingComplex = isDraggingGroup || isDraggingMask;

    // CRITICAL FIX: Capture the original position and calculate offset.
    // If dragging a complex unit, use the containing unit's rect as the anchor.
    let originalRect = filterRow.getBoundingClientRect();
    if (isDraggingGroup && groupContainer) {
      originalRect = groupContainer.getBoundingClientRect();
    } else if (isDraggingMask) {
      const maskContainer = target.closest('[data-mask-container]');
      if (maskContainer) {
        originalRect = maskContainer.getBoundingClientRect();
      }
    }

    dragOffsetRef.current = {
      x: e.clientX - originalRect.left,
      y: e.clientY - originalRect.top
    };

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

    // Collapse group container when dragging base filter - DO THIS BEFORE CLONING
    // so we can capture the collapsed state for the placeholder
    if (isDraggingGroup && groupContainer) {
      const groupContent = groupContainer.querySelector('[data-group-content]') as HTMLElement;
      const groupBorder = groupContainer.querySelector('[data-group-border]') as HTMLElement;

      if (groupContent) {
        // Store original state for restoration
        (groupContainer as any).__originalBorder = groupBorder ? groupBorder.style.borderWidth : '';
        (groupContainer as any).__originalHeight = groupContent.style.height || 'auto';
        (groupContainer as any).__originalOverflow = groupContent.style.overflow;
        
        // Collapse height to base filter card only - do it immediately for correct placeholder calculation
        groupContent.style.height = `${filterRow.offsetHeight}px`; 
        groupContent.style.overflow = 'hidden';
        
        // Also use GSAP for a smooth visual transition if needed, but height is already set
        gsap.from(groupContent, {
          height: (groupContainer as any).__originalHeight,
          duration: 0.3,
          ease: 'power2.out'
        });

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

    // Collapse mask container when dragging a member
    if (isDraggingMask) {
      const maskContainer = target.closest('[data-mask-container]') as HTMLElement;
      if (maskContainer) {
        const maskContent = maskContainer.querySelector('.space-y-2') as HTMLElement;

        if (maskContent) {
          (maskContainer as any).__originalHeight = maskContent.style.height || 'auto';
          (maskContainer as any).__originalOverflow = maskContent.style.overflow;

          // Collapse to single card height
          maskContent.style.height = `${filterRow.offsetHeight}px`;
          maskContent.style.overflow = 'hidden';

          gsap.from(maskContent, {
            height: (maskContainer as any).__originalHeight,
            duration: 0.3,
            ease: 'power2.out'
          });

          // Hide other members
          const allRows = maskContainer.querySelectorAll('[data-filter-row]');
          allRows.forEach(row => {
            const rowEl = row as HTMLElement;
            if (rowEl !== filterRow) {
              (rowEl as any).__originalVisibility = rowEl.style.visibility || 'visible';
              (rowEl as any).__originalPosition = rowEl.style.position || 'relative';
              rowEl.style.visibility = 'hidden';
              rowEl.style.position = 'absolute';
            }
          });

          calculateRowPositions();
        }
      }
    }

    // Create floating clone
    let clone: HTMLElement;
    const cardRect = filterRow.getBoundingClientRect();

    if (isDraggingGroup || isDraggingMask) {
      // If dragging a complex unit, create a wrapper with the appropriate border
      const wrapper = document.createElement('div');
      wrapper.className = "relative p-3";
      
      // Use the card width plus padding to match furniture container width
      wrapper.style.width = `${cardRect.width + 24}px`;
      
      // Calculate wrapper height: card height + top padding (8px for handle) + bottom padding (12px)
      // Actually FilterPipeline uses pt-8 (32px) for groups and masks now
      const topPadding = 32;
      const bottomPadding = 12;
      wrapper.style.height = `${cardRect.height + topPadding + bottomPadding}px`;
      wrapper.className = `relative px-3 pt-8 pb-3`; // Match pipeline padding
      
      const border = document.createElement('div');
      border.className = `absolute inset-0 border-2 pointer-events-none ${
        isDraggingGroup ? 'border-blue-600/60 rounded-none' : 'border-purple-600/60 rounded-xl'
      }`;
      wrapper.appendChild(border);

      // Add handle visual to ghost
      const handle = document.createElement('div');
      handle.className = `absolute top-0 left-0 right-0 h-8 flex items-center justify-center ${
        isDraggingGroup ? 'bg-blue-50 rounded-none' : 'bg-purple-50 rounded-t-xl'
      }`;
      const gripIcon = document.createElement('div');
      gripIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-grip-horizontal ${isDraggingGroup ? 'text-blue-500/50' : 'text-purple-500/50'}"><circle cx="12" cy="9" r="1"/><circle cx="19" cy="9" r="1"/><circle cx="5" cy="9" r="1"/><circle cx="12" cy="15" r="1"/><circle cx="19" cy="15" r="1"/><circle cx="5" cy="15" r="1"/></svg>`;
      handle.appendChild(gripIcon.firstChild!);
      wrapper.appendChild(handle);

      const cardClone = elementToClone.cloneNode(true) as HTMLElement;
      cardClone.style.visibility = 'visible';
      cardClone.style.opacity = '1';
      // Remove horizontal margins from card in ghost if it's inside a furniture container
      cardClone.classList.remove('mx-6');
      cardClone.classList.remove('mx-3');
      wrapper.appendChild(cardClone);
      
      clone = wrapper;
    } else {
      clone = elementToClone.cloneNode(true) as HTMLElement;
      clone.style.width = `${cardRect.width}px`;
      clone.style.height = `${cardRect.height}px`;
    }

    // PERFORMANCE: Use transform instead of left/top for GPU acceleration
    clone.style.position = 'fixed';
    clone.style.left = '0';
    clone.style.top = '0';
    
    // Initial position based on the container if complex, otherwise based on card
    let initialX = cardRect.left;
    let initialY = cardRect.top;

    if (isDraggingGroup || isDraggingMask) {
      // Offset initial position to account for the wrapper's padding
      initialX = cardRect.left - 12; // p-3 is 12px
      initialY = cardRect.top - 32;  // pt-8 is 32px
    }
    
    clone.style.transform = `translate(${initialX}px, ${initialY}px) scale(1.03)`;
    clone.style.zIndex = '10000';
    clone.style.pointerEvents = 'none';
    clone.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.05)';
    clone.style.opacity = '1';

    // GPU acceleration hints for smooth dragging
    clone.style.willChange = 'transform';
    
    // Cleanup attributes from the clone/wrapper
    const targetForCleanup = isDraggingGroup ? clone.querySelector('[data-filter-row]') : clone;
    if (targetForCleanup) {
      targetForCleanup.removeAttribute('data-filter-row');
      targetForCleanup.removeAttribute('data-filter-id');
      targetForCleanup.removeAttribute('data-group-block');
    }

    // Add data attribute to identify floating clones for cleanup
    clone.setAttribute('data-floating-clone', 'true');

    // If dragging a group, add badge showing count (skip for masking groups as requested)
    if (isDraggingGroup && draggedItem && draggedItem.groupedFilters) {
      const groupCount = draggedItem.groupedFilters.length + 1;
      
      if (groupCount > 1) {
        // Create badge element
        const badge = document.createElement('div');
        badge.style.position = 'absolute';
        badge.style.top = '0px'; 
        badge.style.right = '0px'; 
        badge.style.width = '32px';
        badge.style.height = '32px';
        badge.style.borderRadius = '0px';
        badge.style.background = 'linear-gradient(135deg, rgb(37, 99, 235), rgb(29, 78, 216))';
        badge.style.display = 'flex';
        badge.style.alignItems = 'center';
        badge.style.justifyContent = 'center';
        badge.style.fontSize = '14px';
        badge.style.fontWeight = '700';
        badge.style.color = 'white';
        badge.style.boxShadow = '0 2px 6px rgba(37, 99, 235, 0.2)';
        badge.style.zIndex = '10001';
        badge.textContent = groupCount.toString();
        
        clone.appendChild(badge);
      }
    }

    document.body.appendChild(clone);
    floatingElementRef.current = clone;

    // Create placeholder (ghost)
    elementToClone.style.visibility = 'hidden';
    elementToClone.style.pointerEvents = 'none';
    placeholderRef.current = elementToClone;

    // Set drag state
    draggingIdRef.current = filterId;
    lastYRef.current = e.clientY;
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
  }, [isDisabled, containerRef, calculateRowPositions, handleDragMove, handleDragEnd, itemsRef]);


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
        draggingIdRef.current = null;
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
        
        // Reset group furniture
        const borders = containerRef.current?.querySelectorAll('[data-group-border]');
        const handles = containerRef.current?.querySelectorAll('[data-group-handle]');
        
        if (borders) {
          gsap.to(Array.from(borders), {
            y: 0,
            height: '100%',
            width: '100%',
            duration: 0.15,
            ease: 'power2.out',
            clearProps: 'all'
          });
          borders.forEach(b => (b as HTMLElement).style.visibility = '');
        }

        if (handles) {
          gsap.to(Array.from(handles), {
            y: 0,
            duration: 0.15,
            ease: 'power2.out',
            clearProps: 'all'
          });
        }
        offsetMapRef.current.clear();
        floatingElementRef.current = null;
        placeholderRef.current = null;

        // Restore group and mask container heights and styles
        restoreFurnitureStyles();

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
  }, [dragState.draggingId, containerRef, onCancelPreview, restoreFurnitureStyles]);

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
