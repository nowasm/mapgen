# Kenney Cave 视觉包验证

- 视觉包：`kenney-modular-cave-kit-1.0` v1
- 许可：CC0-1.0，依据资源目录内 `License.txt`
- 固定 Seed：104729
- 视觉映射：`room-small/large/wide`、`corridor`、`template-wall`、`gate-rock`、`gate-overhang`、`gate-metal-bars`

验证包括 OBJ group/UV 解析、PNG 解码与颜色采样、sRGB 到 Linear RGB 的顶点色转换、原生洞穴地板、连续圆角墙段、走廊双侧墙、铁栏门扇轴向适配、悬挑入口顶部定位、每种语义的来源元数据，以及网页实际 WebGL 检查。Godot 固定样本由相同视觉包导出，原生盒碰撞结构保持不变。
