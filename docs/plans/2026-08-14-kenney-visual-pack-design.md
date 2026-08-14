# Kenney 视觉包替换设计

## 目标

把默认可见资源完整切换为仓库内 `kenney_modular-dungeon-kit_1.0`，保留现有房间—走廊布局、参数控制、碰撞和 Godot 烘焙协议。

## 决策

- 地板使用 `template-floor-detail`，墙使用 `template-wall`，都保留 Kenney 的 4 单位模块节奏。
- 门框使用完整 `gate`，门扇从 `gate-door` 的 `door` group 单独提取，避免重复门框。
- 墙高采用源墙约 4.15 单位；默认 4 单位走廊保留约 3 单位净门宽。
- 碰撞继续使用简单盒体，不从装饰网格生成复杂碰撞；门框视觉为一个模型，碰撞仍为两根立柱和一根横梁。
- OBJ 的 UV 与 `colormap.png` 在构建时转换为顶点色，使网页与 GLB 保持同一外观并避免外部纹理路径。
- `colormap.png` 的采样值属于 sRGB；创建 Three.js 顶点属性前必须转换为 Linear RGB。GLB 的 `COLOR_0` 同样保存线性值，避免网页与 Godot 中出现过亮、褪色的墙体。
- 旧 Dungeon Collection 2 文件保留作历史输入，但不再进入默认运行时。

## 验收

- 所有可见 `floor`、`wall`、`door-frame`、`door-open`、`door-closed` 均标记 Kenney 视觉包及明确源模型。
- 固定 Seed 输出仍可通过 Godot 的 GLB/JSON 哈希配对、碰撞数量和场景烘焙测试。
- 网页初始镜头可完整查看地图，颜色不过曝，墙地板与门框无程序化盒体回退。
