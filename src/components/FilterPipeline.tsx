import React, { useCallback, useEffect, useState, useRef } from 'react';
import { PlusIcon, ChevronDownIcon, EyeIcon, EyeOffIcon, ChevronsUpIcon, ChevronsDownIcon, GripHorizontalIcon, XIcon } from 'lucide-react';
import { FilterConfig, FilterType, BlendMode, NoiseType, ColorChannel, ColorToneParams, GlowParams, VSyncTearsParams, ChromaticAberrationParams, DuplicateLayerParams, PatternParams } from '../types';
import { FILTER_DEFINITIONS } from '../constants/filters';
import { FilterCard } from './FilterCard';
import { useGsapDrag } from '../hooks/useGsapDrag';

interface DimensionLinkState {
  sourceFilterId: string;
  isSelecting: boolean;
  cursorPosition: {
    x: number;
    y: number;
  } | null;
}

interface FilterPipelineProps {
  filters: FilterConfig[];
  onAddFilter: (type: FilterType) => void;
  onUpdateFilter: (id: string, params: Record<string, number>) => void;
  onUpdatePatternImage: (id: string, image: HTMLImageElement) => void;
  onUpdateBlendMode: (id: string, blendMode: BlendMode) => void;
  onPreviewBlendMode: (id: string, blendMode: BlendMode | null) => void;
  onUpdateNoiseType: (id: string, noiseType: NoiseType) => void;
  onPreviewNoiseType: (id: string, noiseType: NoiseType | null) => void;
  onUpdateColorTone: (id: string, params: ColorToneParams) => void;
  onUpdateColorChannel: (id: string, channel: ColorChannel) => void;
  onUpdateGlow: (id: string, params: GlowParams) => void;
  onUpdateVSyncTears: (id: string, params: VSyncTearsParams) => void;
  onUpdateChromaticAberration: (id: string, params: ChromaticAberrationParams) => void;
  onUpdateDuplicateLayer: (id: string, params: DuplicateLayerParams) => void;
  onUpdatePattern: (id: string, params: PatternParams) => void;
  onToggleFilterEnabled: (id: string) => void;
  onRemoveFilter: (id: string) => void;
  onReorderFilters: (filters: FilterConfig[]) => void;
  onLinkDimensions: (sourceId: string, targetId: string) => void;
  onUnlinkDimensions: (filterId: string, targetId: string) => void;
  canvasRef?: React.RefObject<HTMLCanvasElement>;
  onPreviewReorder: (filters: FilterConfig[]) => void;
  onCancelPreview: () => void;
}

export function FilterPipeline({
  filters,
  onAddFilter,
  onUpdateFilter,
  onUpdatePatternImage,
  onUpdateBlendMode,
  onPreviewBlendMode,
  onUpdateNoiseType,
  onPreviewNoiseType,
  onUpdateColorTone,
  onUpdateColorChannel,
  onUpdateGlow,
  onUpdateVSyncTears,
  onUpdateChromaticAberration,
  onUpdateDuplicateLayer,
  onUpdatePattern,
  onToggleFilterEnabled,
  onRemoveFilter,
  onReorderFilters,
  onLinkDimensions,
  onUnlinkDimensions,
  canvasRef,
  onPreviewReorder,
  onCancelPreview
}: FilterPipelineProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [expandedFilters, setExpandedFilters] = useState<Set<string>>(new Set());
  const [linkState, setLinkState] = useState<DimensionLinkState | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<{
    filterId: string;
    type: 'blend' | 'noise';
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [groupingHoverId, setGroupingHoverId] = useState<string | null>(null);
  const [maskingHoverId, setMaskingHoverId] = useState<string | null>(null);

  // Handle masking (drag filter onto pattern masking icon)
  const handleMaskFilter = useCallback((maskedId: string, maskingId: string) => {
    // 1. Unlink request
    if (!maskedId) {
      onReorderFilters(filters.map(f => {
        if (f.id === maskingId) return { ...f, maskedFilterId: undefined };
        if (f.maskId === maskingId) return { ...f, maskId: undefined };
        return f;
      }));
      return;
    }

    // 2. Identify the target unit
    const targetFilter = filters.find(f => f.id === maskedId);
    if (!targetFilter) return;

    // Get the base filter ID (if dragged filter is a child, get its parent)
    const baseFilterId = targetFilter.groupId || maskedId;
    const baseFilter = filters.find(f => f.id === baseFilterId);
    if (!baseFilter) return;

    // 3. Get ALL children using BOTH groupedFilters (on base) AND groupId (on children)
    // This ensures we don't miss any group members
    const childIdsFromBase = baseFilter.groupedFilters || [];
    const childIdsFromGroupId = filters.filter(f => f.groupId === baseFilterId).map(f => f.id);
    const allChildIds = Array.from(new Set([...childIdsFromBase, ...childIdsFromGroupId]));
    
    // Unit = all children + the base filter
    const unitMemberIds = [...allChildIds, baseFilterId];

    // 4. Update relationships - preserve ALL existing properties including groupId and groupedFilters
    const updatedFilters = filters.map(f => {
      if (f.id === maskingId) {
        // Pattern Overlay points to the base filter
        return { ...f, maskedFilterId: baseFilterId };
      }

      if (unitMemberIds.includes(f.id)) {
        // Set maskId on ALL unit members (base AND children)
        // This marks them all as part of the masked unit
        // Children keep their groupId, base keeps its groupedFilters
        return { ...f, maskId: maskingId };
      }

      // Clear stale relationships
      if (f.maskId === maskingId) {
        return { ...f, maskId: undefined };
      }
      if (f.maskedFilterId === baseFilterId && f.id !== maskingId) {
        return { ...f, maskedFilterId: undefined };
      }

      return f;
    });

    // 5. Reorder: extract unit members and mask, then reinsert together
    const unitMembers = unitMemberIds
      .map(id => updatedFilters.find(f => f.id === id))
      .filter(Boolean) as FilterConfig[];
    const maskingFilterObj = updatedFilters.find(f => f.id === maskingId)!;

    const filteredFilters = updatedFilters.filter(f => 
      !unitMemberIds.includes(f.id) && f.id !== maskingId
    );

    // Find insertion point (earliest position of any unit member)
    const unitIndices = unitMemberIds
      .map(id => filters.findIndex(f => f.id === id))
      .filter(idx => idx >= 0);
    const firstUnitIndex = unitIndices.length > 0 ? Math.min(...unitIndices) : 0;

    let insertAt = 0;
    const remainingIds = filteredFilters.map(f => f.id);
    for (let i = 0; i < firstUnitIndex; i++) {
      if (remainingIds.includes(filters[i].id)) insertAt++;
    }

    // Insert as cohesive block: [Children...] -> [Base] -> [Mask]
    filteredFilters.splice(insertAt, 0, ...unitMembers, maskingFilterObj);
    
    
    onReorderFilters(filteredFilters);
  }, [filters, onReorderFilters]);

  // Handle disbanding an entire group (remove all children from the group)
  const handleDisbandGroup = useCallback((baseFilterId: string) => {
    const baseFilter = filters.find(f => f.id === baseFilterId);
    if (!baseFilter || !baseFilter.groupedFilters || baseFilter.groupedFilters.length === 0) return;

    // Clear groupId from all children and clear groupedFilters from base
    const updatedFilters = filters.map(f => {
      if (f.id === baseFilterId) {
        // Clear groupedFilters from base
        const { groupedFilters, ...rest } = f;
        return rest;
      }
      if (f.groupId === baseFilterId) {
        // Clear groupId from children
        const { groupId, ...rest } = f;
        return rest;
      }
      return f;
    });

    onReorderFilters(updatedFilters);
  }, [filters, onReorderFilters]);

  // Handle unlinking a mask (remove mask relationship)
  const handleUnlinkMask = useCallback((maskingId: string) => {
    // Use the existing handleMaskFilter with empty maskedId to unlink
    handleMaskFilter('', maskingId);
  }, [handleMaskFilter]);

  const previousFilterIdsRef = useRef<Set<string>>(new Set());
  const pipelineRef = useRef<HTMLDivElement>(null);
  const filterListRef = useRef<HTMLDivElement>(null);
  
  // Preview state
  const previewTimeoutRef = useRef<number>();
  const lastPreviewIndexRef = useRef<number>(-1);
  
  // Organize filters into groups: children on top, base at bottom
  const displayGroups = React.useMemo(() => {
    const result: (FilterConfig | { type: 'group-start'; baseId: string } | { type: 'group-end'; baseId: string } | { type: 'mask-start'; maskingId: string; maskedId: string } | { type: 'mask-end'; maskingId: string; maskedId: string })[] = [];
    const processed = new Set<string>();
    
    // 1. Build relationship maps using BOTH groupId (on children) AND groupedFilters (on base)
    const baseToChildren = new Map<string, FilterConfig[]>();

    // First pass: use groupId on children (even if they have maskId)
    filters.forEach(f => {
      if (f.groupId) {
        if (!baseToChildren.has(f.groupId)) baseToChildren.set(f.groupId, []);
        const existing = baseToChildren.get(f.groupId)!;
        if (!existing.some(c => c.id === f.id)) {
          existing.push(f);
        }
      }
    });
    
    // Second pass: use groupedFilters on base filters (as backup/verification)
    filters.forEach(f => {
      if (f.groupedFilters && f.groupedFilters.length > 0) {
        if (!baseToChildren.has(f.id)) baseToChildren.set(f.id, []);
        const existing = baseToChildren.get(f.id)!;
        f.groupedFilters.forEach(childId => {
          const childFilter = filters.find(cf => cf.id === childId);
          if (childFilter && !existing.some(c => c.id === childId)) {
            existing.push(childFilter);
          }
        });
      }
    });
    
    // Sort children by original array order
    baseToChildren.forEach(children => {
      children.sort((a, b) => filters.findIndex(f => f.id === a.id) - filters.findIndex(f => f.id === b.id));
    });


    // 2. Process filters - skip children and masked items (they get pulled in by their parent/mask)
    for (const filter of filters) {
      if (processed.has(filter.id)) continue;

      // Skip children (they will be rendered with their group)
      if (filter.groupId) continue;

      // Skip ALL masked filters - they will be rendered when we encounter their masking filter
      // This includes both standalone masked filters and masked base filters (groups)
      if (filter.maskId) continue;

      // Case A: Masking Filter (Pattern Overlay)
      if (filter.maskedFilterId) {
        const maskedId = filter.maskedFilterId;
        const maskedFilter = filters.find(f => f.id === maskedId);
        
        if (maskedFilter) {
          result.push({ type: 'mask-start', maskingId: filter.id, maskedId });
          
          // Render the masked unit (could be single filter or group)
          if (!processed.has(maskedId)) {
            const children = baseToChildren.get(maskedId) || [];
            const isGroup = children.length > 0;

            if (isGroup) {
              result.push({ type: 'group-start', baseId: maskedId });
              for (const child of children) {
                result.push(child);
                processed.add(child.id);
              }
              result.push(maskedFilter);
              processed.add(maskedId);
              result.push({ type: 'group-end', baseId: maskedId });
            } else {
              result.push(maskedFilter);
              processed.add(maskedId);
            }
          }

          // Add the mask filter itself at the bottom
          result.push(filter);
          processed.add(filter.id);
          
          result.push({ type: 'mask-end', maskingId: filter.id, maskedId });
          continue;
        }
      }

      // Case B: Regular Group Base (not masked)
      const children = baseToChildren.get(filter.id) || [];
      if (children.length > 0) {
        result.push({ type: 'group-start', baseId: filter.id });
        for (const child of children) {
          result.push(child);
          processed.add(child.id);
        }
        result.push(filter);
        processed.add(filter.id);
        result.push({ type: 'group-end', baseId: filter.id });
        continue;
      }

      // Case C: Standalone Filter
      result.push(filter);
      processed.add(filter.id);
    }
    
    return result;
  }, [filters]);

  // Process filters in order, handling groups and standalone filters
  const visualFilters = React.useMemo(() => {
    return displayGroups.filter(item => 'id' in item) as FilterConfig[];
  }, [displayGroups]);

  // Handle creating a group (drag filter onto grouping icon)
  const handleGroupFilter = useCallback((draggedId: string, baseFilterId: string) => {
    const draggedFilter = filters.find(f => f.id === draggedId);
    const baseFilter = filters.find(f => f.id === baseFilterId);
    
    if (!draggedFilter || !baseFilter) return;
    
    // Remove dragged filter from its current position
    const newFilters = filters.filter(f => f.id !== draggedId);
    // Find the base filter's position in the new array
    const baseIndex = newFilters.findIndex(f => f.id === baseFilterId);
    if (baseIndex === -1) return;
    
    // Update the dragged filter to be grouped
    const groupedFilter: FilterConfig = {
      ...draggedFilter,
      groupId: baseFilterId
    };
    
    // Update the base filter to include this filter in its group
    const updatedBaseFilter: FilterConfig = {
      ...baseFilter,
      groupedFilters: [draggedId, ...(baseFilter.groupedFilters || [])]
    };
    
    // Replace base filter with updated version
    newFilters[baseIndex] = updatedBaseFilter;
    // Insert grouped filter BEFORE the base filter (top of group)
    newFilters.splice(baseIndex, 0, groupedFilter);
    
    onReorderFilters(newFilters);
  }, [filters, onReorderFilters]);

  // Handle ungrouping (dragging filter out of group)
  const handleUngroupFilter = useCallback((filterId: string) => {
    const filterToUngroup = filters.find(f => f.id === filterId);
    if (!filterToUngroup || !filterToUngroup.groupId) return;
    
    const baseId = filterToUngroup.groupId;
    const baseFilter = filters.find(f => f.id === baseId);
    if (!baseFilter) return;
    
    // Check if trying to remove base filter from group
    const baseIndex = filters.findIndex(f => f.id === baseId);
    const childAboveBase = baseIndex > 0 ? filters[baseIndex - 1] : null;
    
    if (filterId === baseId) {
      const defAbove = childAboveBase ? FILTER_DEFINITIONS[childAboveBase.type] : null;
      if (childAboveBase && defAbove && defAbove.isBaseFilter) {
        const newFilters = filters.map(f => {
          if (f.id === baseId) {
            const updatedGrouped = baseFilter.groupedFilters?.filter(id => id !== baseId) || [];
            return { ...f, groupedFilters: updatedGrouped.length > 0 ? updatedGrouped : undefined };
          }
          if (baseFilter.groupedFilters?.includes(f.id)) {
            return { ...f, groupId: undefined };
          }
          return f;
        }).filter(f => f.id !== baseId);
        onReorderFilters(newFilters);
      } else {
        setErrorMessage('The bottom of the filter group must always be a base filter');
        setTimeout(() => setErrorMessage(null), 3000);
      }
      return;
    }
    
    const ungroupedFilter: FilterConfig = {
      ...filterToUngroup,
      groupId: undefined
    };
    
    const updatedGrouped = baseFilter.groupedFilters?.filter(id => id !== filterId) || [];
    const updatedBaseFilter: FilterConfig = {
      ...baseFilter,
      groupedFilters: updatedGrouped.length > 0 ? updatedGrouped : undefined
    };
    
    const newFilters = filters.map(f => {
      if (f.id === filterId) return ungroupedFilter;
      if (f.id === baseId) return updatedBaseFilter;
      return f;
    });
    
    onReorderFilters(newFilters);
  }, [filters, onReorderFilters]);

  // Handle adding filter to existing group (drag into group groove)
  const handleAddToGroup = useCallback((draggedId: string, baseFilterId: string, insertIndex: number) => {
    const draggedFilter = filters.find(f => f.id === draggedId);
    const baseFilter = filters.find(f => f.id === baseFilterId);
    
    if (!draggedFilter || !baseFilter) return;
    
    let newFilters = filters.filter(f => f.id !== draggedId);
    
    if (draggedFilter.groupId && draggedFilter.groupId !== baseFilterId) {
      newFilters = newFilters.map(f => {
        if (f.id === draggedFilter.groupId) {
          const updatedGrouped = f.groupedFilters?.filter(id => id !== draggedId) || [];
          return {
            ...f,
            groupedFilters: updatedGrouped.length > 0 ? updatedGrouped : undefined
          };
        }
        return f;
      });
    }
    
    const groupedFilter: FilterConfig = {
      ...draggedFilter,
      groupId: baseFilterId
    };
    
    const currentGrouped = baseFilter.groupedFilters || [];
    const updatedGrouped = [...currentGrouped];
    updatedGrouped.splice(insertIndex, 0, draggedId);
    
    const updatedBaseFilter: FilterConfig = {
      ...baseFilter,
      groupedFilters: updatedGrouped
    };
    
    const baseIndex = newFilters.findIndex(f => f.id === baseFilterId);
    if (baseIndex === -1) return;
    
    const existingChildren = currentGrouped.map(id => newFilters.findIndex(f => f.id === id)).filter(idx => idx >= 0).sort((a, b) => a - b);
    
    let insertPosition: number;
    if (existingChildren.length === 0) {
      insertPosition = baseIndex;
    } else if (insertIndex === 0) {
      insertPosition = existingChildren[0];
    } else if (insertIndex <= existingChildren.length) {
      const afterChildIndex = existingChildren[insertIndex - 1];
      insertPosition = afterChildIndex + 1;
    } else {
      insertPosition = baseIndex;
    }
    
    newFilters.splice(insertPosition, 0, groupedFilter);
    newFilters[newFilters.findIndex(f => f.id === baseFilterId)] = updatedBaseFilter;
    
    onReorderFilters(newFilters);
  }, [filters, onReorderFilters]);
  
  // GSAP drag hook
  const {
    dragState,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    isDragging,
    recalculatePositions
  } = useGsapDrag({
    items: visualFilters,
    onReorder: onReorderFilters,
    containerRef: filterListRef,
    isDisabled: linkState?.isSelecting || false,
    onGroupFilter: handleGroupFilter,
    onAddToGroup: handleAddToGroup,
    onUngroupFilter: handleUngroupFilter,
    onGroupHover: setGroupingHoverId,
    onMaskFilter: handleMaskFilter,
    onMaskHover: setMaskingHoverId,
    onError: (message: string) => {
      setErrorMessage(message);
      setTimeout(() => setErrorMessage(null), 3000);
    },
    onPreviewHover: (hoverIndex: number, originalIndex: number, draggingId: string) => {
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
      if (hoverIndex !== lastPreviewIndexRef.current) {
        lastPreviewIndexRef.current = hoverIndex;
        previewTimeoutRef.current = window.setTimeout(() => {
          if (hoverIndex === originalIndex) {
            onCancelPreview();
          } else {
            const draggedFilter = visualFilters.find(f => f.id === draggingId);
            const isDraggingGroup = draggedFilter && draggedFilter.groupedFilters && draggedFilter.groupedFilters.length > 0;
            
            const newFilters = [...visualFilters];
            
            if (isDraggingGroup && draggedFilter) {
              const groupMembers = [draggingId, ...(draggedFilter.groupedFilters || [])];
              const memberIds = new Set(groupMembers);
              const groupIndices = newFilters
                .map((f, i) => memberIds.has(f.id) ? i : -1)
                .filter(idx => idx >= 0)
                .sort((a, b) => a - b);
              
              const movingItems = groupIndices.map(i => newFilters[i]);
              
              [...groupIndices].reverse().forEach(idx => {
                newFilters.splice(idx, 1);
              });
              
              let insertAt = hoverIndex;
              const itemsBeforeInsert = groupIndices.filter(idx => idx < hoverIndex).length;
              insertAt -= itemsBeforeInsert;
              insertAt = Math.max(0, insertAt);
              
              newFilters.splice(insertAt, 0, ...movingItems);
            } else {
              const [removed] = newFilters.splice(originalIndex, 1);
              let insertAt = hoverIndex;
              if (originalIndex < insertAt) {
                insertAt--;
              }
              newFilters.splice(insertAt, 0, removed);
            }
            
            onPreviewReorder(newFilters);
          }
        }, 50);
      }
    },
    onCancelPreview: () => {
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
      lastPreviewIndexRef.current = -1;
      onCancelPreview();
    }
  });

  useEffect(() => {
    return () => {
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
    };
  }, []);

  const handleDropdownChange = useCallback((dropdown: {
    filterId: string;
    type: 'blend' | 'noise';
  } | null) => {
    setActiveDropdown(dropdown);
  }, []);

  const filterSections = [{
    filters: ['glow', 'noise', 'blur'] as FilterType[]
  }, {
    filters: ['levels', 'colorTone', 'cmyk'] as FilterType[]
  }, {
    filters: ['pattern', 'mosaic', 'vsyncTears', 'chromaticAberration', 'duplicateLayer'] as FilterType[]
  }];

  useEffect(() => {
    const currentIds = new Set(filters.map(f => f.id));
    const previousIds = previousFilterIdsRef.current;
    const newFilterIds = filters.filter(f => !previousIds.has(f.id)).map(f => f.id);
    if (newFilterIds.length > 0) {
      setExpandedFilters(prev => {
        const newSet = new Set(prev);
        newFilterIds.forEach(id => newSet.add(id));
        return newSet;
      });
    }
    previousFilterIdsRef.current = currentIds;
  }, [filters]);

  useEffect(() => {
    if (!linkState?.isSelecting) return;
    const handleMouseMove = (e: MouseEvent) => {
      setLinkState(prev => prev ? {
        ...prev,
        cursorPosition: {
          x: e.clientX,
          y: e.clientY
        }
      } : null);
    };
    const handleScroll = () => {
      setLinkState(prev => prev ? { ...prev } : null);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLinkState(null);
        setExpandedFilters(new Set(filters.map(f => f.id)));
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-filter-card]')) {
        setLinkState(null);
        setExpandedFilters(new Set(filters.map(f => f.id)));
      }
    };
    const scrollContainer = pipelineRef.current?.parentElement;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('click', handleClickOutside);
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('click', handleClickOutside);
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', handleScroll);
      }
    };
  }, [linkState?.isSelecting, filters]);

  const handleAddFilter = (type: FilterType) => {
    onAddFilter(type);
    setShowDropdown(false);
  };

  const handleDuplicateFilter = (id: string) => {
    const filterToDuplicate = filters.find(f => f.id === id);
    if (!filterToDuplicate) return;
    const newFilter: FilterConfig = {
      ...filterToDuplicate,
      id: `${filterToDuplicate.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      params: { ...filterToDuplicate.params },
      ...(filterToDuplicate.colorToneParams && {
        colorToneParams: JSON.parse(JSON.stringify(filterToDuplicate.colorToneParams))
      }),
      ...(filterToDuplicate.glowParams && {
        glowParams: { ...filterToDuplicate.glowParams }
      }),
      ...(filterToDuplicate.patternImage && {
        patternImage: filterToDuplicate.patternImage
      }),
      linkedDimensions: [],
      groupId: undefined,
      groupedFilters: undefined
    };
    const newFilters = [newFilter, ...filters];
    onReorderFilters(newFilters);
  };

  const handleStartLinking = (sourceId: string) => {
    const sourceFilter = filters.find(f => f.id === sourceId);
    if (!sourceFilter) return;
    const linkableFilters = filters.filter(f => {
      if (f.id === sourceId) return false;
      if (sourceFilter.type === 'pattern') return f.type === 'mosaic' || f.type === 'pattern';
      if (sourceFilter.type === 'mosaic') return f.type === 'pattern' || f.type === 'mosaic';
      return false;
    });
    if (linkableFilters.length === 1) {
      onLinkDimensions(sourceId, linkableFilters[0].id);
      return;
    }
    if (linkableFilters.length > 1) {
      setLinkState({
        sourceFilterId: sourceId,
        isSelecting: true,
        cursorPosition: null
      });
      const linkableIds = new Set(linkableFilters.map(f => f.id));
      linkableIds.add(sourceId);
      setExpandedFilters(linkableIds);
    }
  };

  const handleSelectLinkTarget = (targetId: string) => {
    if (!linkState) return;
    onLinkDimensions(linkState.sourceFilterId, targetId);
    setLinkState(null);
    setExpandedFilters(new Set(filters.map(f => f.id)));
  };

  const toggleAllFilters = () => {
    const allEnabled = filters.every(f => f.enabled);
    filters.forEach(f => {
      if (allEnabled && f.enabled) {
        onToggleFilterEnabled(f.id);
      } else if (!allEnabled && !f.enabled) {
        onToggleFilterEnabled(f.id);
      }
    });
  };

  const expandCollapseAll = () => {
    if (expandedFilters.size === filters.length) {
      setExpandedFilters(new Set());
    } else {
      setExpandedFilters(new Set(filters.map(f => f.id)));
    }
  };

  const toggleFilterExpanded = (id: string) => {
    setExpandedFilters(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    if (isDragging) {
      requestAnimationFrame(() => {
        recalculatePositions();
      });
    }
  };

  const removeFilter = useCallback((id: string) => {
    const filterToRemove = filters.find(f => f.id === id);
    if (!filterToRemove) return;
    let updatedFilters = [...filters];
    
    if (filterToRemove.groupedFilters && filterToRemove.groupedFilters.length > 0) {
      updatedFilters = updatedFilters.map(f => {
        if (filterToRemove.groupedFilters!.includes(f.id)) {
          return { ...f, groupId: undefined };
        }
        return f;
      });
    }
    if (filterToRemove.groupId) {
      updatedFilters = updatedFilters.map(f => {
        if (f.id === filterToRemove.groupId) {
          const updatedGrouped = f.groupedFilters?.filter(gId => gId !== id) || [];
          return { ...f, groupedFilters: updatedGrouped.length > 0 ? updatedGrouped : undefined };
        }
        return f;
      });
    }
    if (filterToRemove.linkedDimensions && filterToRemove.linkedDimensions.length > 0) {
      updatedFilters = updatedFilters.map(f => {
        if (f.linkedDimensions?.includes(id)) {
          return { ...f, linkedDimensions: f.linkedDimensions.filter(linkedId => linkedId !== id) };
        }
        return f;
      });
    }
    updatedFilters = updatedFilters.filter(f => f.id !== id);
    onReorderFilters(updatedFilters);
  }, [filters, onReorderFilters]);

  const allEnabled = filters.every(f => f.enabled);
  const allExpanded = expandedFilters.size === filters.length;

  const getFilterCount = (type: FilterType) => {
    const filtersOfType = filters.filter(f => f.type === type);
    const visible = filtersOfType.filter(f => f.enabled).length;
    const hidden = filtersOfType.filter(f => !f.enabled).length;
    if (visible === 0 && hidden === 0) return null;
    if (visible === 0) {
      return <div className="flex items-center gap-1"><EyeOffIcon className="w-3 h-3" /><span>{hidden}</span></div>;
    }
    if (hidden > 0) {
      return (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1"><EyeIcon className="w-3 h-3" /><span>{visible}</span></div>
          <div className="flex items-center gap-1"><EyeOffIcon className="w-3 h-3" /><span>{hidden}</span></div>
        </div>
      );
    }
    return <div className="flex items-center gap-1"><EyeIcon className="w-3 h-3" /><span>{visible}</span></div>;
  };

  const getLinkableFilters = (filterId: string) => {
    const filter = filters.find(f => f.id === filterId);
    if (!filter) return [];
    return filters.filter(f => {
      if (f.id === filterId) return false;
      if (filter.type === 'pattern') return f.type === 'mosaic' || f.type === 'pattern';
      if (filter.type === 'mosaic') return f.type === 'pattern' || f.type === 'mosaic';
      return false;
    });
  };

  const canLink = (filterId: string) => getLinkableFilters(filterId).length > 0;

  const isLinkable = (filterId: string) => {
    if (!linkState?.isSelecting) return false;
    const sourceFilter = filters.find(f => f.id === linkState.sourceFilterId);
    const targetFilter = filters.find(f => f.id === filterId);
    if (!sourceFilter || !targetFilter || filterId === linkState.sourceFilterId) return false;
    if (sourceFilter.linkedDimensions?.includes(filterId)) return false;
    if (sourceFilter.type === 'pattern') return targetFilter.type === 'mosaic' || targetFilter.type === 'pattern';
    if (sourceFilter.type === 'mosaic') return targetFilter.type === 'pattern' || targetFilter.type === 'mosaic';
    return false;
  };

  const isAlreadyLinked = (filterId: string) => {
    if (!linkState?.isSelecting) return false;
    const sourceFilter = filters.find(f => f.id === linkState.sourceFilterId);
    return sourceFilter?.linkedDimensions?.includes(filterId) || false;
  };

  const isIneligible = (filterId: string) => {
    if (!linkState?.isSelecting) return false;
    if (filterId === linkState.sourceFilterId) return false;
    const sourceFilter = filters.find(f => f.id === linkState.sourceFilterId);
    const targetFilter = filters.find(f => f.id === filterId);
    if (!sourceFilter || !targetFilter) return false;
    if (sourceFilter.linkedDimensions?.includes(filterId)) return false;
    if (sourceFilter.type === 'pattern') return targetFilter.type !== 'mosaic' && targetFilter.type !== 'pattern';
    if (sourceFilter.type === 'mosaic') return targetFilter.type !== 'pattern' && targetFilter.type !== 'mosaic';
    return true;
  };

  const handleUpdateFilterWithSync = (id: string, params: Record<string, number>) => {
    const filter = filters.find(f => f.id === id);
    onUpdateFilter(id, params);
    if (filter?.linkedDimensions && filter.linkedDimensions.length > 0) {
      const widthChanged = params.width !== undefined && params.width !== filter.params.width;
      const heightChanged = params.height !== undefined && params.height !== filter.params.height;
      if (widthChanged || heightChanged) {
        filter.linkedDimensions.forEach(linkedId => {
          const linkedFilter = filters.find(f => f.id === linkedId);
          if (linkedFilter) {
            onUpdateFilter(linkedId, {
              ...linkedFilter.params,
              ...(widthChanged && { width: params.width }),
              ...(heightChanged && { height: params.height })
            });
          }
        });
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-white relative" ref={pipelineRef}>
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md pt-4 pb-4">
        <div className="px-6">
          <div className="relative">
            <button onClick={() => setShowDropdown(!showDropdown)} className="w-full px-3 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-left transition-all flex items-center justify-between group shadow-sm">
              <span className="text-sm text-slate-700 group-hover:text-slate-900 flex items-center gap-2 font-medium">
                <PlusIcon className="w-4 h-4" />
                Add Filter
              </span>
              <ChevronDownIcon className={`w-4 h-4 text-slate-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showDropdown && <>
                <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 shadow-xl z-20 overflow-hidden">
                  {filterSections.map((section, sectionIndex) => <div key={sectionIndex}>
                      {section.filters.map(type => {
                  const def = FILTER_DEFINITIONS[type];
                  const countDisplay = getFilterCount(type);
                  return <button key={type} onClick={() => handleAddFilter(type)} className="w-full text-left px-3 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
                            <div className="flex items-start justify-between gap-2 mb-0.5">
                              <div className="text-sm font-medium text-slate-900">
                                {def.name}
                              </div>
                              {countDisplay && <div className="text-xs text-slate-400 whitespace-nowrap flex-shrink-0">
                                  {countDisplay}
                                </div>}
                            </div>
                            <div className="text-xs text-slate-500">
                              {def.description}
                            </div>
                          </button>;
                })}
                      {sectionIndex < filterSections.length - 1 && <div className="border-t border-slate-100" />}
                    </div>)}
                </div>
              </>}
          </div>
        </div>
      </div>

      {filters.length > 0 && (
        <div className="relative mb-4 mt-4">
          <div className="flex items-center justify-end mb-3 px-6">
            {/* Toggle buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={toggleAllFilters}
                className="p-1.5 rounded hover:bg-slate-100 transition-colors"
                title={allEnabled ? 'Disable all filters' : 'Enable all filters'}
              >
                {allEnabled ? <EyeOffIcon className="w-4 h-4 text-slate-500" /> : <EyeIcon className="w-4 h-4 text-slate-500" />}
              </button>

              <button
                onClick={expandCollapseAll}
                className="p-1.5 rounded hover:bg-slate-100 transition-colors"
                title={allExpanded ? 'Collapse all filters' : 'Expand all filters'}
              >
                {allExpanded ? <ChevronsUpIcon className="w-4 h-4 text-slate-500" /> : <ChevronsDownIcon className="w-4 h-4 text-slate-500" />}
              </button>
            </div>
          </div>

          <div className="space-y-2 relative" ref={filterListRef}>
            {/* SVG overlay for connection lines - use fixed positioning for cursor line */}
            {linkState?.isSelecting && linkState.cursorPosition && pipelineRef.current && (
              <svg className="fixed inset-0 w-full h-full pointer-events-none" style={{ zIndex: 100 }}>
                {(() => {
                  const sourceEl = document.querySelector(`[data-filter-id="${linkState.sourceFilterId}"]`);
                  if (!sourceEl) return null;
                  const linkButton = sourceEl.querySelector('button[title="Link dimensions"]');
                  if (!linkButton) return null;
                  const buttonRect = linkButton.getBoundingClientRect();
                  const x1 = buttonRect.left + buttonRect.width / 2;
                  const y1 = buttonRect.top + buttonRect.height / 2;
                  const x2 = linkState.cursorPosition.x;
                  const y2 = linkState.cursorPosition.y;
                  const path = `M ${x1} ${y1} L ${x2} ${y2}`;
                  return <path d={path} stroke="rgb(37, 99, 235)" strokeWidth="2" fill="none" strokeDasharray="4,4" opacity="0.8" />;
                })()}
              </svg>
            )}

            {/* SVG for static connection lines between linked filters */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
              {filters.map(filter => {
                if (!filter.linkedDimensions || filter.linkedDimensions.length === 0) return null;
                return filter.linkedDimensions.map(linkedId => {
                  const sourceEl = document.querySelector(`[data-filter-id="${filter.id}"]`);
                  const targetEl = document.querySelector(`[data-filter-id="${linkedId}"]`);
                  if (!sourceEl || !targetEl || !pipelineRef.current) return null;
                  const pipelineRect = pipelineRef.current.getBoundingClientRect();
                  const sourceRect = sourceEl.getBoundingClientRect();
                  const targetRect = targetEl.getBoundingClientRect();
                  const x1 = sourceRect.left + sourceRect.width / 2 - pipelineRect.left;
                  const y1 = sourceRect.top + sourceRect.height / 2 - pipelineRect.top;
                  const x2 = targetRect.left + targetRect.width / 2 - pipelineRect.left;
                  const y2 = targetRect.top + targetRect.height / 2 - pipelineRect.top;
                  const midY = (y1 + y2) / 2;
                  const path = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
                  return (
                    <g key={`${filter.id}-${linkedId}`}>
                      <defs>
                        <linearGradient id={`gradient-${filter.id}-${linkedId}`} x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="rgb(37, 99, 235)" stopOpacity="0.6" />
                          <stop offset="100%" stopColor="rgb(29, 78, 216)" stopOpacity="0.6" />
                        </linearGradient>
                      </defs>
                      <path d={path} stroke={`url(#gradient-${filter.id}-${linkedId})`} strokeWidth="2" fill="none" strokeDasharray="5,5" className="animate-pulse" />
                    </g>
                  );
                });
              })}
            </svg>

            {/* Overlay to block interactions during linking mode */}
            {linkState?.isSelecting && <div className="absolute inset-0 z-10" style={{ pointerEvents: 'none' }} />}

            {/* Render Filters */}
            {(() => {
              const result: JSX.Element[] = [];
              let currentGroupItems: FilterConfig[] = [];
              let currentGroupBaseId: string | null = null;
              let currentMaskingId: string | null = null;
              let currentMaskedId: string | null = null;
              let currentMaskItems: JSX.Element[] = [];

              const pushToContainer = (el: JSX.Element) => {
                if (currentMaskingId) {
                  currentMaskItems.push(el);
                } else {
                  result.push(el);
                }
              };

              displayGroups.forEach((item) => {
                if (item.type === 'mask-start') {
                  currentMaskingId = item.maskingId;
                  currentMaskedId = item.maskedId;
                  currentMaskItems = [];
                } else if (item.type === 'mask-end') {
                  if (currentMaskingId && currentMaskedId) {
                    const maskingId = currentMaskingId;
                    const maskedId = currentMaskedId;
                    const actualIndex = visualFilters.findIndex(f => f.id === maskingId);
                    
                    // The mask's furniture should be hidden if the mask itself is being dragged,
                    // OR if the filter/group being masked is being dragged.
                    const isMaskOrChildBeingDragged = dragState.draggingId === maskingId || dragState.draggingId === maskedId;

                    result.push(
                      <div
                        key={`mask-container-${maskingId}`}
                        className="my-4 relative mx-3 p-3 pt-8"
                        data-mask-container
                        data-mask-masking={maskingId}
                        data-mask-masked={maskedId}
                      >
                        {/* Masking border box - consistent with group container styling */}
                        <div 
                          className={`absolute inset-0 border-2 border-purple-500/40 rounded-xl pointer-events-none ${isMaskOrChildBeingDragged ? 'opacity-0' : 'opacity-100'}`} 
                          data-mask-border 
                        />

                        {/* Top handle for mask drag */}
                        <div 
                          onPointerDown={e => handleDragStart(e, maskingId, actualIndex)}
                          className={`absolute top-0 left-0 right-8 h-8 flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-purple-50 transition-colors z-20 group/mask-handle rounded-t-xl ${isMaskOrChildBeingDragged ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                          data-mask-handle
                        >
                          <GripHorizontalIcon className="w-5 h-5 text-purple-500/50 group-hover/mask-handle:text-purple-600 transition-colors" />
                        </div>
                        {/* Disband button - top right */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUnlinkMask(maskingId);
                          }}
                          className={`absolute top-0 right-0 h-8 w-8 flex items-center justify-center rounded-tr-xl hover:bg-purple-100 transition-colors z-30 group/disband ${isMaskOrChildBeingDragged ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                          title="Unlink mask"
                        >
                          <XIcon className="w-4 h-4 text-purple-600/70 group-hover/disband:text-purple-700 transition-colors" />
                        </button>
                        
                        <div className="space-y-2 relative z-10">
                          {currentMaskItems}
                        </div>
                      </div>
                    );
                  }
                  currentMaskingId = null;
                  currentMaskedId = null;
                  currentMaskItems = [];
                } else if (item.type === 'group-start') {
                  currentGroupBaseId = item.baseId;
                  currentGroupItems = [];
                } else if (item.type === 'group-end') {
                  if (currentGroupBaseId && currentGroupItems.length > 0) {
                    const baseFilterId = currentGroupBaseId;
                    const baseActualIndex = visualFilters.findIndex(f => f.id === baseFilterId);
                    
                    // A group's border should be hidden if the group itself is being dragged,
                    // OR if the mask container it belongs to is being dragged.
                    const isGroupOrParentBeingDragged = dragState.draggingId === baseFilterId || (!!currentMaskingId && dragState.draggingId === currentMaskingId);

                    pushToContainer(
                      <div
                        key={`group-container-${currentGroupBaseId}`}
                        className={`my-4 relative p-3 pt-8 ${currentMaskingId ? '' : 'mx-3'}`}
                        data-group-container
                        data-group-base={currentGroupBaseId}
                      >
                        <div 
                          className={`absolute inset-0 border-2 border-blue-500/30 pointer-events-none ${isGroupOrParentBeingDragged ? 'opacity-0' : 'opacity-100'}`} 
                          data-group-border 
                        />
                        <div 
                          onPointerDown={e => handleDragStart(e, baseFilterId, baseActualIndex)}
                          className={`absolute top-0 left-0 right-8 h-8 flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-blue-50 transition-colors z-20 group/handle ${isGroupOrParentBeingDragged ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                          data-group-handle
                        >
                          <GripHorizontalIcon className="w-5 h-5 text-blue-500/50 group-hover/handle:text-blue-600 transition-colors" />
                        </div>
                        {/* Disband button - top right */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDisbandGroup(baseFilterId);
                          }}
                          className={`absolute top-0 right-0 h-8 w-8 flex items-center justify-center hover:bg-blue-100 transition-colors z-30 group/disband ${isGroupOrParentBeingDragged ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                          title="Disband group"
                        >
                          <XIcon className="w-4 h-4 text-blue-600/70 group-hover/disband:text-blue-700 transition-colors" />
                        </button>
                        <div className="space-y-2 relative z-10" data-group-content>
                          {currentGroupItems.map((filter) => {
                            const actualIndex = visualFilters.findIndex(f => f.id === filter.id);
                            const definition = FILTER_DEFINITIONS[filter.type];
                            const isGrouped = !!filter.groupId;
                            const hasGroupedFilters = filters.some(f => f.groupId === filter.id);
                            const isGroupingHovered = groupingHoverId === filter.id;
                            const isMaskingHovered = maskingHoverId === filter.id;
                            
                            return (
                              <div key={filter.id} data-filter-row data-filter-id={filter.id} className="relative" style={{ zIndex: activeDropdown?.filterId === filter.id ? 9998 : isLinkable(filter.id) && linkState?.isSelecting ? 20 : 2 }}>
                                <FilterCard 
                                  filter={filter} 
                                  definition={definition} 
                                  index={actualIndex} 
                                  totalFilters={filters.length} 
                                  onUpdate={handleUpdateFilterWithSync} 
                                  onUpdatePatternImage={onUpdatePatternImage} 
                                  onUpdateBlendMode={onUpdateBlendMode} 
                                  onPreviewBlendMode={onPreviewBlendMode} 
                                  onUpdateNoiseType={onUpdateNoiseType} 
                                  onPreviewNoiseType={onPreviewNoiseType} 
                                  onUpdateColorTone={onUpdateColorTone} 
                                  onUpdateColorChannel={onUpdateColorChannel} 
                                  onUpdateGlow={onUpdateGlow} 
                                  onUpdateVSyncTears={onUpdateVSyncTears} 
                                  onUpdateChromaticAberration={onUpdateChromaticAberration} 
                                  onUpdateDuplicateLayer={onUpdateDuplicateLayer} 
                                  onUpdatePattern={onUpdatePattern}
                                  onToggleEnabled={onToggleFilterEnabled} 
                                  onRemove={removeFilter} 
                                  onDuplicate={handleDuplicateFilter} 
                                  onDragStart={e => handleDragStart(e, filter.id, actualIndex)} 
                                  onDragMove={handleDragMove} 
                                  onDragEnd={handleDragEnd} 
                                  isDragging={dragState.draggingId === filter.id} 
                                  canvasRef={canvasRef} 
                                  isExpanded={expandedFilters.has(filter.id)} 
                                  onToggleExpanded={() => toggleFilterExpanded(filter.id)} 
                                  canLinkDimensions={canLink(filter.id)} 
                                  onStartLinking={() => handleStartLinking(filter.id)} 
                                  onSelectLinkTarget={() => handleSelectLinkTarget(filter.id)} 
                                  onUnlinkDimensions={onUnlinkDimensions} 
                                  isLinkable={isLinkable(filter.id)} 
                                  isLinkingMode={linkState?.isSelecting || false} 
                                  isAlreadyLinked={isAlreadyLinked(filter.id)} 
                                  isIneligible={isIneligible(filter.id)} 
                                  allFilters={filters} 
                                  activeDropdown={activeDropdown} 
                                  onDropdownChange={handleDropdownChange}
                                  isGroupingHovered={isGroupingHovered}
                                  isMaskingHovered={isMaskingHovered}
                                  isGrouped={isGrouped}
                                  hasGroupedFilters={hasGroupedFilters}
                                  onMaskFilter={handleMaskFilter}
                                  onMaskHover={setMaskingHoverId}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }
                  currentGroupBaseId = null;
                } else if (currentGroupBaseId) {
                  currentGroupItems.push(item as FilterConfig);
                } else {
                  const filter = item as FilterConfig;
                  const actualIndex = visualFilters.findIndex(f => f.id === filter.id);
                  const definition = FILTER_DEFINITIONS[filter.type];
                  const isGrouped = !!filter.groupId;
                  const hasGroupedFilters = filters.some(f => f.groupId === filter.id);
                  const isGroupingHovered = groupingHoverId === filter.id;
                  const isMaskingHovered = maskingHoverId === filter.id;
                  
                  pushToContainer(
                    <div key={filter.id} data-filter-row data-filter-id={filter.id} className={`relative ${currentMaskingId ? '' : 'mx-6'}`} style={{ zIndex: activeDropdown?.filterId === filter.id ? 9998 : isLinkable(filter.id) && linkState?.isSelecting ? 20 : 2 }}>
                      <FilterCard 
                        filter={filter} 
                        definition={definition} 
                        index={actualIndex} 
                        totalFilters={filters.length} 
                        onUpdate={handleUpdateFilterWithSync} 
                        onUpdatePatternImage={onUpdatePatternImage} 
                        onUpdateBlendMode={onUpdateBlendMode} 
                        onPreviewBlendMode={onPreviewBlendMode} 
                        onUpdateNoiseType={onUpdateNoiseType} 
                        onPreviewNoiseType={onPreviewNoiseType} 
                        onUpdateColorTone={onUpdateColorTone} 
                        onUpdateColorChannel={onUpdateColorChannel} 
                        onUpdateGlow={onUpdateGlow} 
                        onUpdateVSyncTears={onUpdateVSyncTears} 
                        onUpdateChromaticAberration={onUpdateChromaticAberration} 
                        onUpdateDuplicateLayer={onUpdateDuplicateLayer} 
                        onUpdatePattern={onUpdatePattern}
                        onToggleEnabled={onToggleFilterEnabled} 
                        onRemove={removeFilter} 
                        onDuplicate={handleDuplicateFilter} 
                        onDragStart={e => handleDragStart(e, filter.id, actualIndex)} 
                        onDragMove={handleDragMove} 
                        onDragEnd={handleDragEnd} 
                        isDragging={dragState.draggingId === filter.id} 
                        canvasRef={canvasRef} 
                        isExpanded={expandedFilters.has(filter.id)} 
                        onToggleExpanded={() => toggleFilterExpanded(filter.id)} 
                        canLinkDimensions={canLink(filter.id)} 
                        onStartLinking={() => handleStartLinking(filter.id)} 
                        onSelectLinkTarget={() => handleSelectLinkTarget(filter.id)} 
                        onUnlinkDimensions={onUnlinkDimensions} 
                        isLinkable={isLinkable(filter.id)} 
                        isLinkingMode={linkState?.isSelecting || false} 
                        isAlreadyLinked={isAlreadyLinked(filter.id)} 
                        isIneligible={isIneligible(filter.id)} 
                        allFilters={filters} 
                        activeDropdown={activeDropdown} 
                        onDropdownChange={handleDropdownChange}
                        isGroupingHovered={isGroupingHovered}
                        isMaskingHovered={isMaskingHovered}
                        isGrouped={isGrouped}
                        hasGroupedFilters={hasGroupedFilters}
                        onMaskFilter={handleMaskFilter}
                        onMaskHover={setMaskingHoverId}
                      />
                    </div>
                  );
                }
              });

              return result;
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
