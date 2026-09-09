import React, { useState, useMemo } from 'react';
import { ElementPropertiesData } from '../types';
import {
  Search,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Info,
  Layers,
  Box,
  Tag,
  Hash,
} from 'lucide-react';

interface PropertiesPanelProps {
  properties: ElementPropertiesData | null;
  isLoading: boolean;
  onClose: () => void;
  onToast: (type: 'info' | 'success' | 'warning' | 'error', text: string) => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  properties,
  isLoading,
  onClose,
  onToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedGuid, setCopiedGuid] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (sectionName: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionName]: !prev[sectionName],
    }));
  };

  const handleCopyGuid = (guid: string) => {
    navigator.clipboard.writeText(guid);
    setCopiedGuid(true);
    onToast('success', 'Copied GlobalId to clipboard!');
    setTimeout(() => setCopiedGuid(false), 2000);
  };

  // Filter properties based on search query
  const filteredPsets = useMemo(() => {
    if (!properties || !properties.propertySets) return [];
    if (!searchQuery.trim()) return properties.propertySets;

    const q = searchQuery.toLowerCase();
    return properties.propertySets
      .map((pset) => {
        const matchingProps = pset.properties.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            String(p.value).toLowerCase().includes(q) ||
            (p.unit && p.unit.toLowerCase().includes(q))
        );
        return {
          ...pset,
          properties: matchingProps,
        };
      })
      .filter((pset) => pset.properties.length > 0 || pset.name.toLowerCase().includes(q));
  }, [properties, searchQuery]);

  return (
    <aside
      id="properties-panel"
      className="w-[380px] h-full bg-[#1e1e2e] border-l border-[#3f3f5a] flex flex-col z-10 shrink-0 select-none overflow-hidden"
    >
      {/* Panel Header */}
      <div className="h-12 px-3 bg-[#252538] border-b border-[#3f3f5a] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-400" />
          <h2 className="font-semibold text-sm text-slate-100">BIM Properties</h2>
        </div>
        <button
          id="btn-close-properties"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-200 text-xs px-2 py-1 rounded hover:bg-[#3f3f5a] transition"
        >
          ✕
        </button>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs">Đang tải dữ liệu thuộc tính IFC...</p>
        </div>
      ) : !properties ? (
        /* Empty State */
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400 select-none">
          <Box className="w-12 h-12 text-slate-600 mb-3 stroke-[1.5]" />
          <h3 className="font-semibold text-sm text-slate-300 mb-1">No element selected</h3>
          <p className="text-xs text-slate-500 max-w-[240px] leading-relaxed">
            Click on any 3D element in the model to inspect its full properties, sets, and quantities.
          </p>
        </div>
      ) : (
        /* Element Properties Content */
        <div className="flex-1 flex flex-col min-h-0">
          {/* Element Identity Banner */}
          <div className="p-3 bg-[#252538]/70 border-b border-[#3f3f5a] shrink-0">
            <div className="flex items-center justify-between mb-1">
              <span className="px-2 py-0.5 rounded bg-blue-600/30 text-blue-300 font-mono font-bold text-xs border border-blue-500/40">
                {properties.ifcType}
              </span>
              <span className="text-xs font-mono text-slate-400">
                #{properties.expressID}
              </span>
            </div>

            {properties.name && (
              <h3 className="font-semibold text-sm text-slate-100 truncate mb-1">
                {properties.name}
              </h3>
            )}

            {properties.description && (
              <p className="text-xs text-slate-400 line-clamp-2 mb-1.5">
                {properties.description}
              </p>
            )}

            {/* GlobalId Copy Box */}
            {properties.globalId && (
              <div
                onClick={() => handleCopyGuid(properties.globalId!)}
                className="group flex items-center justify-between px-2 py-1 rounded bg-[#1e1e2e] border border-[#3f3f5a] hover:border-blue-500 cursor-pointer transition text-[11px]"
                title="Click để copy GlobalId"
              >
                <span className="font-mono text-slate-300 truncate">
                  {properties.globalId}
                </span>
                <span className="text-slate-400 group-hover:text-blue-400 ml-1 shrink-0">
                  {copiedGuid ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Search Box */}
          <div className="p-2 border-b border-[#3f3f5a] bg-[#1e1e2e] shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="🔍 Search properties..."
                className="w-full pl-8 pr-3 py-1.5 rounded bg-[#252538] border border-[#3f3f5a] text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-200 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Scrollable Attributes & Property Sets */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {/* Identity & Attributes */}
            <section className="bg-[#252538] rounded-md border border-[#3f3f5a] overflow-hidden">
              <div
                onClick={() => toggleSection('attributes')}
                className="px-3 py-2 bg-[#2a2a40] flex items-center justify-between cursor-pointer hover:bg-[#32324e] transition text-xs font-semibold text-slate-200"
              >
                <div className="flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                  <span>Identity Attributes</span>
                </div>
                {collapsedSections['attributes'] ? (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                )}
              </div>

              {!collapsedSections['attributes'] && (
                <div className="p-2.5 space-y-1.5 text-xs">
                  <div className="flex justify-between border-b border-[#3f3f5a]/50 pb-1">
                    <span className="text-slate-400">Express ID</span>
                    <span className="font-mono text-slate-200">{properties.expressID}</span>
                  </div>
                  <div className="flex justify-between border-b border-[#3f3f5a]/50 pb-1">
                    <span className="text-slate-400">IFC Type</span>
                    <span className="font-mono text-blue-300">{properties.ifcType}</span>
                  </div>
                  {properties.name && (
                    <div className="flex justify-between border-b border-[#3f3f5a]/50 pb-1">
                      <span className="text-slate-400">Name</span>
                      <span className="text-slate-200 text-right max-w-[200px] truncate">{properties.name}</span>
                    </div>
                  )}
                  {properties.objectType && (
                    <div className="flex justify-between border-b border-[#3f3f5a]/50 pb-1">
                      <span className="text-slate-400">ObjectType</span>
                      <span className="text-slate-200 text-right max-w-[200px] truncate">{properties.objectType}</span>
                    </div>
                  )}
                  {properties.tag && (
                    <div className="flex justify-between border-b border-[#3f3f5a]/50 pb-1">
                      <span className="text-slate-400">Tag</span>
                      <span className="font-mono text-slate-200">{properties.tag}</span>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Type Properties */}
            {properties.typeProperties && (
              <section className="bg-[#252538] rounded-md border border-[#3f3f5a] overflow-hidden">
                <div
                  onClick={() => toggleSection('typeProps')}
                  className="px-3 py-2 bg-[#2a2a40] flex items-center justify-between cursor-pointer hover:bg-[#32324e] transition text-xs font-semibold text-slate-200"
                >
                  <div className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-purple-400" />
                    <span>Type Definition</span>
                  </div>
                  {collapsedSections['typeProps'] ? (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>

                {!collapsedSections['typeProps'] && (
                  <div className="p-2.5 space-y-1.5 text-xs">
                    {properties.typeProperties.name && (
                      <div className="flex justify-between border-b border-[#3f3f5a]/50 pb-1">
                        <span className="text-slate-400">Type Name</span>
                        <span className="text-purple-300 font-medium">{properties.typeProperties.name}</span>
                      </div>
                    )}
                    {properties.typeProperties.expressID && (
                      <div className="flex justify-between border-b border-[#3f3f5a]/50 pb-1">
                        <span className="text-slate-400">Type ID</span>
                        <span className="font-mono text-slate-300">#{properties.typeProperties.expressID}</span>
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}

            {/* Material Properties */}
            {properties.materialProperties && properties.materialProperties.length > 0 && (
              <section className="bg-[#252538] rounded-md border border-[#3f3f5a] overflow-hidden">
                <div
                  onClick={() => toggleSection('materials')}
                  className="px-3 py-2 bg-[#2a2a40] flex items-center justify-between cursor-pointer hover:bg-[#32324e] transition text-xs font-semibold text-slate-200"
                >
                  <div className="flex items-center gap-1.5">
                    <Box className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Materials</span>
                  </div>
                  {collapsedSections['materials'] ? (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>

                {!collapsedSections['materials'] && (
                  <div className="p-2.5 space-y-2 text-xs">
                    {properties.materialProperties.map((mat, i) => (
                      <div key={i} className="flex justify-between items-center border-b border-[#3f3f5a]/50 pb-1">
                        <span className="text-slate-200 font-medium">{mat.name}</span>
                        <span className="font-mono text-[11px] text-slate-400">#{mat.expressID}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Property Sets (Psets) */}
            {filteredPsets.map((pset) => {
              const isCollapsed = collapsedSections[pset.name];
              return (
                <section
                  key={pset.name}
                  className="bg-[#252538] rounded-md border border-[#3f3f5a] overflow-hidden"
                >
                  <div
                    onClick={() => toggleSection(pset.name)}
                    className="px-3 py-2 bg-[#2a2a40] flex items-center justify-between cursor-pointer hover:bg-[#32324e] transition text-xs font-semibold text-slate-200"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <Hash className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span className="truncate">{pset.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] text-slate-400 font-normal">
                        {pset.properties.length}
                      </span>
                      {isCollapsed ? (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {!isCollapsed && (
                    <div className="p-2.5 space-y-1.5 text-xs">
                      {pset.properties.map((p, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-baseline gap-2 border-b border-[#3f3f5a]/40 pb-1 last:border-0"
                        >
                          <span className="text-slate-400 truncate" title={p.name}>
                            {p.name}
                          </span>
                          <span className="text-slate-200 font-medium font-mono text-right shrink-0">
                            {String(p.value)} {p.unit ? <span className="text-slate-400 font-sans">{p.unit}</span> : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}

            {filteredPsets.length === 0 && searchQuery && (
              <div className="text-center py-6 text-xs text-slate-400">
                Không tìm thấy thuộc tính khớp với "{searchQuery}"
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};
