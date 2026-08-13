# RPG-Cobo 地牢视觉包验证

- 验证日期：2026-08-13
- 上游许可：Apache-2.0
- 视觉包：`rpgcobo-dungeon-stone` v1
- 转换结果 SHA-256：`32ad1251867854b027099bd33ddabb5ddc38ea7e3f483a7d9c703e0c7ab347d8`

## 所选源模型

- 墙：`project/resource/vox/map/wall/wall1.vox` → `brick1/mid`，1887 个体素
- 地板：`project/resource/vox/map/floor/pave1.vox` → `stone4`，512 个体素
- 门：`project/resource/vox/map/door/indoor1.vox` → `door1/close|open`，2028 / 752 个体素
- 调色：`project/resource/map_vox.json` 中对应 `pal0` 映射

转换器验证 MagicaVoxel v200 文件边界、命名场景图、模型尺寸、体素和 RGBA 调色板。连续执行两次 `pnpm assets:build` 得到字节一致的 JSON。仓库保留上游 LICENSE、NOTICE、逐文件 SHA-256 和修改说明。

渲染器按模块尺寸重复墙/地面表面图案，门使用源体素外轮廓；碰撞仍来自布局 JSON 的简化盒。几何签名复用将固定样本 GLB 从未复用版本约 15 MB 降到约 3.8 MB。

Godot 4.6.2 已真实完成 GLB 导入、197 个原生碰撞创建、PackedScene 保存与重载，输出：

```text
MAPGEN_GODOT_SMOKE_OK colliders=197 scene=user://mapgen-smoke-dungeon.tscn
```
