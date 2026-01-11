import React, { useCallback, useState, useRef, useEffect } from 'react';
import { FilterConfig, FilterType, BlendMode, BlendModePreview, NoiseType, NoiseTypePreview, ColorChannel, ColorToneParams, GlowParams, VSyncTearsParams, ChromaticAberrationParams, DuplicateLayerParams, PatternParams } from './types';
import { FILTER_DEFINITIONS } from './constants/filters';
import { useMediaSource } from './hooks/useMediaSource';
import { SourceSelector } from './components/SourceSelector';
import { FilterPipeline } from './components/FilterPipeline';
import { WebGLCanvas } from './components/WebGLCanvas';

export function App() {
  const [filters, setFilters] = useState<FilterConfig[]>([]);
  const [previewFilters, setPreviewFilters] = useState<FilterConfig[] | null>(null);
  const [blendModePreview, setBlendModePreview] = useState<BlendModePreview | null>(null);
  const [noiseTypePreview, setNoiseTypePreview] = useState<NoiseTypePreview | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // History for undo/redo
  const historyRef = useRef<FilterConfig[][]>([[]]);
  const historyIndexRef = useRef<number>(0);
  const isInternalUpdateRef = useRef<boolean>(false);
  const lastSaveTimeRef = useRef<number>(0);

  // Function to save state to history
  const saveToHistory = useCallback((newFilters: FilterConfig[], force = false) => {
    if (isInternalUpdateRef.current) return;

    const now = Date.now();
    // A change is considered a new action if it's forced (structural) 
    // or if it's been more than 500ms since the last save
    const isNewAction = force || (now - lastSaveTimeRef.current > 500);

    if (isNewAction) {
      // Remove any "redo" states if we're making a new change
      const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
      
      // Add the new state
      newHistory.push(JSON.parse(JSON.stringify(newFilters))); // Deep clone to be safe
      
      // Limit to 10 actions (11 states total including initial)
      if (newHistory.length > 11) {
        newHistory.shift();
      } else {
        historyIndexRef.current++;
      }
      
      historyRef.current = newHistory;
    } else {
      // Just update the current history point for rapid updates
      historyRef.current[historyIndexRef.current] = JSON.parse(JSON.stringify(newFilters));
    }

    lastSaveTimeRef.current = now;
  }, []);

  // Update filters and save to history
  const setFiltersWithHistory = useCallback((update: FilterConfig[] | ((prev: FilterConfig[]) => FilterConfig[]), force = false) => {
    setFilters(prev => {
      const next = typeof update === 'function' ? update(prev) : update;
      saveToHistory(next, force);
      return next;
    });
  }, [saveToHistory]);

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      isInternalUpdateRef.current = true;
      historyIndexRef.current--;
      const prevState = historyRef.current[historyIndexRef.current];
      setFilters(JSON.parse(JSON.stringify(prevState)));
      // Reset the flag in the next tick
      setTimeout(() => { isInternalUpdateRef.current = false; }, 0);
    }
  }, []);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      isInternalUpdateRef.current = true;
      historyIndexRef.current++;
      const nextState = historyRef.current[historyIndexRef.current];
      setFilters(JSON.parse(JSON.stringify(nextState)));
      // Reset the flag in the next tick
      setTimeout(() => { isInternalUpdateRef.current = false; }, 0);
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Support both Cmd+Z (Mac) and Ctrl+Z (Windows/Linux)
      const isZ = e.code === 'KeyZ';
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      const isShift = e.shiftKey;

      if (isCmdOrCtrl && isZ) {
        if (isShift) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true); // Use capture phase to intercept
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [handleUndo, handleRedo]);
  const {
    source,
    error,
    isReady,
    startWebcam,
    loadImage,
    loadVideo,
    stopSource
  } = useMediaSource();
  const addFilter = useCallback((type: FilterType) => {
    const definition = FILTER_DEFINITIONS[type];
    const newFilter: FilterConfig = {
      id: `${type}-${Date.now()}`,
      type,
      enabled: true,
      params: {
        ...definition.defaultParams
      },
      blendMode: 'normal',
      noiseType: definition.defaultNoiseType,
      colorToneParams: definition.defaultColorToneParams,
      activeColorChannel: 'all',
      glowParams: definition.defaultGlowParams,
      vsyncTearsParams: definition.defaultVSyncTearsParams,
      chromaticAberrationParams: definition.defaultChromaticAberrationParams,
      duplicateLayerParams: definition.defaultDuplicateLayerParams,
      patternParams: definition.defaultPatternParams
    };
    setFiltersWithHistory(prev => [newFilter, ...prev], true);
  }, [setFiltersWithHistory]);

  const updateFilter = useCallback((id: string, params: Record<string, number>) => {
    setFiltersWithHistory(prev => prev.map(f => f.id === id ? {
      ...f,
      params
    } : f));
  }, [setFiltersWithHistory]);

  const updatePatternImage = useCallback((id: string, image: HTMLImageElement) => {
    setFiltersWithHistory(prev => prev.map(f => f.id === id ? {
      ...f,
      patternImage: image
    } : f), true);
  }, [setFiltersWithHistory]);

  const updateBlendMode = useCallback((id: string, blendMode: BlendMode) => {
    setFiltersWithHistory(prev => prev.map(f => f.id === id ? {
      ...f,
      blendMode
    } : f), true);
  }, [setFiltersWithHistory]);

  const previewBlendMode = useCallback((id: string, blendMode: BlendMode | null) => {
    if (blendMode === null) {
      setBlendModePreview(null);
    } else {
      setBlendModePreview({
        filterId: id,
        blendMode
      });
    }
  }, []);

  const updateNoiseType = useCallback((id: string, noiseType: NoiseType) => {
    setFiltersWithHistory(prev => prev.map(f => f.id === id ? {
      ...f,
      noiseType
    } : f), true);
  }, [setFiltersWithHistory]);

  const previewNoiseType = useCallback((id: string, noiseType: NoiseType | null) => {
    if (noiseType === null) {
      setNoiseTypePreview(null);
    } else {
      setNoiseTypePreview({
        filterId: id,
        noiseType
      });
    }
  }, []);

  const updateColorTone = useCallback((id: string, colorToneParams: ColorToneParams) => {
    setFiltersWithHistory(prev => prev.map(f => f.id === id ? {
      ...f,
      colorToneParams
    } : f));
  }, [setFiltersWithHistory]);

  const updateColorChannel = useCallback((id: string, channel: ColorChannel) => {
    setFiltersWithHistory(prev => prev.map(f => f.id === id ? {
      ...f,
      activeColorChannel: channel
    } : f), true);
  }, [setFiltersWithHistory]);

  const updateGlow = useCallback((id: string, glowParams: GlowParams) => {
    setFiltersWithHistory(prev => prev.map(f => f.id === id ? {
      ...f,
      glowParams
    } : f));
  }, [setFiltersWithHistory]);

  const updateVSyncTears = useCallback((id: string, vsyncTearsParams: VSyncTearsParams) => {
    setFiltersWithHistory(prev => prev.map(f => f.id === id ? {
      ...f,
      vsyncTearsParams
    } : f));
  }, [setFiltersWithHistory]);

  const updateChromaticAberration = useCallback((id: string, chromaticAberrationParams: ChromaticAberrationParams) => {
    setFiltersWithHistory(prev => prev.map(f => f.id === id ? {
      ...f,
      chromaticAberrationParams
    } : f));
  }, [setFiltersWithHistory]);

  const updateDuplicateLayer = useCallback((id: string, duplicateLayerParams: DuplicateLayerParams) => {
    setFiltersWithHistory(prev => prev.map(f => f.id === id ? {
      ...f,
      duplicateLayerParams
    } : f));
  }, [setFiltersWithHistory]);

  const updatePattern = useCallback((id: string, patternParams: PatternParams) => {
    setFiltersWithHistory(prev => prev.map(f => f.id === id ? {
      ...f,
      patternParams
    } : f));
  }, [setFiltersWithHistory]);

  const linkDimensions = useCallback((sourceId: string, targetId: string) => {
    setFiltersWithHistory(prev => {
      const sourceFilter = prev.find(f => f.id === sourceId);
      const targetFilter = prev.find(f => f.id === targetId);
      if (!sourceFilter || !targetFilter) return prev;
      const targetGroup = new Set([targetId, ...(targetFilter.linkedDimensions || [])]);
      const sourceGroup = new Set([sourceId, ...(sourceFilter.linkedDimensions || [])]);
      const allLinkedIds = new Set([...targetGroup, ...sourceGroup]);
      const syncWidth = sourceFilter.linkedDimensions && sourceFilter.linkedDimensions.length > 0 ? sourceFilter.params.width : targetFilter.params.width;
      const syncHeight = sourceFilter.linkedDimensions && sourceFilter.linkedDimensions.length > 0 ? sourceFilter.params.height : targetFilter.params.height;
      return prev.map(f => {
        if (allLinkedIds.has(f.id)) {
          return {
            ...f,
            params: {
              ...f.params,
              width: syncWidth,
              height: syncHeight
            },
            linkedDimensions: Array.from(allLinkedIds).filter(id => id !== f.id)
          };
        }
        return f;
      });
    }, true);
  }, [setFiltersWithHistory]);

  const unlinkDimensions = useCallback((filterId: string, targetId: string) => {
    setFiltersWithHistory(prev => {
      const filter = prev.find(f => f.id === filterId);
      if (!filter || !filter.linkedDimensions) return prev;
      return prev.map(f => {
        if (f.id === filterId) {
          return {
            ...f,
            linkedDimensions: []
          };
        }
        if (f.linkedDimensions?.includes(filterId)) {
          const updatedLinks = f.linkedDimensions.filter(id => id !== filterId);
          if (updatedLinks.length === 1) {
            return {
              ...f,
              linkedDimensions: []
            };
          }
          return {
            ...f,
            linkedDimensions: updatedLinks
          };
        }
        return f;
      }).map(f => {
        if (f.linkedDimensions && f.linkedDimensions.length === 1) {
          const lastLinkedId = f.linkedDimensions[0];
          const lastLinkedFilter = prev.find(filter => filter.id === lastLinkedId);
          if (lastLinkedFilter?.linkedDimensions?.length === 2) {
            return {
              ...f,
              linkedDimensions: []
            };
          }
        }
        return f;
      });
    }, true);
  }, [setFiltersWithHistory]);

  const toggleFilterEnabled = useCallback((id: string) => {
    setFiltersWithHistory(prev => prev.map(f => f.id === id ? {
      ...f,
      enabled: !f.enabled
    } : f), true);
  }, [setFiltersWithHistory]);

  const removeFilter = useCallback((id: string) => {
    setFiltersWithHistory(prev => {
      const filterToRemove = prev.find(f => f.id === id);
      if (filterToRemove?.linkedDimensions && filterToRemove.linkedDimensions.length > 0) {
        const updatedFilters = prev.map(f => {
          if (f.linkedDimensions?.includes(id)) {
            return {
              ...f,
              linkedDimensions: f.linkedDimensions.filter(linkedId => linkedId !== id)
            };
          }
          return f;
        });
        return updatedFilters.filter(f => f.id !== id);
      }
      return prev.filter(f => f.id !== id);
    }, true);
  }, [setFiltersWithHistory]);

  const reorderFilters = useCallback((newFilters: FilterConfig[]) => {
    setFiltersWithHistory(newFilters, true);
  }, [setFiltersWithHistory]);
  const handlePreviewReorder = useCallback((newFilters: FilterConfig[]) => {
    setPreviewFilters(newFilters);
  }, []);
  const handleCancelPreview = useCallback(() => {
    setPreviewFilters(null);
  }, []);
  const filtersWithPreview = filters.map(filter => {
    let updatedFilter = {
      ...filter
    };
    if (blendModePreview && blendModePreview.filterId === filter.id) {
      updatedFilter.blendMode = blendModePreview.blendMode;
    }
    if (noiseTypePreview && noiseTypePreview.filterId === filter.id) {
      updatedFilter.noiseType = noiseTypePreview.noiseType;
    }
    return updatedFilter;
  });
  // Use preview filters for canvas if available, otherwise use regular filters
  const canvasFilters = previewFilters || filtersWithPreview;
  const hasActiveSource = source.type !== 'none';
  return <div className="w-full h-screen bg-slate-100 flex overflow-hidden" style={{ backgroundColor: '#e8f0f5' }}>
      <div className="w-80 h-full bg-white backdrop-blur-sm flex flex-col">
        <div className="flex-1 overflow-y-auto scrollbar-left">
          <div style={{ direction: 'ltr' }}>
            {error && <div className="px-6 mb-4 mt-4">
              <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            </div>}

            <FilterPipeline filters={filters} onAddFilter={addFilter} onUpdateFilter={updateFilter} onUpdatePatternImage={updatePatternImage} onUpdateBlendMode={updateBlendMode} onPreviewBlendMode={previewBlendMode} onUpdateNoiseType={updateNoiseType} onPreviewNoiseType={previewNoiseType} onUpdateColorTone={updateColorTone} onUpdateColorChannel={updateColorChannel} onUpdateGlow={updateGlow} onUpdateVSyncTears={updateVSyncTears} onUpdateChromaticAberration={updateChromaticAberration} onUpdateDuplicateLayer={updateDuplicateLayer} onUpdatePattern={updatePattern} onToggleFilterEnabled={toggleFilterEnabled} onRemoveFilter={removeFilter} onReorderFilters={reorderFilters} onLinkDimensions={linkDimensions} onUnlinkDimensions={unlinkDimensions} canvasRef={canvasRef} onPreviewReorder={handlePreviewReorder} onCancelPreview={handleCancelPreview} />
          </div>
        </div>
      </div>

      <div className="flex-1 h-full relative">
        {!hasActiveSource && <div className="absolute inset-0 flex items-center justify-center z-10 bg-white">
            <div className="w-full max-w-md px-6">
              <SourceSelector onWebcam={startWebcam} onImage={loadImage} onVideo={loadVideo} hasSource={hasActiveSource} />
            </div>
          </div>}

        <WebGLCanvas ref={canvasRef} source={source.element || null} sourceType={source.type} filters={canvasFilters} isSourceReady={isReady} onBack={stopSource} onWebcam={startWebcam} onImage={loadImage} onVideo={loadVideo} />
      </div>
    </div>;
}