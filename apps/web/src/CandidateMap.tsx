import type { DungeonLayout } from "@mapgen/layout-schema";

interface Props { readonly index: number; readonly layout: DungeonLayout; readonly selected: boolean; readonly onSelect: () => void }
export function CandidateMap({ index, layout, selected, onSelect }: Props) {
  const roomFill = selected ? "#d29853" : "#b8ae90";
  const corridorFill = selected ? "#f0c981" : "#817b68";
  return <button className={`candidate ${selected ? "candidate--selected" : ""}`} type="button" aria-label={`候选地图 ${index + 1}，Seed ${layout.seed}`} aria-pressed={selected} onClick={onSelect}>
    <span className="candidate__number">{String(index + 1).padStart(2, "0")}</span>
    <svg viewBox={`0 0 ${layout.grid.width} ${layout.grid.height}`} aria-hidden="true"><rect width={layout.grid.width} height={layout.grid.height} className="candidate__paper" />
      {layout.corridors.map((corridor) => <rect key={corridor.id} x={corridor.x} y={corridor.z} width={corridor.width} height={corridor.depth} fill={corridorFill} />)}
      {layout.rooms.map((room) => <rect key={room.id} x={room.x} y={room.z} width={room.width} height={room.depth} fill={roomFill} />)}
    </svg><span className="candidate__seed">{layout.seed}</span><span className="candidate__mode">{layout.resolvedParameters?.topology.toUpperCase()}</span>
  </button>;
}
