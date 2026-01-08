import React, { useCallback, useState, useRef } from 'react';
import { FilterConfig, FilterType, BlendMode, BlendModePreview, NoiseType, NoiseTypePreview, ColorChannel, ColorToneParams, GlowParams, VSyncTearsParams, ChromaticAberrationParams, DuplicateLayerParams } from './types';
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
      duplicateLayerParams: definition.defaultDuplicateLayerParams
    };
    setFilters(prev => [newFilter, ...prev]);
  }, []);
  const updateFilter = useCallback((id: string, params: Record<string, number>) => {
    setFilters(prev => prev.map(f => f.id === id ? {
      ...f,
      params
    } : f));
  }, []);
  const updatePatternImage = useCallback((id: string, image: HTMLImageElement) => {
    setFilters(prev => prev.map(f => f.id === id ? {
      ...f,
      patternImage: image
    } : f));
  }, []);
  const updateBlendMode = useCallback((id: string, blendMode: BlendMode) => {
    setFilters(prev => prev.map(f => f.id === id ? {
      ...f,
      blendMode
    } : f));
  }, []);
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
    setFilters(prev => prev.map(f => f.id === id ? {
      ...f,
      noiseType
    } : f));
  }, []);
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
    setFilters(prev => prev.map(f => f.id === id ? {
      ...f,
      colorToneParams
    } : f));
  }, []);
  const updateColorChannel = useCallback((id: string, channel: ColorChannel) => {
    setFilters(prev => prev.map(f => f.id === id ? {
      ...f,
      activeColorChannel: channel
    } : f));
  }, []);
  const updateGlow = useCallback((id: string, glowParams: GlowParams) => {
    setFilters(prev => prev.map(f => f.id === id ? {
      ...f,
      glowParams
    } : f));
  }, []);
  const updateVSyncTears = useCallback((id: string, vsyncTearsParams: VSyncTearsParams) => {
    setFilters(prev => prev.map(f => f.id === id ? {
      ...f,
      vsyncTearsParams
    } : f));
  }, []);
  const updateChromaticAberration = useCallback((id: string, chromaticAberrationParams: ChromaticAberrationParams) => {
    setFilters(prev => prev.map(f => f.id === id ? {
      ...f,
      chromaticAberrationParams
    } : f));
  }, []);
  const updateDuplicateLayer = useCallback((id: string, duplicateLayerParams: DuplicateLayerParams) => {
    setFilters(prev => prev.map(f => f.id === id ? {
      ...f,
      duplicateLayerParams
    } : f));
  }, []);
  const linkDimensions = useCallback((sourceId: string, targetId: string) => {
    setFilters(prev => {
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
    });
  }, []);
  const unlinkDimensions = useCallback((filterId: string, targetId: string) => {
    setFilters(prev => {
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
    });
  }, []);
  const toggleFilterEnabled = useCallback((id: string) => {
    setFilters(prev => prev.map(f => f.id === id ? {
      ...f,
      enabled: !f.enabled
    } : f));
  }, []);
  const removeFilter = useCallback((id: string) => {
    setFilters(prev => {
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
    });
  }, []);
  const reorderFilters = useCallback((newFilters: FilterConfig[]) => {
    setFilters(newFilters);
  }, []);
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
  return <div className="w-full h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex overflow-hidden">
      <div className="w-80 h-full bg-slate-900/50 backdrop-blur-sm border-r border-slate-800/50 flex flex-col">
        <div className="px-6 py-5 border-b border-slate-800/50">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Nebula
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time filter pipeline
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {error && <div className="px-4 py-3 bg-red-900/20 border border-red-800/30 rounded-lg mb-8">
              <p className="text-sm text-red-400">{error}</p>
            </div>}

          <FilterPipeline filters={filters} onAddFilter={addFilter} onUpdateFilter={updateFilter} onUpdatePatternImage={updatePatternImage} onUpdateBlendMode={updateBlendMode} onPreviewBlendMode={previewBlendMode} onUpdateNoiseType={updateNoiseType} onPreviewNoiseType={previewNoiseType} onUpdateColorTone={updateColorTone} onUpdateColorChannel={updateColorChannel} onUpdateGlow={updateGlow} onUpdateVSyncTears={updateVSyncTears} onUpdateChromaticAberration={updateChromaticAberration} onUpdateDuplicateLayer={updateDuplicateLayer} onToggleFilterEnabled={toggleFilterEnabled} onRemoveFilter={removeFilter} onReorderFilters={reorderFilters} onLinkDimensions={linkDimensions} onUnlinkDimensions={unlinkDimensions} canvasRef={canvasRef} onPreviewReorder={handlePreviewReorder} onCancelPreview={handleCancelPreview} />
        </div>
      </div>

      <div className="flex-1 h-full relative">
        {!hasActiveSource && <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="w-full max-w-md px-6">
              <SourceSelector onWebcam={startWebcam} onImage={loadImage} onVideo={loadVideo} hasSource={hasActiveSource} />
            </div>
          </div>}

        <WebGLCanvas ref={canvasRef} source={source.element || null} sourceType={source.type} filters={canvasFilters} isSourceReady={isReady} onBack={stopSource} />
      </div>
    </div>;
}