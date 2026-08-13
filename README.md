# Mapgen

面向 Godot 的房间—走廊式三维地下城生成器。网页端生成、预览并导出配对的 GLB 与
布局 JSON；Godot 4 插件将它们固定烘焙成带原生碰撞和出生点的可编辑 `.tscn` 场景。

当前完成的是第一阶段最小端到端切片：两个房间、一条走廊和两个固定状态门。它用于验证
坐标、导出契约和 Godot 管线，尚不是完整 Dungeon 算法。

## 本地运行

需要 Node.js 22 与 pnpm 10：

```powershell
pnpm install
pnpm dev
```

打开 `http://127.0.0.1:5173/`。修改 Seed、地图尺寸、走廊宽度和门开启率，点击
“生成 10 个候选”，选择候选后可观察三维模型、显示碰撞盒并导出：

```text
dungeon-<exportId>.glb
dungeon-<exportId>.layout.json
```

两个文件必须保持同名并放在同一目录。JSON 保存 GLB SHA-256，Godot 插件会拒绝错配。

## 导入 Godot

将 [Godot 插件](godot/addons/mapgen_importer) 复制到目标 Godot 4 工程的
`addons/mapgen_importer`，在 **Project Settings → Plugins** 中启用 **Mapgen Importer**。
右侧 **Mapgen Baker** 面板选择 `*.layout.json` 后点击烘焙，即可得到：

```text
DungeonRoot
├── VisualModel
├── Collision/StaticBody3D/CollisionShape3D...
├── PlayerSpawn
└── DungeonMetadata
```

详细操作见 [Godot 插件说明](godot/README.md)。

## 验证

```powershell
pnpm test
pnpm typecheck
pnpm build
pnpm generate:fixture

& 'D:\tools\Godot_v4.6.2-stable_win64\Godot_v4.6.2-stable_win64_console.exe' `
  --headless --path godot --script res://test-project/tests/import_smoke_test.gd
```

完整验证证据见 [最小端到端验证记录](docs/verification/minimum-end-to-end.md)。

## 文档

- [地下城地图生成器设计](docs/plans/2026-08-13-dungeon-map-generator-design.md)
- [第一阶段实施计划](docs/plans/2026-08-13-minimum-end-to-end-implementation.md)
- [架构决策记录](docs/adr/README.md)

原 RPG-Cobo 仓库仅作为行为与资源参考；资源迁移必须保留来源和许可信息。
