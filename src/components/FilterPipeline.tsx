import React, { useCallback, useEffect, useState, useRef } from 'react';
import { PlusIcon, ChevronDownIcon, EyeIcon, EyeOffIcon, ChevronsUpIcon, ChevronsDownIcon } from 'lucide-react';
import { FilterConfig, FilterType, BlendMode, NoiseType, ColorChannel, ColorToneParams, GlowParams, VSyncTearsParams, ChromaticAberrationParams, DuplicateLayerParams } from '../types';
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
  const previousFilterIdsRef = useRef<Set<string>>(new Set());
  const pipelineRef = useRef<HTMLDivElement>(null);
  const filterListRef = useRef<HTMLDivElement>(null);
  // Preview state
  const previewTimeoutRef = useRef<number>();
  const lastPreviewIndexRef = useRef<number>(-1);
  
  // Organize filters into groups: children on top, base at bottom
  const displayGroups = React.useMemo(() => {
    const result: (FilterConfig | { type: 'group-start'; baseId: string } | { type: 'group-end'; baseId: string })[] = [];
    const processed = new Set<string>();
    
    // Build a map of base filters to their children
    const baseToChildren = new Map<string, FilterConfig[]>();
    filters.forEach(f => {
      if (f.groupId) {
        if (!baseToChildren.has(f.groupId)) {
          baseToChildren.set(f.groupId, []);
        }
        baseToChildren.get(f.groupId)!.push(f);
      }
    });
    
    // Sort children by their order in the original filters array
    baseToChildren.forEach((children) => {
      children.sort((a, b) => {
        const aIdx = filters.findIndex(f => f.id === a.id);
        const bIdx = filters.findIndex(f => f.id === b.id);
        return aIdx - bIdx;
      });
    });
    
    // Process filters in order, handling groups and standalone filters
    for (const filter of filters) {
      if (processed.has(filter.id)) continue;
      
      const def = FILTER_DEFINITIONS[filter.type];
      const children = baseToChildren.get(filter.id);
      const isBaseWithChildren = children && children.length > 0;
      const canBeBase = !!(def.isBaseFilter) && !filter.groupId;
      
      if (isBaseWithChildren && canBeBase) {
        // Add group start marker
        result.push({ type: 'group-start', baseId: filter.id });
        
        // Add child filters first (they're already sorted)
        for (const child of children) {
          if (!processed.has(child.id)) {
            result.push(child);
            processed.add(child.id);
          }
        }
        
        // Add base filter at bottom
        if (!processed.has(filter.id)) {
          result.push(filter);
          processed.add(filter.id);
        }
        
        // Add group end marker
        result.push({ type: 'group-end', baseId: filter.id });
      } else if (!filter.groupId) {
        // Standalone filter (not a child of any group)
        result.push(filter);
        processed.add(filter.id);
      }
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
      // Only allow if the filter above it is also a base filter
      const baseIndex = filters.findIndex(f => f.id === baseId);
      const childAboveBase = baseIndex > 0 ? filters[baseIndex - 1] : null;
      
      if (filterId === baseId) {
        // Trying to remove base filter from its own group
        const defAbove = childAboveBase ? FILTER_DEFINITIONS[childAboveBase.type] : null;
        if (childAboveBase && defAbove && defAbove.isBaseFilter) {
        // Child above is a base filter, can remove
        const newFilters = filters.map(f => {
          if (f.id === baseId) {
            return { ...f, groupedFilters: baseFilter.groupedFilters?.filter(id => id !== baseId) };
          }
          if (baseFilter.groupedFilters?.includes(f.id)) {
            return { ...f, groupId: undefined };
          }
          return f;
        }).filter(f => f.id !== baseId);
        onReorderFilters(newFilters);
      } else {
        // Show error message
        setErrorMessage('The bottom of the filter group must always be a base filter');
        setTimeout(() => setErrorMessage(null), 3000);
      }
      return;
    }
    
    // Remove groupId from the filter
    const ungroupedFilter: FilterConfig = {
      ...filterToUngroup,
      groupId: undefined
    };
    
    // Remove filter from base filter's groupedFilters array
    const updatedBaseFilter: FilterConfig = {
      ...baseFilter,
      groupedFilters: baseFilter.groupedFilters?.filter(id => id !== filterId)
    };
    
    // Update filters array
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
    
    // Remove dragged filter from current position
    let newFilters = filters.filter(f => f.id !== draggedId);
    
    // If it was in another group, clean up that group's base filter
    if (draggedFilter.groupId && draggedFilter.groupId !== baseFilterId) {
      newFilters = newFilters.map(f => {
        if (f.id === draggedFilter.groupId) {
          return {
            ...f,
            groupedFilters: f.groupedFilters?.filter(id => id !== draggedId)
          };
        }
        return f;
      });
    }
    
    // Update dragged filter to be grouped
    const groupedFilter: FilterConfig = {
      ...draggedFilter,
      groupId: baseFilterId
    };
    
    // Update base filter's groupedFilters
    const currentGrouped = baseFilter.groupedFilters || [];
    const updatedGrouped = [...currentGrouped];
    updatedGrouped.splice(insertIndex, 0, draggedId);
    
    const updatedBaseFilter: FilterConfig = {
      ...baseFilter,
      groupedFilters: updatedGrouped
    };
    
    // Find base filter position in new array (after removing dragged filter)
    const baseIndex = newFilters.findIndex(f => f.id === baseFilterId);
    if (baseIndex === -1) return;
    
    // Find existing children positions to determine where to insert
    // insertIndex from useGsapDrag is 0-indexed DOM position within the group:
    // - insertIndex 0 = above first child (top of group)
    // - insertIndex 1 = after first child, before second child
    // - insertIndex N = after Nth child, before (N+1)th child or base
    const existingChildren = currentGrouped.map(id => newFilters.findIndex(f => f.id === id)).filter(idx => idx >= 0).sort((a, b) => a - b);
    
    let insertPosition: number;
    if (existingChildren.length === 0) {
      // No existing children, insert right before base
      insertPosition = baseIndex;
    } else if (insertIndex === 0) {
      // Insert at the very top, before the first child
      insertPosition = existingChildren[0];
    } else if (insertIndex <= existingChildren.length) {
      // Insert after the (insertIndex - 1)th child
      const afterChildIndex = existingChildren[insertIndex - 1];
      insertPosition = afterChildIndex + 1;
    } else {
      // Insert right before base as fallback (at the bottom)
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
    onError: (message: string) => {
      setErrorMessage(message);
      setTimeout(() => setErrorMessage(null), 3000);
    },
    onPreviewHover: (hoverIndex: number, originalIndex: number, draggingId: string) => {
      // Clear existing timeout
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
      // If hovering over a new position (different from last preview)
      if (hoverIndex !== lastPreviewIndexRef.current) {
        lastPreviewIndexRef.current = hoverIndex;
        // Set timeout for preview
        previewTimeoutRef.current = window.setTimeout(() => {
          if (hoverIndex === originalIndex) {
            // Hovering over original position - cancel preview to show original order
            onCancelPreview();
          } else {
            // Hovering over new position - create preview order
            const draggedFilter = visualFilters.find(f => f.id === draggingId);
            const isDraggingGroup = draggedFilter && draggedFilter.groupedFilters && draggedFilter.groupedFilters.length > 0;
            
            const newFilters = [...visualFilters];
            
            if (isDraggingGroup && draggedFilter) {
              // Moving entire group - move all group members together in their visual order
              const groupMembers = [draggingId, ...(draggedFilter.groupedFilters || [])];
              // Use a Set to ensure uniqueness and find all relevant items in visualFilters
              const memberIds = new Set(groupMembers);
              const groupIndices = newFilters
                .map((f, i) => memberIds.has(f.id) ? i : -1)
                .filter(idx => idx >= 0)
                .sort((a, b) => a - b);
              
              const movingItems = groupIndices.map(i => newFilters[i]);
              
              // Remove all group members from back to front to preserve indices
              [...groupIndices].reverse().forEach(idx => {
                newFilters.splice(idx, 1);
              });
              
              // Calculate insert position
              let insertAt = hoverIndex;
              // Adjust for removed items before the insert point
              const itemsBeforeInsert = groupIndices.filter(idx => idx < hoverIndex).length;
              insertAt -= itemsBeforeInsert;
              insertAt = Math.max(0, insertAt);
              
              // Insert all group members at once in their original order
              newFilters.splice(insertAt, 0, ...movingItems);
            } else {
              // Single filter move
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
      // Clear timeout and cancel preview
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
      lastPreviewIndexRef.current = -1;
      onCancelPreview();
    }
  });
  // Cleanup preview timeout on unmount
  useEffect(() => {
    return () => {
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
    };
  }, []);
  // Memoize the dropdown change handler to prevent unnecessary re-renders
  const handleDropdownChange = useCallback((dropdown: {
    filterId: string;
    type: 'blend' | 'noise';
  } | null) => {
    setActiveDropdown(dropdown);
  }, []);
  // Define filter sections
  const filterSections = [{
    filters: ['glow', 'noise', 'blur'] as FilterType[]
  }, {
    filters: ['levels', 'colorTone', 'cmyk'] as FilterType[]
  }, {
    filters: ['pattern', 'mosaic', 'vsyncTears', 'chromaticAberration', 'duplicateLayer'] as FilterType[]
  }];
  // Track new filters and auto-expand only them
  useEffect(() => {
    const currentIds = new Set(filters.map(f => f.id));
    const previousIds = previousFilterIdsRef.current;
    // Find newly added filters (in current but not in previous)
    const newFilterIds = filters.filter(f => !previousIds.has(f.id)).map(f => f.id);
    if (newFilterIds.length > 0) {
      setExpandedFilters(prev => {
        const newSet = new Set(prev);
        newFilterIds.forEach(id => newSet.add(id));
        return newSet;
      });
    }
    // Update the ref for next comparison
    previousFilterIdsRef.current = currentIds;
  }, [filters]);
  // Handle mouse move for link line
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
      // Force a re-render by updating the link state
      setLinkState(prev => prev ? {
        ...prev
      } : null);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLinkState(null);
        // Re-expand all filters
        setExpandedFilters(new Set(filters.map(f => f.id)));
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-filter-card]')) {
        setLinkState(null);
        // Re-expand all filters with stagger
        setExpandedFilters(new Set(filters.map(f => f.id)));
      }
    };
    // Get the scrollable container
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
      params: {
        ...filterToDuplicate.params
      },
      ...(filterToDuplicate.colorToneParams && {
        colorToneParams: JSON.parse(JSON.stringify(filterToDuplicate.colorToneParams))
      }),
      ...(filterToDuplicate.glowParams && {
        glowParams: {
          ...filterToDuplicate.glowParams
        }
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
    // Get linkable filters
    const linkableFilters = filters.filter(f => {
      if (f.id === sourceId) return false;
      if (sourceFilter.type === 'pattern') return f.type === 'mosaic' || f.type === 'pattern';
      if (sourceFilter.type === 'mosaic') return f.type === 'pattern' || f.type === 'mosaic';
      return false;
    });
    // If only one linkable filter, auto-link
    if (linkableFilters.length === 1) {
      onLinkDimensions(sourceId, linkableFilters[0].id);
      return;
    }
    // Otherwise, enter selection mode
    if (linkableFilters.length > 1) {
      setLinkState({
        sourceFilterId: sourceId,
        isSelecting: true,
        cursorPosition: null
      });
      // Collapse all non-linkable filters
      const linkableIds = new Set(linkableFilters.map(f => f.id));
      linkableIds.add(sourceId); // Keep source expanded
      setExpandedFilters(linkableIds);
    }
  };
  const handleSelectLinkTarget = (targetId: string) => {
    if (!linkState) return;
    onLinkDimensions(linkState.sourceFilterId, targetId);
    setLinkState(null);
    // Re-expand all filters
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
      // All expanded, collapse all
      setExpandedFilters(new Set());
    } else {
      // Some or none expanded, expand all
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
    // If currently dragging, recalculate positions after expansion state changes
    // Use requestAnimationFrame to ensure DOM has updated
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
    
    // Handle group cleanup
    // If removing a base filter with grouped filters, ungroup them
    if (filterToRemove.groupedFilters && filterToRemove.groupedFilters.length > 0) {
      updatedFilters = updatedFilters.map(f => {
        if (filterToRemove.groupedFilters!.includes(f.id)) {
          return {
            ...f,
            groupId: undefined
          };
        }
        return f;
      });
    }
    // If removing a grouped filter, remove it from the base filter's groupedFilters array
    if (filterToRemove.groupId) {
      updatedFilters = updatedFilters.map(f => {
        if (f.id === filterToRemove.groupId) {
          return {
            ...f,
            groupedFilters: f.groupedFilters?.filter(gId => gId !== id)
          };
        }
        return f;
      });
    }
    
    // Handle dimension linking cleanup
    if (filterToRemove.linkedDimensions && filterToRemove.linkedDimensions.length > 0) {
      updatedFilters = updatedFilters.map(f => {
        if (f.linkedDimensions?.includes(id)) {
          return {
            ...f,
            linkedDimensions: f.linkedDimensions.filter(linkedId => linkedId !== id)
          };
        }
        return f;
      });
    }
    // Remove the filter
    updatedFilters = updatedFilters.filter(f => f.id !== id);
    onReorderFilters(updatedFilters);
  }, [filters, onReorderFilters]);
  const allEnabled = filters.every(f => f.enabled);
  const allExpanded = expandedFilters.size === filters.length;
  // Count filters by type
  const getFilterCount = (type: FilterType) => {
    const filtersOfType = filters.filter(f => f.type === type);
    const visible = filtersOfType.filter(f => f.enabled).length;
    const hidden = filtersOfType.filter(f => !f.enabled).length;
    // Show nothing if no filters of this type
    if (visible === 0 && hidden === 0) return null;
    // If all filters are hidden, show only hidden count
    if (visible === 0) {
      return <div className="flex items-center gap-1">
          <EyeOffIcon className="w-3 h-3" />
          <span>{hidden}</span>
        </div>;
    }
    // If some are hidden, show both counts
    if (hidden > 0) {
      return <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <EyeIcon className="w-3 h-3" />
            <span>{visible}</span>
          </div>
          <div className="flex items-center gap-1">
            <EyeOffIcon className="w-3 h-3" />
            <span>{hidden}</span>
          </div>
        </div>;
    }
    // If all are visible, show only visible count
    return <div className="flex items-center gap-1">
        <EyeIcon className="w-3 h-3" />
        <span>{visible}</span>
      </div>;
  };
  // Get linkable filters for a given filter
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
  // Check if a filter can be linked
  const canLink = (filterId: string) => {
    return getLinkableFilters(filterId).length > 0;
  };
  // Check if a filter is linkable during selection mode
  const isLinkable = (filterId: string) => {
    if (!linkState?.isSelecting) return false;
    const sourceFilter = filters.find(f => f.id === linkState.sourceFilterId);
    const targetFilter = filters.find(f => f.id === filterId);
    if (!sourceFilter || !targetFilter || filterId === linkState.sourceFilterId) return false;
    // Check if already linked
    if (sourceFilter.linkedDimensions?.includes(filterId)) return false;
    if (sourceFilter.type === 'pattern') return targetFilter.type === 'mosaic' || targetFilter.type === 'pattern';
    if (sourceFilter.type === 'mosaic') return targetFilter.type === 'pattern' || targetFilter.type === 'mosaic';
    return false;
  };
  // Check if a filter is already linked to the source
  const isAlreadyLinked = (filterId: string) => {
    if (!linkState?.isSelecting) return false;
    const sourceFilter = filters.find(f => f.id === linkState.sourceFilterId);
    return sourceFilter?.linkedDimensions?.includes(filterId) || false;
  };
  // Check if a filter is ineligible (wrong type)
  const isIneligible = (filterId: string) => {
    if (!linkState?.isSelecting) return false;
    if (filterId === linkState.sourceFilterId) return false;
    const sourceFilter = filters.find(f => f.id === linkState.sourceFilterId);
    const targetFilter = filters.find(f => f.id === filterId);
    if (!sourceFilter || !targetFilter) return false;
    // Already linked filters are not ineligible, they're a separate state
    if (sourceFilter.linkedDimensions?.includes(filterId)) return false;
    // Check if wrong type
    if (sourceFilter.type === 'pattern') return targetFilter.type !== 'mosaic' && targetFilter.type !== 'pattern';
    if (sourceFilter.type === 'mosaic') return targetFilter.type !== 'pattern' && targetFilter.type !== 'mosaic';
    return true;
  };
  const handleUpdateFilterWithSync = (id: string, params: Record<string, number>) => {
    const filter = filters.find(f => f.id === id);
    // Update the filter
    onUpdateFilter(id, params);
    // If filter has linked dimensions and width/height changed, sync them
    if (filter?.linkedDimensions && filter.linkedDimensions.length > 0) {
      const widthChanged = params.width !== undefined && params.width !== filter.params.width;
      const heightChanged = params.height !== undefined && params.height !== filter.params.height;
      if (widthChanged || heightChanged) {
        // Update all linked filters
        filter.linkedDimensions.forEach(linkedId => {
          const linkedFilter = filters.find(f => f.id === linkedId);
          if (linkedFilter) {
            onUpdateFilter(linkedId, {
              ...linkedFilter.params,
              ...(widthChanged && {
                width: params.width
              }),
              ...(heightChanged && {
                height: params.height
              })
            });
          }
        });
      }
    }
  };
  return <div ref={pipelineRef}>
      {/* Cursor style for selection mode */}
      {linkState?.isSelecting && <style>{`
          * {
            cursor: crosshair !important;
          }
        `}</style>}

      {/* Cursor style for dragging */}
      {isDragging && <style>{`
          * {
            cursor: grabbing !important;
          }
        `}</style>}

      {/* Error Message */}
      {errorMessage && (
        <div className="fixed top-4 left-4 z-[10001] px-4 py-2 bg-red-600/90 backdrop-blur-sm border border-red-500 rounded-lg shadow-xl">
          <p className="text-sm font-medium text-white">{errorMessage}</p>
        </div>
      )}

      <div className="mb-6">
        <div className="relative">
          <button onClick={() => setShowDropdown(!showDropdown)} className="w-full px-3 py-2.5 bg-slate-800/40 hover:bg-slate-700/50 border border-slate-700/50 hover:border-slate-600/50 rounded-lg text-left transition-all flex items-center justify-between group">
            <span className="text-sm text-slate-300 group-hover:text-slate-200 flex items-center gap-2">
              <PlusIcon className="w-4 h-4" />
              Add Filter
            </span>
            <ChevronDownIcon className={`w-4 h-4 text-slate-500 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showDropdown && <>
              <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
              <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800/95 backdrop-blur-sm border border-slate-700/50 rounded-lg shadow-xl z-20 overflow-hidden">
                {filterSections.map((section, sectionIndex) => <div key={sectionIndex}>
                    {section.filters.map(type => {
                const def = FILTER_DEFINITIONS[type];
                const countDisplay = getFilterCount(type);
                return <button key={type} onClick={() => handleAddFilter(type)} className="w-full text-left px-3 py-2.5 hover:bg-slate-700/50 transition-colors border-b border-slate-700/30 last:border-0">
                          <div className="flex items-start justify-between gap-2 mb-0.5">
                            <div className="text-sm font-medium text-slate-200">
                              {def.name}
                            </div>
                            {countDisplay && <div className="text-xs text-slate-500 whitespace-nowrap flex-shrink-0">
                                {countDisplay}
                              </div>}
                          </div>
                          <div className="text-xs text-slate-500">
                            {def.description}
                          </div>
                        </button>;
              })}
                    {/* Add separator between sections except after last section */}
                    {sectionIndex < filterSections.length - 1 && <div className="border-t-2 border-slate-700/50" />}
                  </div>)}
              </div>
            </>}
        </div>
      </div>

      {filters.length > 0 && <div className="relative mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-300">
              Filter Pipeline
              <span className="ml-2 text-xs font-normal text-slate-500">
                ({filters.length} active)
              </span>
            </h2>

            {/* Toggle buttons */}
            <div className="flex items-center gap-1">
              <button onClick={toggleAllFilters} className="p-1.5 rounded hover:bg-slate-700/50 transition-colors" title={allEnabled ? 'Disable all filters' : 'Enable all filters'}>
                {allEnabled ? <EyeOffIcon className="w-4 h-4 text-slate-400" /> : <EyeIcon className="w-4 h-4 text-slate-400" />}
              </button>

              <button onClick={expandCollapseAll} className="p-1.5 rounded hover:bg-slate-700/50 transition-colors" title={allExpanded ? 'Collapse all filters' : 'Expand all filters'}>
                {allExpanded ? <ChevronsUpIcon className="w-4 h-4 text-slate-400" /> : <ChevronsDownIcon className="w-4 h-4 text-slate-400" />}
              </button>
            </div>
          </div>

          <div className="space-y-2 relative" ref={filterListRef}>
            {/* SVG overlay for connection lines - use fixed positioning for cursor line */}
            {linkState?.isSelecting && linkState.cursorPosition && pipelineRef.current && <svg className="fixed inset-0 w-full h-full pointer-events-none" style={{
          zIndex: 100
        }}>
                  {(() => {
            const sourceEl = document.querySelector(`[data-filter-id="${linkState.sourceFilterId}"]`);
            if (!sourceEl) return null;
            // Find the link button position
            const linkButton = sourceEl.querySelector('button[title="Link dimensions"]');
            if (!linkButton) return null;
            const buttonRect = linkButton.getBoundingClientRect();
            // Use viewport coordinates for fixed SVG
            const x1 = buttonRect.left + buttonRect.width / 2;
            const y1 = buttonRect.top + buttonRect.height / 2;
            const x2 = linkState.cursorPosition.x;
            const y2 = linkState.cursorPosition.y;
            // Straight line
            const path = `M ${x1} ${y1} L ${x2} ${y2}`;
            return <path d={path} stroke="rgb(168, 85, 247)" strokeWidth="2" fill="none" strokeDasharray="4,4" opacity="0.8" />;
          })()}
                </svg>}

            {/* SVG for static connection lines between linked filters */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{
          zIndex: 1
        }}>
              {/* Draw connection lines between linked filters */}
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
              // Create curved path
              const midY = (y1 + y2) / 2;
              const path = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
              return <g key={`${filter.id}-${linkedId}`}>
                      <defs>
                        <linearGradient id={`gradient-${filter.id}-${linkedId}`} x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="rgb(168, 85, 247)" stopOpacity="0.6" />
                          <stop offset="100%" stopColor="rgb(147, 51, 234)" stopOpacity="0.6" />
                        </linearGradient>
                      </defs>
                      <path d={path} stroke={`url(#gradient-${filter.id}-${linkedId})`} strokeWidth="2" fill="none" strokeDasharray="5,5" className="animate-pulse" />
                    </g>;
            });
          })}
            </svg>

            {/* Overlay to block interactions during linking mode */}
            {linkState?.isSelecting && <div className="absolute inset-0 z-10" style={{
          pointerEvents: 'none'
        }} />}

            {/* Render Filters */}
            {(() => {
              const result: JSX.Element[] = [];
              let currentGroupItems: FilterConfig[] = [];
              let currentGroupBaseId: string | null = null;

              displayGroups.forEach((item) => {
                if (item.type === 'group-start') {
                  // Start accumulating a new group
                  currentGroupBaseId = item.baseId;
                  currentGroupItems = [];
                } else if (item.type === 'group-end') {
                  // End the current group - render all items wrapped in a border container
                  if (currentGroupBaseId && currentGroupItems.length > 0) {
                    result.push(
                      <div
                        key={`group-container-${currentGroupBaseId}`}
                        className="rounded-lg my-2 relative"
                        data-group-container
                        data-group-base={currentGroupBaseId}
                        style={{
                          marginLeft: '0.5rem',
                          marginRight: '0.5rem'
                        }}
                      >
                        {/* The actual border box that we will animate */}
                        <div 
                          className="absolute inset-0 border-2 border-purple-500/40 rounded-lg pointer-events-none" 
                          data-group-border 
                        />
                        
                        {/* Thick top bar (background only) */}
                        <div 
                          className="h-2 bg-slate-800/20 rounded-t-lg relative z-10" 
                          data-group-top 
                        />
                        
                        {/* Group filters (children + base) */}
                        <div className="p-1 space-y-1 relative z-10" data-group-content>
                          {currentGroupItems.map((filter) => {
                            const actualIndex = visualFilters.findIndex(f => f.id === filter.id);
                            const definition = FILTER_DEFINITIONS[filter.type];
                            const isGrouped = !!filter.groupId;
                            const hasGroupedFilters = !!(filter.groupedFilters && filter.groupedFilters.length > 0);
                            const isGroupingHovered = groupingHoverId === filter.id;
                            
                            return (
                              <div 
                                key={filter.id} 
                                data-filter-row 
                                data-filter-id={filter.id} 
                                className="relative"
                                style={{
                                  zIndex: activeDropdown?.filterId === filter.id ? 9998 : isLinkable(filter.id) && linkState?.isSelecting ? 20 : 2
                                }}
                              >
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
                                  isGrouped={isGrouped}
                                  hasGroupedFilters={hasGroupedFilters}
                                />
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* Thick bottom bar (background only) */}
                        <div 
                          className="h-2 bg-slate-800/20 rounded-b-lg relative z-10" 
                          data-group-bottom 
                        />
                      </div>
                    );
                  }
                  
                  // Reset for next group
                  currentGroupItems = [];
                  currentGroupBaseId = null;
                } else if (currentGroupBaseId) {
                  // Add filter to current group
                  currentGroupItems.push(item as FilterConfig);
                } else {
                  // Standalone filter - render directly
                  const filter = item as FilterConfig;
                  const actualIndex = visualFilters.findIndex(f => f.id === filter.id);
                  const definition = FILTER_DEFINITIONS[filter.type];
                  const isGrouped = !!filter.groupId;
                  const hasGroupedFilters = !!(filter.groupedFilters && filter.groupedFilters.length > 0);
                  const isGroupingHovered = groupingHoverId === filter.id;
                  
                  result.push(
                    <div 
                      key={filter.id} 
                      data-filter-row 
                      data-filter-id={filter.id} 
                      className="relative"
                      style={{
                        zIndex: activeDropdown?.filterId === filter.id ? 9998 : isLinkable(filter.id) && linkState?.isSelecting ? 20 : 2
                      }}
                    >
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
                        isGrouped={isGrouped}
                        hasGroupedFilters={hasGroupedFilters}
                      />
                    </div>
                  );
                }
              });

              return result;
            })()}
          </div>

        </div>}

      {filters.length === 0 && <div className="px-4 py-8 text-center border border-dashed border-slate-700/50 rounded-lg">
          <p className="text-sm text-slate-500">
            No filters applied yet. Add a filter to get started.
          </p>
        </div>}
    </div>;
}