import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { XIcon, EyeIcon, EyeOffIcon, ChevronDownIcon, GripVerticalIcon, UploadIcon, CopyIcon, LinkIcon, UnlinkIcon, LayersIcon } from 'lucide-react';
import { FilterConfig, FilterDefinition, BlendMode, NoiseType, ColorChannel, ColorToneParams, GlowParams, VSyncTearsParams, ChromaticAberrationParams, DuplicateLayerParams, BLEND_MODE_LABELS, BLEND_MODE_GROUPS, NOISE_TYPE_LABELS, NOISE_TYPE_DESCRIPTIONS } from '../types';
import { LevelsUI } from './LevelsUI';
import { ColorToneUI } from './ColorToneUI';
import { GlowUI } from './GlowUI';
import { VSyncTearsUI } from './VSyncTearsUI';
import { ChromaticAberrationUI } from './ChromaticAberrationUI';
import { DuplicateLayerUI } from './DuplicateLayerUI';
interface FilterCardProps {
  filter: FilterConfig;
  definition: FilterDefinition;
  index: number;
  totalFilters: number;
  onUpdate: (id: string, params: Record<string, number>) => void;
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
  onToggleEnabled: (id: string) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDragStart: (e: React.PointerEvent) => void;
  onDragMove: (e: React.PointerEvent) => void;
  onDragEnd: (e: React.PointerEvent) => void;
  isDragging: boolean;
  canvasRef?: React.RefObject<HTMLCanvasElement>;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  canLinkDimensions?: boolean;
  onStartLinking?: () => void;
  onSelectLinkTarget?: () => void;
  onUnlinkDimensions?: (filterId: string, targetId: string) => void;
  isLinkable?: boolean;
  isLinkingMode?: boolean;
  isAlreadyLinked?: boolean;
  isIneligible?: boolean;
  allFilters?: FilterConfig[];
  activeDropdown?: {
    filterId: string;
    type: 'blend' | 'noise';
  } | null;
  onDropdownChange?: (dropdown: {
    filterId: string;
    type: 'blend' | 'noise';
  } | null) => void;
  isGroupingHovered?: boolean; // When dragging over the grouping icon
  isGrouped?: boolean; // Is this filter a child in a group
  hasGroupedFilters?: boolean; // Does this base filter have children
}
export function FilterCard({
  filter,
  definition,
  index,
  totalFilters,
  onUpdate,
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
  onToggleEnabled,
  onRemove,
  onDuplicate,
  onDragStart,
  onDragMove,
  onDragEnd,
  isDragging,
  canvasRef,
  isExpanded,
  onToggleExpanded,
  canLinkDimensions = false,
  onStartLinking,
  onSelectLinkTarget,
  onUnlinkDimensions,
  isLinkable = false,
  isLinkingMode = false,
  isAlreadyLinked = false,
  isIneligible = false,
  allFilters = [],
  activeDropdown,
  onDropdownChange,
  isGroupingHovered = false,
  isGrouped = false,
  hasGroupedFilters = false
}: FilterCardProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Derive local dropdown state from global state
  const showBlendDropdown = activeDropdown?.filterId === filter.id && activeDropdown?.type === 'blend';
  const showNoiseDropdown = activeDropdown?.filterId === filter.id && activeDropdown?.type === 'noise';
  const handleDelete = () => {
    setShowDeleteModal(false);
    onRemove(filter.id);
  };
  // Keyboard handler for delete modal
  useEffect(() => {
    if (!showDeleteModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleDelete();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowDeleteModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDeleteModal]);
  const handleCardClick = (e: React.MouseEvent) => {
    if (isLinkingMode && isLinkable && onSelectLinkTarget) {
      e.stopPropagation();
      e.preventDefault();
      onSelectLinkTarget();
    }
  };
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => {
      const img = new Image();
      img.onload = () => {
        onUpdatePatternImage(filter.id, img);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };
  const handleBlendModeClick = (mode: BlendMode) => {
    onUpdateBlendMode(filter.id, mode);
    onPreviewBlendMode(filter.id, null);
    onDropdownChange?.(null);
  };
  const handleBlendModeHover = (mode: BlendMode) => {
    onPreviewBlendMode(filter.id, mode);
  };
  const handleBlendModeLeave = () => {
    onPreviewBlendMode(filter.id, null);
  };
  const handleBlendDropdownClose = () => {
    onDropdownChange?.(null);
    onPreviewBlendMode(filter.id, null);
  };
  const handleNoiseTypeClick = (type: NoiseType) => {
    onUpdateNoiseType(filter.id, type);
    onPreviewNoiseType(filter.id, null);
    onDropdownChange?.(null);
  };
  const handleNoiseTypeHover = (type: NoiseType) => {
    onPreviewNoiseType(filter.id, type);
  };
  const handleNoiseTypeLeave = () => {
    onPreviewNoiseType(filter.id, null);
  };
  const handleNoiseDropdownClose = () => {
    onDropdownChange?.(null);
    onPreviewNoiseType(filter.id, null);
  };
  const isNoiseFilter = filter.type === 'noise';
  const isColorToneFilter = filter.type === 'colorTone';
  const isGlowFilter = filter.type === 'glow';
  const isVSyncTearsFilter = filter.type === 'vsyncTears';
  const isChromaticAberrationFilter = filter.type === 'chromaticAberration';
  const isDuplicateLayerFilter = filter.type === 'duplicateLayer';
  const currentNoiseType = filter.noiseType || 'hash';
  // Check if this filter supports dimension linking
  const supportsDimensionLinking = filter.type === 'pattern' || filter.type === 'mosaic';
  const hasLinkedDimensions = filter.linkedDimensions && filter.linkedDimensions.length > 0;
  // Check if there are more filters available to link to
  const getAvailableLinkableFilters = () => {
    if (!supportsDimensionLinking) return [];
    const alreadyLinked = new Set(filter.linkedDimensions || []);
    alreadyLinked.add(filter.id); // Don't include self
    return allFilters.filter(f => {
      if (alreadyLinked.has(f.id)) return false;
      if (filter.type === 'pattern') return f.type === 'mosaic' || f.type === 'pattern';
      if (filter.type === 'mosaic') return f.type === 'pattern' || f.type === 'mosaic';
      return false;
    });
  };
  const availableLinkableFilters = getAvailableLinkableFilters();
  const canAddMoreLinks = availableLinkableFilters.length > 0;
  // Get linked filter names for display
  const getLinkedFiltersDisplay = () => {
    if (!filter.linkedDimensions || filter.linkedDimensions.length === 0) return null;
    const linkedFilters = filter.linkedDimensions.map(linkedId => {
      const linkedFilter = allFilters.find(f => f.id === linkedId);
      if (!linkedFilter) return null;
      return {
        name: linkedFilter.type === 'pattern' ? 'Pattern Overlay' : 'Mosaic Grid',
        id: linkedId
      };
    }).filter(Boolean) as {
      name: string;
      id: string;
    }[];
    if (linkedFilters.length === 0) return null;
    // Get dimensions from first linked filter (they should all be the same)
    const firstLinked = allFilters.find(f => f.id === filter.linkedDimensions![0]);
    const width = firstLinked?.params.width || filter.params.width || 0;
    const height = firstLinked?.params.height || filter.params.height || 0;
    // Total count includes this filter + all linked filters
    const totalCount = linkedFilters.length + 1;
    // Format the display text
    let displayText = '';
    if (totalCount === 2) {
      displayText = `Linked to ${linkedFilters[0].name}`;
    } else {
      const names = linkedFilters.map(f => f.name).join(', ');
      displayText = `Linked to ${linkedFilters.length} filters: ${names}`;
    }
    return {
      text: displayText,
      count: totalCount,
      dimensions: `${width}×${height}`
    };
  };
  const linkedDisplay = getLinkedFiltersDisplay();
  return <>
      <div data-filter-card data-filter-id={filter.id} onClick={handleCardClick} className={`group relative bg-slate-800/40 backdrop-blur-sm border rounded-lg transition-all 
          ${isDragging ? 'opacity-30' : ''} 
          ${!filter.enabled ? 'opacity-60' : ''} 
          ${isLinkable && isLinkingMode ? 'border-purple-500/40 ring-1 ring-purple-500/20 hover:bg-slate-700/50 cursor-pointer' : isGroupingHovered ? 'border-purple-500 ring-2 ring-purple-500/40' : 'border-slate-700/50 hover:border-slate-600/50'} 
          ${hasLinkedDimensions ? 'ring-1 ring-purple-500/30' : ''}
          ${isGrouped ? 'ml-4' : ''}
        `} style={{
      zIndex: showBlendDropdown || showNoiseDropdown ? 9998 : isLinkable && isLinkingMode ? 20 : 2
    }}>
        {/* Overlay to capture clicks during linking mode (for linkable filters) */}
        {isLinkingMode && isLinkable && <div className="absolute inset-0 z-50 cursor-pointer" onClick={handleCardClick} />}

        {/* Already Linked Overlay - purple tint with "Currently Linked" text */}
        {isLinkingMode && isAlreadyLinked && <div className="absolute inset-0 z-50 bg-purple-500/10 backdrop-blur-sm rounded-lg flex items-center justify-center pointer-events-none">
            <div className="px-4 py-2 bg-purple-500/20 border border-purple-400/40 rounded-lg">
              <span className="text-sm font-medium text-purple-200">
                Currently Linked
              </span>
            </div>
          </div>}

        {/* Ineligible Overlay - grey tint, blocks all interactions */}
        {isLinkingMode && isIneligible && <div className="absolute inset-0 z-50 bg-slate-900/60 backdrop-blur-sm rounded-lg" />}

        {/* Header with drag handle and controls */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-700/30">
          {/* Base Filter Grouping Icon - only for base filters without existing groups */}
          {!!definition.isBaseFilter && !hasGroupedFilters && !isGrouped && (
            <button 
              data-grouping-button 
              data-filter-id={filter.id} 
              className={`self-stretch w-12 -ml-3 -my-2.5 rounded-l-lg border-r transition-all flex items-center justify-center flex-shrink-0 pointer-events-auto ${
                isGroupingHovered 
                  ? 'bg-purple-500/20 border-purple-500/50' 
                  : 'bg-slate-700/30 hover:bg-slate-700/50 border-slate-600/30'
              }`} 
              title="Drag filters here to group"
              style={{ pointerEvents: 'auto' }}
            >
              <LayersIcon className={`w-5 h-5 transition-colors ${
                isGroupingHovered 
                  ? 'text-purple-400' 
                  : 'text-slate-400'
              }`} />
            </button>
          )}

          {/* GSAP Drag Handle - uses pointer events */}
          <div onPointerDown={onDragStart} onPointerMove={onDragMove} onPointerUp={onDragEnd} onPointerCancel={onDragEnd} className="flex items-center gap-2 flex-shrink-0 cursor-grab active:cursor-grabbing select-none touch-none">
            <GripVerticalIcon className="w-4 h-4 text-slate-500 group-hover:text-slate-400 transition-colors" />
          </div>

          <h3 className="text-sm font-medium text-slate-200 flex-1">
            {definition.name}
          </h3>

          <div className="flex items-center gap-1">
            {/* Link count badge */}
            {hasLinkedDimensions && linkedDisplay && <div className="px-1.5 py-0.5 bg-purple-500/20 border border-purple-500/30 rounded text-xs font-medium text-purple-400 flex items-center gap-1">
                <LinkIcon className="w-3 h-3" />
                {linkedDisplay.count}
              </div>}

            {/* Only show duplicate button for glow filter */}
            {filter.type === 'glow' && <button onClick={() => onDuplicate(filter.id)} className="p-1 rounded hover:bg-slate-700/50 transition-colors" title="Duplicate filter">
                <CopyIcon className="w-4 h-4 text-slate-400" />
              </button>}

            <button onClick={() => onToggleExpanded()} className="p-1 rounded hover:bg-slate-700/50 transition-colors" title={isExpanded ? 'Collapse' : 'Expand'}>
              <ChevronDownIcon className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
            </button>

            <button onClick={() => onToggleEnabled(filter.id)} className="p-1 rounded hover:bg-slate-700/50 transition-colors" title={filter.enabled ? 'Disable filter' : 'Enable filter'}>
              {filter.enabled ? <EyeIcon className="w-4 h-4 text-slate-400" /> : <EyeOffIcon className="w-4 h-4 text-slate-500" />}
            </button>

            <button onClick={() => setShowDeleteModal(true)} className="p-1 rounded hover:bg-red-900/30 transition-colors" title="Remove filter">
              <XIcon className="w-4 h-4 text-slate-400 hover:text-red-400" />
            </button>
          </div>
        </div>

        {/* Parameters - collapsible */}
        {isExpanded && <div className="p-3 space-y-3 relative" style={{
        zIndex: showBlendDropdown || showNoiseDropdown ? 101 : 'auto'
      }}>
            {/* Blend Mode Dropdown - hide for filters with noBlendMode */}
            {!definition.noBlendMode && <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400">
                  Blend Mode
                </label>
                <div className="relative" style={{
            zIndex: showBlendDropdown ? 102 : 'auto'
          }}>
                  <button onClick={() => onDropdownChange?.(showBlendDropdown ? null : {
              filterId: filter.id,
              type: 'blend'
            })} className="w-full px-3 py-2 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 rounded-lg text-sm text-slate-300 transition-colors flex items-center justify-between">
                    <span>{BLEND_MODE_LABELS[filter.blendMode]}</span>
                    <ChevronDownIcon className={`w-4 h-4 text-slate-500 transition-transform ${showBlendDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {showBlendDropdown && <>
                      <div className="fixed inset-0" style={{
                zIndex: 9997
              }} onClick={handleBlendDropdownClose} />
                      <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800/95 backdrop-blur-sm border border-slate-700/50 rounded-lg shadow-xl max-h-80 overflow-y-auto" style={{
                zIndex: 9999
              }} onMouseLeave={handleBlendModeLeave}>
                        {Object.entries(BLEND_MODE_GROUPS).map(([groupName, modes]) => <div key={groupName}>
                              <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 bg-slate-900/50 sticky top-0">
                                {groupName}
                              </div>
                              {modes.map(mode => <button key={mode} onClick={() => handleBlendModeClick(mode as BlendMode)} onMouseEnter={() => handleBlendModeHover(mode as BlendMode)} className={`w-full text-left px-3 py-2 hover:bg-slate-700/50 transition-colors border-b border-slate-700/30 last:border-0 text-sm ${filter.blendMode === mode ? 'text-purple-400 bg-slate-700/30' : 'text-slate-300'}`}>
                                  {BLEND_MODE_LABELS[mode as BlendMode]}
                                </button>)}
                            </div>)}
                      </div>
                    </>}
                </div>
              </div>}

            {/* Noise Type Dropdown - only for noise filter */}
            {isNoiseFilter && <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400">
                  Noise Type
                </label>
                <div className="relative" style={{
            zIndex: showNoiseDropdown ? 102 : 'auto'
          }}>
                  <button onClick={() => onDropdownChange?.(showNoiseDropdown ? null : {
              filterId: filter.id,
              type: 'noise'
            })} className="w-full px-3 py-2 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 rounded-lg text-sm text-slate-300 transition-colors flex items-center justify-between">
                    <span>{NOISE_TYPE_LABELS[currentNoiseType]}</span>
                    <ChevronDownIcon className={`w-4 h-4 text-slate-500 transition-transform ${showNoiseDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {showNoiseDropdown && <>
                      <div className="fixed inset-0" style={{
                zIndex: 9997
              }} onClick={handleNoiseDropdownClose} />
                      <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800/95 backdrop-blur-sm border border-slate-700/50 rounded-lg shadow-xl overflow-hidden" style={{
                zIndex: 9999
              }} onMouseLeave={handleNoiseTypeLeave}>
                        {(Object.keys(NOISE_TYPE_LABELS) as NoiseType[]).map(type => <button key={type} onClick={() => handleNoiseTypeClick(type)} onMouseEnter={() => handleNoiseTypeHover(type)} className={`w-full text-left px-3 py-2.5 hover:bg-slate-700/50 transition-colors border-b border-slate-700/30 last:border-0 ${currentNoiseType === type ? 'text-purple-400 bg-slate-700/30' : 'text-slate-300'}`}>
                              <div className="text-sm font-medium">
                                {NOISE_TYPE_LABELS[type]}
                              </div>
                              <div className="text-xs text-slate-500 mt-0.5">
                                {NOISE_TYPE_DESCRIPTIONS[type]}
                              </div>
                            </button>)}
                      </div>
                    </>}
                </div>
              </div>}

            {/* Custom UI for Levels filter */}
            {definition.customUI && filter.type === 'levels' && canvasRef ? <LevelsUI params={filter.params as any} onUpdate={newParams => onUpdate(filter.id, newParams)} canvasRef={canvasRef} /> : definition.customUI && isColorToneFilter && filter.colorToneParams ? <ColorToneUI params={filter.colorToneParams} activeChannel={filter.activeColorChannel || 'all'} onUpdate={newParams => onUpdateColorTone(filter.id, newParams)} onChannelChange={channel => onUpdateColorChannel(filter.id, channel)} /> : definition.customUI && isGlowFilter && filter.glowParams ? <GlowUI params={filter.glowParams} onUpdate={newParams => onUpdateGlow(filter.id, newParams)} /> : definition.customUI && isVSyncTearsFilter && filter.vsyncTearsParams ? <VSyncTearsUI params={filter.vsyncTearsParams} onUpdate={newParams => onUpdateVSyncTears(filter.id, newParams)} /> : definition.customUI && isChromaticAberrationFilter && filter.chromaticAberrationParams ? <ChromaticAberrationUI params={filter.chromaticAberrationParams} onUpdate={newParams => onUpdateChromaticAberration(filter.id, newParams)} /> : definition.customUI && isDuplicateLayerFilter && filter.duplicateLayerParams ? <DuplicateLayerUI params={filter.duplicateLayerParams} onUpdate={newParams => onUpdateDuplicateLayer(filter.id, newParams)} /> : <>
                {/* Image upload for pattern filter */}
                {definition.requiresImage && <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-400">
                      Pattern Image
                    </label>

                    {/* Built-in Pattern Presets */}
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <button onClick={() => {
                const img = new Image();
                img.crossOrigin = 'anonymous'; // Required for WebGL to use cross-origin images
                img.onload = () => onUpdatePatternImage(filter.id, img);
                img.src = "/pattern.svg";
              }} className="aspect-square bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 hover:border-purple-500/50 rounded-lg transition-all overflow-hidden" title="Vertical Stripes">
                        <img src="/pattern.svg" alt="Vertical stripes pattern" className="w-full h-full object-cover" />
                      </button>
                    </div>

                    <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml" onChange={handleImageUpload} className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} className="w-full px-3 py-2 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 rounded-lg text-sm text-slate-300 transition-colors flex items-center justify-center gap-2">
                      <UploadIcon className="w-4 h-4" />
                      {filter.patternImage ? 'Change Pattern' : 'Upload Custom Pattern'}
                    </button>
                    {filter.patternImage && <div className="mt-2 p-2 bg-slate-700/30 rounded border border-slate-600/30">
                        <img src={filter.patternImage.src} alt="Pattern preview" className="w-full h-16 object-contain" />
                      </div>}
                  </div>}

                {/* Parameter sliders - render opacity first if it exists */}
                {definition.paramRanges.opacity && <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-slate-400">
                        {definition.paramRanges.opacity.label}
                      </label>
                      <span className="text-xs text-slate-500 font-mono">
                        {filter.params.opacity?.toFixed(2) ?? definition.paramRanges.opacity.min.toFixed(2)}
                      </span>
                    </div>
                    <input type="range" min={definition.paramRanges.opacity.min} max={definition.paramRanges.opacity.max} step={definition.paramRanges.opacity.step} value={filter.params.opacity ?? definition.paramRanges.opacity.min} onChange={e => {
              const newValue = parseFloat(e.target.value);
              onUpdate(filter.id, {
                ...filter.params,
                opacity: newValue
              });
            }} className="w-full h-1.5 bg-slate-700/50 rounded-lg appearance-none cursor-pointer
                        [&::-webkit-slider-thumb]:appearance-none
                        [&::-webkit-slider-thumb]:w-3
                        [&::-webkit-slider-thumb]:h-3
                        [&::-webkit-slider-thumb]:rounded-full
                        [&::-webkit-slider-thumb]:bg-gradient-to-br
                        [&::-webkit-slider-thumb]:from-purple-400
                        [&::-webkit-slider-thumb]:to-blue-400
                        [&::-webkit-slider-thumb]:cursor-pointer
                        [&::-webkit-slider-thumb]:transition-transform
                        [&::-webkit-slider-thumb]:hover:scale-110
                        [&::-moz-range-thumb]:w-3
                        [&::-moz-range-thumb]:h-3
                        [&::-moz-range-thumb]:rounded-full
                        [&::-moz-range-thumb]:bg-gradient-to-br
                        [&::-moz-range-thumb]:from-purple-400
                        [&::-moz-range-thumb]:to-blue-400
                        [&::-moz-range-thumb]:border-0
                        [&::-moz-range-thumb]:cursor-pointer" />
                  </div>}

                {/* Dimension Linking UI - only for pattern and mosaic filters, after opacity */}
                {supportsDimensionLinking && <div className="space-y-2">
                    {/* Link Dimensions Button - at the top */}
                    {canAddMoreLinks && onStartLinking && <div className="flex justify-end">
                        <button onClick={e => {
                e.stopPropagation();
                onStartLinking();
              }} className="p-1 rounded bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 hover:border-purple-500/50 transition-all" title="Link dimensions">
                          <LinkIcon className="w-3 h-3 text-purple-400" />
                        </button>
                      </div>}

                    {/* Linked Filters Display */}
                    {hasLinkedDimensions && linkedDisplay && <div className="flex items-center justify-between px-3 py-2 bg-slate-700/30 border border-slate-600/30 rounded-lg">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <LinkIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-slate-300">
                              {linkedDisplay.text}
                            </div>
                            <div className="text-xs text-slate-500">
                              {linkedDisplay.dimensions}
                            </div>
                          </div>
                        </div>
                        <button onClick={e => {
                e.stopPropagation();
                onUnlinkDimensions?.(filter.id, '');
              }} className="p-1.5 rounded bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 hover:border-purple-500/50 transition-all flex-shrink-0" title="Unlink from group">
                          <UnlinkIcon className="w-3.5 h-3.5 text-purple-400" />
                        </button>
                      </div>}

                    {/* Width and Height sliders */}
                    {(definition.paramRanges.width || definition.paramRanges.height) && <div className="space-y-3 pt-2 border-t border-slate-700/30">
                        {/* Width slider */}
                        {definition.paramRanges.width && <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-medium text-slate-400">
                                {definition.paramRanges.width.label}
                              </label>
                              <span className="text-xs text-slate-500 font-mono">
                                {filter.params.width?.toFixed(0) ?? definition.paramRanges.width.min.toFixed(0)}
                              </span>
                            </div>
                            <input type="range" min={definition.paramRanges.width.min} max={definition.paramRanges.width.max} step={definition.paramRanges.width.step} value={filter.params.width ?? definition.paramRanges.width.min} onChange={e => {
                  const newValue = parseFloat(e.target.value);
                  onUpdate(filter.id, {
                    ...filter.params,
                    width: newValue
                  });
                }} disabled={isLinkingMode} className="w-full h-1.5 bg-slate-700/50 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
                                [&::-webkit-slider-thumb]:appearance-none
                                [&::-webkit-slider-thumb]:w-3
                                [&::-webkit-slider-thumb]:h-3
                                [&::-webkit-slider-thumb]:rounded-full
                                [&::-webkit-slider-thumb]:bg-gradient-to-br
                                [&::-webkit-slider-thumb]:from-purple-400
                                [&::-webkit-slider-thumb]:to-blue-400
                                [&::-webkit-slider-thumb]:cursor-pointer
                                [&::-webkit-slider-thumb]:transition-transform
                                [&::-webkit-slider-thumb]:hover:scale-110
                                [&::-moz-range-thumb]:w-3
                                [&::-moz-range-thumb]:h-3
                                [&::-moz-range-thumb]:rounded-full
                                [&::-moz-range-thumb]:bg-gradient-to-br
                                [&::-moz-range-thumb]:from-purple-400
                                [&::-moz-range-thumb]:to-blue-400
                                [&::-moz-range-thumb]:border-0
                                [&::-moz-range-thumb]:cursor-pointer" />
                          </div>}

                        {/* Height slider */}
                        {definition.paramRanges.height && <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-medium text-slate-400">
                                {definition.paramRanges.height.label}
                              </label>
                              <span className="text-xs text-slate-500 font-mono">
                                {filter.params.height?.toFixed(0) ?? definition.paramRanges.height.min.toFixed(0)}
                              </span>
                            </div>
                            <input type="range" min={definition.paramRanges.height.min} max={definition.paramRanges.height.max} step={definition.paramRanges.height.step} value={filter.params.height ?? definition.paramRanges.height.min} onChange={e => {
                  const newValue = parseFloat(e.target.value);
                  onUpdate(filter.id, {
                    ...filter.params,
                    height: newValue
                  });
                }} disabled={isLinkingMode} className="w-full h-1.5 bg-slate-700/50 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
                                [&::-webkit-slider-thumb]:appearance-none
                                [&::-webkit-slider-thumb]:w-3
                                [&::-webkit-slider-thumb]:h-3
                                [&::-webkit-slider-thumb]:rounded-full
                                [&::-webkit-slider-thumb]:bg-gradient-to-br
                                [&::-webkit-slider-thumb]:from-purple-400
                                [&::-webkit-slider-thumb]:to-blue-400
                                [&::-webkit-slider-thumb]:cursor-pointer
                                [&::-webkit-slider-thumb]:transition-transform
                                [&::-webkit-slider-thumb]:hover:scale-110
                                [&::-moz-range-thumb]:w-3
                                [&::-moz-range-thumb]:h-3
                                [&::-moz-range-thumb]:rounded-full
                                [&::-moz-range-thumb]:bg-gradient-to-br
                                [&::-moz-range-thumb]:from-purple-400
                                [&::-moz-range-thumb]:to-blue-400
                                [&::-moz-range-thumb]:border-0
                                [&::-moz-range-thumb]:cursor-pointer" />
                          </div>}
                      </div>}
                  </div>}

                {/* Rest of parameter sliders (excluding opacity, width, height which were already rendered) */}
                {Object.entries(definition.paramRanges).filter(([key]) => key !== 'opacity' && key !== 'width' && key !== 'height').map(([key, range]) => <div key={key} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-slate-400">
                          {range.label}
                        </label>
                        <span className="text-xs text-slate-500 font-mono">
                          {filter.params[key]?.toFixed(2) ?? range.min.toFixed(2)}
                        </span>
                      </div>
                      <input type="range" min={range.min} max={range.max} step={range.step} value={filter.params[key] ?? range.min} onChange={e => {
              const newValue = parseFloat(e.target.value);
              onUpdate(filter.id, {
                ...filter.params,
                [key]: newValue
              });
            }} disabled={isLinkingMode} className="w-full h-1.5 bg-slate-700/50 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
                          [&::-webkit-slider-thumb]:appearance-none
                          [&::-webkit-slider-thumb]:w-3
                          [&::-webkit-slider-thumb]:h-3
                          [&::-webkit-slider-thumb]:rounded-full
                          [&::-webkit-slider-thumb]:bg-gradient-to-br
                          [&::-webkit-slider-thumb]:from-purple-400
                          [&::-webkit-slider-thumb]:to-blue-400
                          [&::-webkit-slider-thumb]:cursor-pointer
                          [&::-webkit-slider-thumb]:transition-transform
                          [&::-webkit-slider-thumb]:hover:scale-110
                          [&::-moz-range-thumb]:w-3
                          [&::-moz-range-thumb]:h-3
                          [&::-moz-range-thumb]:rounded-full
                          [&::-moz-range-thumb]:bg-gradient-to-br
                          [&::-moz-range-thumb]:from-purple-400
                          [&::-moz-range-thumb]:to-blue-400
                          [&::-moz-range-thumb]:border-0
                          [&::-moz-range-thumb]:cursor-pointer" />
                    </div>)}
              </>}
          </div>}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && createPortal(<div className="fixed inset-0 z-[9999] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)} />

            <div className="relative bg-slate-800 border border-slate-700 rounded-lg shadow-2xl p-6 max-w-sm mx-4">
              <h3 className="text-lg font-semibold text-slate-200 mb-2">
                Remove Filter?
              </h3>
              <p className="text-sm text-slate-400 mb-6">
                Are you sure you want to remove{' '}
                <span className="font-medium text-slate-300">
                  {definition.name}
                </span>
                ? This action cannot be undone.
              </p>

              <div className="flex items-center gap-3">
                <button onClick={() => setShowDeleteModal(false)} className="flex-1 px-4 py-2 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-300 transition-colors">
                  Cancel
                </button>
                <button onClick={handleDelete} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm text-white font-medium transition-colors">
                  Remove
                </button>
              </div>
            </div>
          </div>, document.body)}
    </>;
}