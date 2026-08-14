# Mapgen

面向 Godot 的房间—走廊式三维地下城生成器。网页端确定性生成、预览并导出配对的 GLB 与布局 JSON；Godot 4 插件将它们固定烘焙成带原生碰撞和出生点的可编辑 `.tscn` 场景。

当前已实现单层、无屋顶的多房间地下城：Hub、Ring、Branch 与加权 Random 四种拓扑，完整的原版默认参数范围，门洞感知墙体、固定门状态及角色可行走碰撞。房间和走廊使用仓库内 Kenney Building Kit 的独立地板、直墙、角落、门框与门扇 OBJ/MTL/PNG 资源拼装，经过离线、可追溯转换后随网页和 GLB 使用。参数面板可在全图范围选择立柱直角、削角或圆角，默认采用 2 米原生圆角模块，并可控制房间尺寸和表面变体。门固定为单开 C 型：立柱直角使用方门，其余角落使用圆门。

表面材质与布局生成相互独立。左侧“表面材质（即时预览）”可分别选择墙体、地面和门框纹理与覆盖尺寸；默认使用 `bricks_and_tiles` 的 `Textures_2/001` 墙面和 `Textures_2/002` 地砖，门框默认跟随墙体，也可让任一表面恢复 Kenney 原始颜色。修改材质不会重新生成候选地图。门扇始终保留 Kenney 原色。当前版本只接入 Base Color，导出的 GLB 会内嵌所选图片，配对 JSON 保存材质包、纹理 ID 与覆盖尺寸。

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

纹理覆盖尺寸表示“一张纹理在世界中覆盖多少米”：值越小重复越密，值越大图案越大。推荐墙体与地面从 `2 m` 开始调整。下载纹理的来源和 CC0 许可见 [纹理资源清单](assets/textures/bricks_and_tiles/SOURCE_MANIFEST.md)。

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

固定样本 seed 104729 当前生成 11 个 Hub 房间、275 个可编辑视觉模块和 464 个 Godot 原生碰撞体。详细证据见 [多房间端到端验证记录](docs/verification/multi-room-end-to-end.md)。

`pnpm assets:build` 用于从 [Kenney Building Kit](assets/kenney_building-kit) 重建静态 [视觉包](assets/kenney_building-kit/building-visual-pack.json)。构建时会把 colormap UV 烘焙为顶点色，保证导出的 GLB 不依赖外置纹理。使用模块、输入哈希和许可状态见 [资源清单](assets/kenney_building-kit/SOURCE_MANIFEST.md)。

## 文档

- [地下城地图生成器设计](docs/plans/2026-08-13-dungeon-map-generator-design.md)
- [多房间实现计划](docs/plans/2026-08-13-multi-room-dungeon-implementation.md)
- [Kenney 视觉包替换设计](docs/plans/2026-08-14-kenney-visual-pack-design.md)
- [Kenney Building Kit 模块化迁移设计](docs/plans/2026-08-14-kenney-building-kit-migration-design.md)
- [开启门铰链修复设计](docs/plans/2026-08-14-door-hinge-design.md)
- [表面纹理控制设计](docs/plans/2026-08-14-surface-texture-design.md)
- [表面纹理工作流验证](docs/verification/surface-texture-workflow.md)
- [架构决策记录](docs/adr/README.md)

Kenney 资源随包附带 CC0 许可文件；署名并非强制，但建议在项目 Credits 中标注 Kenney。
