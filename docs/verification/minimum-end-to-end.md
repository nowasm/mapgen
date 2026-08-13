# 最小端到端切片验证记录

- 验证日期：2026-08-13
- Node.js：22.18.0
- pnpm：10.15.1
- Godot：4.6.2 stable
- 固定 Seed：104729

## 已验证链路

```text
生成器核心
  → DungeonLayout v1
  → Three.js 普通 Mesh
  → GLB + layout.json（SHA-256 配对）
  → Godot GLTFDocument
  → VisualModel + 原生盒碰撞 + PlayerSpawn
  → PackedScene / .tscn
  → 重新加载并实例化
```

固定样本位于 `godot/test-project/fixtures`，由 `pnpm generate:fixture` 生成：

- `dungeon-minimum-00019919-160x160.glb`
- `dungeon-minimum-00019919-160x160.layout.json`

## 自动验证

### TypeScript 与 Web

```powershell
pnpm test
pnpm typecheck
pnpm build
```

覆盖：

- DungeonLayout v1 合法与非法数据。
- Seed 与门状态确定性。
- 房间、走廊、出生点及碰撞盒约束。
- Three.js 节点分组、居中边界和导出元数据。
- GLB 魔数、SHA-256 和 JSON 配对。
- 10 个候选生成、候选选择和参数更新。

### Godot 无界面测试

```powershell
& 'D:\tools\Godot_v4.6.2-stable_win64\Godot_v4.6.2-stable_win64_console.exe' `
  --headless --path godot --script res://test-project/tests/import_smoke_test.gd
```

期望关键输出：

```text
MAPGEN_GODOT_SMOKE_OK colliders=16 scene=user://mapgen-smoke-dungeon.tscn
```

测试会真实执行：

- 校验 GLB 与 JSON 的 SHA-256 配对。
- 使用 `GLTFDocument.append_from_file()` 和 `generate_scene()` 载入 GLB。
- 创建 16 个 `BoxShape3D` 碰撞、`PlayerSpawn` 和元数据。
- 保存 `.tscn`，重新加载并实例化。
- 验证摘要错配被拒绝。
- 验证未授权覆盖已有场景被拒绝。

编辑器模式还使用下列命令验证插件能被启用和初始化：

```powershell
& 'D:\tools\Godot_v4.6.2-stable_win64\Godot_v4.6.2-stable_win64_console.exe' `
  --headless --editor --path godot --quit
```

## 浏览器人工检查

在真实 Chromium/WebGL 环境检查了：

- 中文排版、三栏测绘工作台和可横向滚动的候选条。
- 10 个候选缩略图与选中状态。
- 斜俯视地牢模型、OrbitControls 和碰撞盒开关。
- 浏览器控制台没有错误或警告。

首次载入时 WebGL 着色器编译可能使三维模型延迟约一至两秒出现。

## 第一阶段已知限制

- 只有两个占位房间和一条直走廊。
- 尚未实现 Hub、Ring、Branch、完整房间参数和图优先布局。
- 使用程序化材质与方块模型，尚未转换 RPG-Cobo 的 `.vox` 资源。
- 网页端尚未加入 Rapier 第三人称角色。
- 生产 JS 包约 787 KB（gzip 约 213 KB）；后续可按需懒加载 Three.js 导出器。

下一阶段优先实现图优先的多房间布局，而不是继续扩展第一阶段占位模型。
