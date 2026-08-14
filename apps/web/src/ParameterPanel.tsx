import type { DungeonAppearance, DungeonParameters, NumericRange } from "@mapgen/layout-schema";
import type { GeneratorControls } from "./App";
import { DOOR_FRAME_TEXTURE_OPTIONS, FLOOR_TEXTURE_OPTIONS, WALL_TEXTURE_OPTIONS } from "./material-catalog";

interface Props {
  readonly controls: GeneratorControls;
  readonly appearance: DungeonAppearance;
  readonly stale: boolean;
  readonly onChange: (controls: GeneratorControls) => void;
  readonly onAppearanceChange: (appearance: DungeonAppearance) => void;
  readonly onReset: () => void;
  readonly onGenerate: () => void;
}
type RangeKey = Exclude<keyof DungeonParameters, "width" | "height" | "mode" | "layoutWeights" | "roomCornerStyle">;
const FIELDS: readonly [RangeKey, string, number, number, number, "空间" | "拓扑" | "美术"][] = [
  ["largeCellSize", "大格尺寸", 10, 50, 1, "空间"], ["roomRate", "房间密度", 0, 1, .01, "空间"],
  ["roomSize", "房间尺寸倍率", .5, 1.5, .01, "空间"], ["roomMinSize", "房间最小尺寸", 6, 20, 1, "空间"],
  ["roomMaxSize", "房间最大尺寸", 18, 48, 1, "空间"], ["roomCountMin", "房间数下限", 4, 12, 1, "空间"],
  ["roomCountMax", "房间数上限", 10, 40, 1, "空间"], ["corridorWidth", "走廊宽度", 2, 8, 1, "空间"],
  ["loopRate", "环路率", 0, 1, .01, "拓扑"], ["deadEndRate", "死路率", 0, 1, .01, "拓扑"],
  ["branchTryMultiplier", "分支尝试倍率", 0, 20, 1, "拓扑"], ["branchFromProtectedChance", "主路径分支概率", 0, 1, .01, "拓扑"],
  ["linearWingChance", "直线翼概率", 0, 1, .01, "拓扑"], ["mirrorXChance", "水平镜像概率", 0, 1, .01, "拓扑"],
  ["doorOpenRate", "门开启率", 0, 1, .01, "拓扑"],
  ["roomVariationRate", "房间变体比例", 0, 1, .01, "美术"],
  ["floorVariationRate", "地板变体比例", 0, 1, .01, "美术"], ["wallVariationRate", "墙体变体比例", 0, 1, .01, "美术"],
];

export function ParameterPanel({ controls, appearance, stale, onChange, onAppearanceChange, onReset, onGenerate }: Props) {
  const update = (patch: Partial<DungeonParameters>) => onChange({ ...controls, parameters: { ...controls.parameters, ...patch } });
  const updateAppearance = (patch: Partial<DungeonAppearance>) => onAppearanceChange({ ...appearance, ...patch });
  const updateRange = (key: RangeKey, index: 0 | 1, value: number) => {
    const current = controls.parameters[key] as NumericRange;
    update({ [key]: index === 0
      ? [value, Math.max(value, current[1])]
      : [Math.min(current[0], value), value] });
  };
  const fields = (group: "空间" | "拓扑" | "美术") => FIELDS.filter((field) => field[5] === group).map(([key, label, min, max, step]) => (
    <RangeInputs key={key} label={label} value={controls.parameters[key]} min={min} max={max} step={step} onChange={(index, value) => updateRange(key, index, value)} />
  ));

  return <section className="control-rail" aria-label="生成参数">
    <div className="control-rail__heading"><span>GENERATOR CONTROL</span><button type="button" className="text-button" onClick={onReset}>恢复原版默认</button></div>
    <label><span>基础 Seed</span><input aria-label="基础 Seed" type="number" min="0" max="4294967295" value={controls.seed} onChange={(event) => onChange({ ...controls, seed: Number(event.target.value) >>> 0 })} /></label>
    <label><span>布局模式</span><select aria-label="布局模式" value={controls.parameters.mode} onChange={(event) => update({ mode: event.target.value as DungeonParameters["mode"] })}>
      <option value="random">Random / 加权随机</option><option value="hub">Hub / 中心辐射</option><option value="ring">Ring / 环形</option><option value="branch">Branch / 分支</option>
    </select></label>
    <div className="control-pair">
      <label><span>地图宽度</span><input aria-label="地图宽度" type="number" min="16" max="512" value={controls.parameters.width} onChange={(event) => update({ width: Number(event.target.value) })} /></label>
      <label><span>地图深度</span><input aria-label="地图深度" type="number" min="16" max="512" value={controls.parameters.height} onChange={(event) => update({ height: Number(event.target.value) })} /></label>
    </div>
    <details open><summary>空间与房间参数</summary>{fields("空间")}</details>
    <details><summary>拓扑与门参数</summary>{fields("拓扑")}</details>
    <details open><summary>Kenney Building Kit 模块</summary><label><span>房间角落样式</span><select aria-label="房间角落样式" value={controls.parameters.roomCornerStyle} onChange={(event) => update({ roomCornerStyle: event.target.value as DungeonParameters["roomCornerStyle"] })}>
      <option value="column">COLUMN / 立柱直角</option><option value="diagonal">DIAGONAL / 削角</option><option value="round">ROUND / 圆角</option>
    </select></label>{fields("美术")}</details>
    <details open><summary>表面材质（即时预览）</summary>
      <p className="control-help">仅影响外观，不会重新生成房间与走廊。门框可贴图，门扇保持 Kenney 原色。</p>
      <label><span>墙体纹理</span><select aria-label="墙体纹理" value={appearance.wallTextureId} onChange={(event) => updateAppearance({ wallTextureId: event.target.value })}>
        {WALL_TEXTURE_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select></label>
      <label><span>墙体纹理覆盖尺寸（米）</span><input aria-label="墙体纹理覆盖尺寸" type="number" min="0.25" max="32" step="0.25" value={appearance.wallCoverageMeters} onChange={(event) => updateAppearance({ wallCoverageMeters: Math.min(32, Math.max(0.25, Number(event.target.value) || 0.25)) })} /></label>
      <label><span>地面纹理</span><select aria-label="地面纹理" value={appearance.floorTextureId} onChange={(event) => updateAppearance({ floorTextureId: event.target.value })}>
        {FLOOR_TEXTURE_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select></label>
      <label><span>地面纹理覆盖尺寸（米）</span><input aria-label="地面纹理覆盖尺寸" type="number" min="0.25" max="32" step="0.25" value={appearance.floorCoverageMeters} onChange={(event) => updateAppearance({ floorCoverageMeters: Math.min(32, Math.max(0.25, Number(event.target.value) || 0.25)) })} /></label>
      <label><span>门框纹理</span><select aria-label="门框纹理" value={appearance.doorFrameTextureId ?? "follow-wall"} onChange={(event) => updateAppearance({ doorFrameTextureId: event.target.value })}>
        {DOOR_FRAME_TEXTURE_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select></label>
      <label><span>门框纹理覆盖尺寸（米）</span><input aria-label="门框纹理覆盖尺寸" type="number" min="0.25" max="32" step="0.25" value={appearance.doorFrameCoverageMeters ?? appearance.wallCoverageMeters} onChange={(event) => updateAppearance({ doorFrameCoverageMeters: Math.min(32, Math.max(0.25, Number(event.target.value) || 0.25)) })} /></label>
    </details>
    <details><summary>Random 模式权重</summary><div className="control-triplet">
      {(["hub", "ring", "branch"] as const).map((mode) => <label key={mode}><span>{mode.toUpperCase()}</span><input aria-label={`${mode} 权重`} type="number" min="0" max="1" step="0.01" value={controls.parameters.layoutWeights[mode]} onChange={(event) => update({ layoutWeights: { ...controls.parameters.layoutWeights, [mode]: Number(event.target.value) } })} /></label>)}
    </div></details>
    <button type="button" className="primary-button" onClick={onGenerate}><span>生成 10 个候选</span><b>→</b></button>
    {stale && <p className="stale-note">参数已改变 · 请重新生成</p>}
  </section>;
}

function RangeInputs(props: { readonly label: string; readonly value: NumericRange; readonly min: number; readonly max: number; readonly step: number; readonly onChange: (index: 0 | 1, value: number) => void }) {
  return <fieldset className="range-pair"><legend>{props.label}</legend>
    <label><span>MIN</span><input aria-label={`${props.label}最小值`} type="number" min={props.min} max={props.max} step={props.step} value={props.value[0]} onChange={(event) => props.onChange(0, Number(event.target.value))} /></label>
    <label><span>MAX</span><input aria-label={`${props.label}最大值`} type="number" min={props.min} max={props.max} step={props.step} value={props.value[1]} onChange={(event) => props.onChange(1, Number(event.target.value))} /></label>
  </fieldset>;
}
