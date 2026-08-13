# 多房间端到端验证记录

- 验证日期：2026-08-13
- Godot：4.6.2 stable
- 固定 Seed：104729
- 固定拓扑：Hub
- 样本规模：11 个房间、12 条走廊、24 扇门、149 个碰撞体

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
MAPGEN_GODOT_SMOKE_OK colliders=149 scene=user://mapgen-smoke-dungeon.tscn
```

## 当前边界

- 第一版只生成单层、无屋顶、普通模块化 3D 地牢。
- 门状态在生成时固定，不提供运行时开关逻辑。
- 当前使用程序化占位材质；RPG-Cobo 方块/材质资源的授权清单与替换仍是后续工作。
- 尚未加入第三人称斜俯视角色试玩控制器；碰撞与出生点已经可直接供 Godot 角色使用。
