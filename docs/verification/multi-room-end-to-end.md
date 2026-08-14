# 多房间端到端验证记录

- 验证日期：2026-08-14
- Godot：4.6.2 stable
- 固定 Seed：104729
- 固定拓扑：Hub
- 房间角落样式：`round`
- 视觉资源：Kenney Building Kit 独立模块
- 样本规模：11 个房间、10 条走廊、20 个原生窄门入口、275 个视觉模块、464 个碰撞体

## 已验证链路

```text
参数范围 + Seed → Hub / Ring / Branch 拓扑图 → 格点房间与正交走廊
→ 门洞感知模块 + 碰撞 → Three.js GLB + layout.json（SHA-256 配对）
→ Godot GLTFDocument → VisualModel + StaticBody3D + PlayerSpawn
→ PackedScene 保存、重载并实例化
```

生成器测试覆盖同一 Seed 的确定性、加权 Random、三种拓扑的连通性和唯一格点，以及 100×3 个布局在地图边界内、房间不重叠、正交走廊与引用完整性。几何测试验证门洞扣除、走廊不封端、关闭门有碰撞而开启门无碰撞。

固定配对样本位于 `godot/test-project/fixtures/dungeon-dungeon-00019919-hub.*`，由 `pnpm generate:fixture` 生成。

Godot 无界面测试命令：

```powershell
& 'D:\tools\Godot_v4.6.2-stable_win64\Godot_v4.6.2-stable_win64_console.exe' `
  --headless --path godot --script res://test-project/tests/import_smoke_test.gd
```

关键输出：

```text
MAPGEN_GODOT_SMOKE_OK colliders=464 scene=user://mapgen-smoke-dungeon.tscn
```

房间尺寸继续由布局参数决定，不再限制为固定 prefab。`roomCornerStyle` 在全图范围选择 `column`、`diagonal` 或 `round`：三者分别使用 `wall-corner-column`、`wall-corner-diagonal`、`wall-corner-round`；削角与圆角还分别搭配同名角落地板。直角使用 L 形盒体，削角使用斜向盒体，圆弧碰撞由每角六段盒体近似。走廊使用普通地板和两条独立侧墙。所有入口固定为原始尺寸的单开 C 型窄门：`column` 使用方形门框与 `door-rotate-square-c`，`diagonal` 和 `round` 使用圆形门框与 `door-rotate-round-c`。4 米通道也只扣除 2 米门槽，门框两侧和上方由墙体闭合；门扇打开时从侧边铰链朝所属房间内部旋转。门框使用三个简单盒体碰撞，开启门不生成门扇碰撞。

## 当前边界

- 第一版只生成单层、无屋顶、普通模块化 3D 地牢。
- 门状态在生成时固定，不提供运行时开关逻辑。
- 房间、走廊、地板、直墙、三种角落、方/圆门框和门扇已统一使用 Kenney Building Kit OBJ/MTL/PNG 派生视觉包；窗、楼梯和装饰物仍是后续工作。
- 尚未加入第三人称斜俯视角色试玩控制器；碰撞与出生点已经可直接供 Godot 角色使用。
