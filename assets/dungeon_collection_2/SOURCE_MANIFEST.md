# Dungeon Collection 2 资源清单

本目录由用户提供，共包含 90 组 OBJ/MTL 模块。当前目录未附带许可证、作者或下载来源文件，因此本项目将许可状态标记为 `UNSPECIFIED (user-provided)`；在补齐正式授权前，不声明这些文件可对外再分发。

Mapgen 第一版使用以下模块：

- 地板：`struct_floor_normal.obj/.mtl`
- 墙：`struct_wall_straight_main.obj/.mtl`
- 门框：`struct_block_normal.obj/.mtl`
- 门扇：`prop_wall_big_door_wood.obj/.mtl`

`tools/build-dungeon-collection-2-pack.ts` 离线解析 OBJ 三角面和 MTL `Kd` 颜色，输出 `dungeon-visual-pack.json`。该文件记录所有已用输入文件的 SHA-256。转换包含坐标归一化、重复铺设和语义尺寸适配；原始 OBJ/MTL 不在运行时加载。
