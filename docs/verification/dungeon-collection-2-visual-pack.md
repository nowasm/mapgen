# Dungeon Collection 2 视觉包验证

- 验证日期：2026-08-13
- 视觉包：`dungeon-collection-2` v1
- 许可状态：`UNSPECIFIED (user-provided)`
- 转换结果 SHA-256：`af2e36575b37190d2195f385a6d4adf16f92f19680f792cfc62f9449410fe517`
- 选用模型：`struct_floor_normal`、`struct_wall_straight_main`、`struct_block_normal`、`prop_wall_big_door_wood`

转换器解析 OBJ 顶点和多边形、三角化表面、读取 MTL 漫反射颜色，并为八个输入文件保存 SHA-256。连续执行两次 `pnpm assets:build` 应生成字节一致的 JSON。

渲染器按实际模块尺寸重复地面和墙模型，门框及门扇适配语义盒；碰撞继续来自布局 JSON 的简化盒。固定样本通过 Godot 4.6.2 的 GLB 导入、197 个原生碰撞创建、PackedScene 保存与重载。

```text
MAPGEN_GODOT_SMOKE_OK colliders=197 scene=user://mapgen-smoke-dungeon.tscn
```
