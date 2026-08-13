import { exportDungeon } from "@mapgen/dungeon-renderer";
import { generateMinimumDungeon } from "@mapgen/generator-core";
import type { DungeonLayout } from "@mapgen/layout-schema";
import { useMemo, useState } from "react";

import { CandidateMap } from "./CandidateMap";
import { DungeonViewport } from "./DungeonViewport";

interface Controls {
  readonly seed: number;
  readonly width: number;
  readonly height: number;
  readonly corridorWidth: number;
  readonly doorOpenRate: number;
}

const DEFAULTS: Controls = {
  seed: 104729,
  width: 160,
  height: 160,
  corridorWidth: 4,
  doorOpenRate: 0.5,
};

function makeCandidates(controls: Controls): DungeonLayout[] {
  return Array.from({ length: 10 }, (_, index) => generateMinimumDungeon({
    seed: (controls.seed + index) >>> 0,
    width: controls.width,
    height: controls.height,
    corridorWidth: controls.corridorWidth,
    doorOpenRate: controls.doorOpenRate,
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
  const [controls, setControls] = useState<Controls>(DEFAULTS);
  const [generatedControls, setGeneratedControls] = useState<Controls>(DEFAULTS);
  const [candidates, setCandidates] = useState(() => makeCandidates(DEFAULTS));
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showColliders, setShowColliders] = useState(false);
  const [exportState, setExportState] = useState<"idle" | "working" | "done" | "error">("idle");
  const selected = candidates[selectedIndex]!;
  const isStale = useMemo(
    () => JSON.stringify(controls) !== JSON.stringify(generatedControls),
    [controls, generatedControls],
  );

  const updateNumber = (key: keyof Controls, value: number) => {
    setControls((current) => ({ ...current, [key]: value }));
    setExportState("idle");
  };

  const regenerate = () => {
    setCandidates(makeCandidates(controls));
    setGeneratedControls(controls);
    setSelectedIndex(0);
    setExportState("idle");
  };

  const exportSelected = async () => {
    setExportState("working");
    try {
      const exported = await exportDungeon(selected);
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
        <div className="masthead__mark" aria-hidden="true">M/01</div>
        <div>
          <p className="eyebrow">GODOT-BOUND PROCEDURAL CARTOGRAPHY</p>
          <h1>地下城测绘台</h1>
        </div>
        <div className="masthead__status">
          <span className="status-light" />
          MINIMUM SLICE<br />SCHEMA V1
        </div>
      </header>

      <section className="control-rail" aria-label="生成参数">
        <div className="control-rail__heading">
          <span>GENERATOR CONTROL</span>
          <button type="button" className="text-button" onClick={() => setControls(DEFAULTS)}>恢复默认</button>
        </div>
        <label>
          <span>基础 Seed</span>
          <input
            aria-label="基础 Seed"
            type="number"
            min="0"
            max="4294967295"
            value={controls.seed}
            onChange={(event) => updateNumber("seed", Number(event.target.value))}
          />
        </label>
        <div className="control-pair">
          <label>
            <span>地图宽度</span>
            <input aria-label="地图宽度" type="number" min="32" max="512" value={controls.width} onChange={(event) => updateNumber("width", Number(event.target.value))} />
          </label>
          <label>
            <span>地图深度</span>
            <input aria-label="地图深度" type="number" min="24" max="512" value={controls.height} onChange={(event) => updateNumber("height", Number(event.target.value))} />
          </label>
        </div>
        <label className="range-control">
          <span>走廊宽度 <output>{controls.corridorWidth} m</output></span>
          <input aria-label="走廊宽度" type="range" min="2" max="8" step="1" value={controls.corridorWidth} onChange={(event) => updateNumber("corridorWidth", Number(event.target.value))} />
        </label>
        <label className="range-control">
          <span>门开启率 <output>{Math.round(controls.doorOpenRate * 100)}%</output></span>
          <input aria-label="门开启率" type="range" min="0" max="1" step="0.01" value={controls.doorOpenRate} onChange={(event) => updateNumber("doorOpenRate", Number(event.target.value))} />
        </label>
        <button type="button" className="primary-button" onClick={regenerate}>
          <span>生成 10 个候选</span><b>↗</b>
        </button>
        {isStale && <p className="stale-note">参数已改变 · 请重新生成</p>}
      </section>

      <section className="candidate-strip" aria-label="候选地图">
        <div className="section-label"><span>01</span> 候选图纸 / SELECT ONE</div>
        <div className="candidate-grid">
          {candidates.map((layout, index) => (
            <CandidateMap key={layout.exportId} index={index} layout={layout} selected={index === selectedIndex} onSelect={() => { setSelectedIndex(index); setExportState("idle"); }} />
          ))}
        </div>
      </section>

      <section className="preview-stage">
        <div className="preview-stage__heading">
          <div>
            <div className="section-label"><span>02</span> 三维校样 / INSPECTION</div>
            <p>当前候选 {String(selectedIndex + 1).padStart(2, "0")} / 10</p>
          </div>
          <label className="switch">
            <input type="checkbox" checked={showColliders} onChange={(event) => setShowColliders(event.target.checked)} />
            <span>显示碰撞盒</span>
          </label>
        </div>
        <div className="viewport-frame">
          <DungeonViewport layout={selected} showColliders={showColliders} />
          <span className="corner corner--tl" /><span className="corner corner--tr" />
          <span className="corner corner--bl" /><span className="corner corner--br" />
          <div className="viewport-caption">LMB ORBIT · RMB PAN · WHEEL ZOOM</div>
        </div>
      </section>

      <aside className="readout" aria-label="选中地图详情">
        <div className="section-label"><span>03</span> 导出读数 / MANIFEST</div>
        <dl>
          <div><dt>Seed</dt><dd>Seed {selected.seed}</dd></div>
          <div><dt>Grid</dt><dd>{selected.grid.width} × {selected.grid.height}</dd></div>
          <div><dt>Rooms</dt><dd>{String(selected.rooms.length).padStart(2, "0")}</dd></div>
          <div><dt>Corridors</dt><dd>{String(selected.corridors.length).padStart(2, "0")}</dd></div>
          <div><dt>Colliders</dt><dd>{String(selected.colliders.length).padStart(2, "0")}</dd></div>
          <div><dt>Doors</dt><dd>{selected.doors.map((door) => door.open ? "OPEN" : "SHUT").join(" / ")}</dd></div>
        </dl>
        <div className="export-box">
          <code>{selected.exportId}</code>
          <button type="button" className="export-button" disabled={isStale || exportState === "working"} onClick={() => void exportSelected()}>
            {exportState === "working" ? "正在封装…" : "导出 GLB + JSON"}
          </button>
          <p className={`export-message export-message--${exportState}`}>
            {exportState === "done" && "配对文件已下载"}
            {exportState === "error" && "导出失败，请查看控制台"}
            {exportState === "idle" && "Godot 导入插件将校验配对摘要"}
          </p>
        </div>
      </aside>

      <footer>
        <span>MAPGEN // LOCAL TOOLCHAIN</span>
        <span>Y-UP · RIGHT-HANDED · 1 GRID = 1 M</span>
      </footer>
    </main>
  );
}
