# Dungeon Collection 2 视觉替换设计

## 目标

保持现有确定性地下城布局、简化碰撞、GLB + JSON 配对和 Godot 固定烘焙协议不变，将可视模型从 RPG-Cobo 体素派生资源替换为仓库内 `assets/dungeon_collection_2` 的 OBJ/MTL 模块。

## 方案

构建阶段离线解析选定 OBJ 和 MTL，把非索引三角形、MTL 漫反射色、边界及输入 SHA-256 写入静态 JSON。浏览器不直接请求 OBJ，也不依赖外部纹理。第一版映射为：`struct_floor_normal` 地面、`struct_wall_straight_main` 墙、`struct_block_normal` 门框、`prop_wall_big_door_wood` 门扇。

地面按 XZ 单元重复铺设，墙体按长度和高度重复铺设，避免将一个小模块拉成长条。门框和门扇按各自语义盒适配。所有最终网格仍写入同一个自包含 GLB；碰撞继续只读布局 JSON，不从复杂可视模型推导。

资源目录未提供许可证或来源文件，因此元数据明确标记为 `UNSPECIFIED (user-provided)`。在获得正式许可证前不对外声明可再分发许可。

## 验证

测试覆盖 OBJ/MTL 解析、输入哈希、几何边界、模块重复、视觉来源元数据、GLB 导出和 Godot 4.6.2 导入/烘焙/重载。固定 Seed 样本随视觉包重新生成。
