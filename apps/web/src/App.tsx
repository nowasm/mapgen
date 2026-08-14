import { exportDungeon } from "@mapgen/dungeon-renderer";
import { DEFAULT_DUNGEON_PARAMETERS, generateDungeon } from "@mapgen/generator-core";
import type { DungeonAppearance, DungeonLayout, DungeonParameters } from "@mapgen/layout-schema";
import { useMemo, useState } from "react";

import { CandidateMap } from "./CandidateMap";
import { DungeonViewport } from "./DungeonViewport";
import { loadAppearanceTextures } from "./load-appearance-textures";
import { DEFAULT_DUNGEON_APPEARANCE } from "./material-catalog";
import { ParameterPanel } from "./ParameterPanel";

export interface GeneratorControls {
  readonly seed: number;
  readonly parameters: DungeonParameters;
}

const DEFAULTS: GeneratorControls = { seed: 104729, parameters: DEFAULT_DUNGEON_PARAMETERS };

function makeCandidates(controls: GeneratorControls): DungeonLayout[] {
  return Array.from({ length: 10 }, (_, index) => generateDungeon({
    seed: (controls.seed + index) >>> 0,
    parameters: controls.parameters,
  }));
}

function downloadBlob(fileName: string, blob: Blob): void {
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = fileName;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(href), 1_000);
}

export function App() {
  const [controls, setControls] = useState<GeneratorControls>(DEFAULTS);
  const [generatedControls, setGeneratedControls] = useState<GeneratorControls>(DEFAULTS);
  const [candidates, setCandidates] = useState(() => makeCandidates(DEFAULTS));
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showColliders, setShowColliders] = useState(false);
  const [appearance, setAppearance] = useState<DungeonAppearance>(DEFAULT_DUNGEON_APPEARANCE);
  const [exportState, setExportState] = useState<"idle" | "working" | "done" | "error">("idle");
  const selected = candidates[selectedIndex]!;
  const resolved = selected.resolvedParameters!;
  const topology = selected.diagnostics.topology!;
  const isStale = useMemo(() => JSON.stringify(controls) !== JSON.stringify(generatedControls), [controls, generatedControls]);

  const regenerate = () => {
    setCandidates(makeCandidates(controls));
    setGeneratedControls(controls);
    setSelectedIndex(0);
    setExportState("idle");
  };

  const exportSelected = async () => {
    setExportState("working");
    try {
      const textures = await loadAppearanceTextures(appearance);
      const exported = await exportDungeon(selected, { appearance, textures });
      downloadBlob(`${exported.baseName}.glb`, new Blob([exported.glb], { type: "model/gltf-binary" }));
      downloadBlob(`${exported.baseName}.layout.json`, new Blob([exported.layoutJson], { type: "application/json" }));
      setExportState("done");
    } catch (error) {
      console.error(error);
      setExportState("error");
    }
  };

  return (
    <main className="workbench">
      <header className="masthead">
        <div className="masthead__mark" aria-hidden="true">M/02</div>
        <div><p className="eyebrow">GODOT-BOUND PROCEDURAL CARTOGRAPHY</p><h1>地下城测绘台</h1></div>
        <div className="masthead__status"><span className="status-light" /> MULTI-ROOM<br />SCHEMA V1</div>
      </header>

      <ParameterPanel controls={controls} appearance={appearance} stale={isStale} onChange={(next) => { setControls(next); setExportState("idle"); }} onAppearanceChange={(next) => { setAppearance(next); setExportState("idle"); }} onReset={() => { setControls(DEFAULTS); setAppearance(DEFAULT_DUNGEON_APPEARANCE); setExportState("idle"); }} onGenerate={regenerate} />

      <section className="candidate-strip" aria-label="候选地图">
        <div className="section-label"><span>01</span> 候选图纸 / SELECT ONE</div>
        <div className="candidate-grid">
          {candidates.map((layout, index) => <CandidateMap key={layout.exportId} index={index} layout={layout} selected={index === selectedIndex} onSelect={() => { setSelectedIndex(index); setExportState("idle"); }} />)}
        </div>
      </section>

      <section className="preview-stage">
        <div className="preview-stage__heading">
          <div><div className="section-label"><span>02</span> 三维校样 / INSPECTION</div><p>当前候选 {String(selectedIndex + 1).padStart(2, "0")} / 10 · {resolved.topology.toUpperCase()}</p></div>
          <label className="switch"><input aria-label="显示碰撞体" type="checkbox" checked={showColliders} onChange={(event) => setShowColliders(event.target.checked)} /><span>显示碰撞体</span></label>
        </div>
        <div className="viewport-frame">
          <DungeonViewport layout={selected} showColliders={showColliders} appearance={appearance} />
          <span className="corner corner--tl" /><span className="corner corner--tr" /><span className="corner corner--bl" /><span className="corner corner--br" />
          <div className="viewport-caption">LMB ORBIT · RMB PAN · WHEEL ZOOM</div>
        </div>
      </section>

      <aside className="readout" aria-label="选中地图详情">
        <div className="section-label"><span>03</span> 导出读数 / MANIFEST</div>
        <dl>
          <div><dt>Seed</dt><dd>Seed {selected.seed}</dd></div><div><dt>Topology</dt><dd>{resolved.topology.toUpperCase()}</dd></div>
          <div><dt>Grid</dt><dd>{selected.grid.width} × {selected.grid.height}</dd></div><div><dt>Rooms</dt><dd>{String(selected.rooms.length).padStart(2, "0")}</dd></div>
          <div><dt>Edges / Loops</dt><dd>{topology.edgeCount} / {topology.loopCount}</dd></div><div><dt>Dead Ends</dt><dd>{topology.deadEndCount}</dd></div>
          <div><dt>Corridor</dt><dd>{resolved.corridorWidth} m</dd></div><div><dt>Colliders</dt><dd>{String(selected.colliders.length).padStart(2, "0")}</dd></div>
          <div><dt>Visual Pack</dt><dd>{selected.assetPack.id}</dd></div>
          <div><dt>Wall / Floor / Frame</dt><dd>{appearance.wallTextureId}<br />{appearance.floorTextureId}<br />{appearance.doorFrameTextureId ?? "follow-wall"}</dd></div>
          <div><dt>Doors</dt><dd>{selected.doors.filter(({ open }) => open).length} OPEN / {selected.doors.filter(({ open }) => !open).length} SHUT</dd></div>
        </dl>
        <div className="export-box">
          <code>{selected.exportId}</code>
          <button type="button" className="export-button" disabled={isStale || exportState === "working"} onClick={() => void exportSelected()}>{exportState === "working" ? "正在封装…" : "导出 GLB + JSON"}</button>
          <p className={`export-message export-message--${exportState}`}>
            {exportState === "done" && "配对文件已下载。"}{exportState === "error" && "导出失败，请查看控制台。"}{exportState === "idle" && (isStale ? "参数已改变，请重新生成后导出。" : "Godot 导入插件将校验配对摘要。")}
          </p>
        </div>
      </aside>
      <footer><span>MAPGEN // LOCAL TOOLCHAIN</span><span>Y-UP · RIGHT-HANDED · 1 GRID = 1 M</span></footer>
    </main>
  );
}
