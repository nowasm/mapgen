# Kenney Modular Cave Kit 迁移设计

## 目标

最终可见资源统一迁移到 `assets/kenney_modular-cave-kit_1.0`。默认生成的房间具有 Cave Kit 原生圆角周界，仍保持单层、无屋顶、确定性 Seed、可行走碰撞和 Godot 固定烘焙。

## 资源映射

- 房间地板与内部细节：`room-small`、`room-large`、`room-wide` 及其 variation。
- 直墙与圆角周界：`template-wall`、`template-wall-detail-a`、`template-wall-corner`。
- 走廊：`corridor`、`corridor-wide` 的原生地面，加 Cave Kit 墙段。
- 入口：`gate-rock`、`gate-overhang`、`gate-metal-bars`；不再引用 Dungeon Kit 的木门和窗门。
- 所有 OBJ、MTL、PNG 在构建阶段烘焙成带线性色彩的自包含视觉包，导出 GLB 不依赖外部贴图。

## 生成语义

`roundedRooms` 总开关保留，但默认值改为开启。开启时所有房间优先选择 12×12、20×20 或 20×12 原生 Cave 房间尺寸；高密度布局放不下 12×12 时只允许对 `room-small` 等比缩小，不做非等比拉伸。关闭时仍可用 Cave Kit 地板和直墙生成矩形房间。圆角房间的原生地面保留，周界视觉和碰撞使用同一组短墙段，只在真实门位留口。

入口权重保持三个可控槽位，但语义调整为岩石门框、悬挑岩石门框和铁栏门。无独立门扇的岩石入口只生成门框视觉；铁栏门继续承担可开关门扇视觉。碰撞仍由布局 JSON 的简化盒定义，以确保 Godot 行走稳定。

## 验证

- 视觉包来源与导出元数据只标记 Cave Kit。
- 默认 Seed 的所有房间均带原生圆角预设。
- 页面不再出现 Dungeon Kit 资源 ID 或旧木门/窗门标签。
- 浏览器检查圆角连续性、走廊方向、入口匹配和颜色。
- 固定圆房样本通过 GLB/JSON 摘要校验、Godot 导入、碰撞创建、PackedScene 保存与重载。
