# Mapgen

面向 Godot 的房间—走廊式三维地下城生成器。

项目采用浏览器生成器与 Godot 导入插件分离的架构：网页端生成、预览并导出
`dungeon.glb` 与 `dungeon.layout.json`，Godot 插件将两者烘焙成带原生碰撞和出生点的
`.tscn` 场景。

当前仓库处于设计阶段。完整规格见：

- [地下城地图生成器设计](docs/plans/2026-08-13-dungeon-map-generator-design.md)
- [架构决策记录](docs/adr/README.md)

原 RPG-Cobo 仓库仅作为行为与资源参考；资源迁移必须保留来源和许可信息。
