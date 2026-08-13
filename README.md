# Mapgen

面向 Godot 的房间—走廊式三维地下城生成器。网页端确定性生成、预览并导出配对的 GLB 与布局 JSON；Godot 4 插件将它们固定烘焙成带原生碰撞和出生点的可编辑 `.tscn` 场景。

当前已实现单层、无屋顶的多房间地下城：Hub、Ring、Branch 与加权 Random 四种拓扑，完整的原版默认参数范围，门洞感知墙体、固定门状态及角色可行走碰撞。墙、石地板和门的外观来自 RPG-Cobo 默认 VOX 素材，经过离线、可追溯转换后随网页和 GLB 使用。

## 本地运行

需要 Node.js 22 与 pnpm 10：

```powershell
pnpm install
pnpm dev
```

打开 `http://127.0.0.1:5173/`。在左侧修改 Seed、布局模式和参数区间，点击“生成 10 个候选”，选中候选后可检查三维模型、显示碰撞体，并导出：

```text
dungeon-<exportId>.glb
dungeon-<exportId>.layout.json
```

两个文件必须同名、同目录；JSON 保存 GLB SHA-256，Godot 插件会拒绝错配文件。

## 导入 Godot

将 [Godot 插件](godot/addons/mapgen_importer) 复制到目标 Godot 4 工程的 `addons/mapgen_importer`，在 **Project Settings → Plugins** 启用 **Mapgen Importer**。在右侧 **Mapgen Baker** 面板选择 `*.layout.json` 后烘焙，可得到：

```text
DungeonRoot
├── VisualModel
├── Collision/StaticBody3D/CollisionShape3D...
├── PlayerSpawn
└── DungeonMetadata
```

## 验证

```powershell
pnpm test
pnpm typecheck
pnpm build
pnpm assets:build
pnpm generate:fixture

& 'D:\tools\Godot_v4.6.2-stable_win64\Godot_v4.6.2-stable_win64_console.exe' `
  --headless --path godot --script res://test-project/tests/import_smoke_test.gd
```

固定样本 seed 104729 当前生成 11 个 Hub 房间和 149 个 Godot 原生碰撞体。详细证据见 [多房间端到端验证记录](docs/verification/multi-room-end-to-end.md)。

`pnpm assets:build` 仅在需要从相邻的 `../rpgcobo-tool` 更新视觉包时执行；正常安装、生成、测试和导出使用仓库内已经转换好的 [视觉包](assets/rpgcobo/dungeon-visual-pack.json)。来源、哈希、修改说明及 Apache-2.0 归属见 [资源清单](assets/rpgcobo/SOURCE_MANIFEST.md)。

## 文档

- [地下城地图生成器设计](docs/plans/2026-08-13-dungeon-map-generator-design.md)
- [多房间实现计划](docs/plans/2026-08-13-multi-room-dungeon-implementation.md)
- [RPG-Cobo 视觉包设计](docs/plans/2026-08-13-rpgcobo-dungeon-visual-pack-design.md)
- [架构决策记录](docs/adr/README.md)

原 RPG-Cobo 仓库仅作为行为与资源参考；资源迁移必须保留来源和许可信息。
