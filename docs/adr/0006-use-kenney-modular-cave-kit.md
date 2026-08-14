# ADR-0006：最终视觉资源采用 Kenney Modular Cave Kit

## 状态

已被 ADR-0007 替代

## 背景

项目需要默认生成带圆角周界的房间，同时保持房间—走廊布局、确定性参数、门洞、可行走碰撞和 Godot 固定烘焙。此前使用 Kenney Modular Dungeon Kit，并通过短墙段近似圆形周界；但其美术语言偏砌石地牢，完整房间模型的固定开口也不适合任意程序化连接。

用户已确定 `assets/kenney_modular-cave-kit_1.0` 为最终资源。该套件自带圆角洞穴房间、岩壁、洞穴走廊、岩石入口和铁栏门，且随包提供 CC0 许可。

## 决策

- 默认视觉包和导出 `assetPack.id` 统一为 `kenney-modular-cave-kit-1.0`。
- `roundedRooms` 默认开启；所有普通候选默认采用 Cave Kit 圆角房间预设。
- 原生房间和走廊模型只保留地板及低矮细节，墙体按布局语义生成，避免固定开口和错误轴向破坏封闭性。
- 入口使用 `gate-rock`、`gate-overhang`、`gate-metal-bars`；可开关门扇统一提取 `gate-metal-bars` 的铁栏 group，不再引用旧木门和窗门。
- UV 和贴图颜色继续在构建阶段烘焙为顶点色，GLB 保持自包含。
- Dungeon Kit 和 Dungeon Collection 2 保留为历史输入，不再被默认运行时、固定样本或文档入口引用。

## 影响

### 正面

- 默认房间视觉天然符合圆角洞穴目标。
- 所有可见模块来自同一套资源，美术语言一致。
- 程序化墙体和简化碰撞继续保证任意门位、封闭性与 Godot 行走稳定。

### 负面

- Cave Kit 没有木门和窗门，门型选择收敛为岩石入口变体与铁栏门扇。
- 紧凑高密度布局可能对最小 Cave 房间做等比缩小，虽然不改变比例，但模块绝对尺寸不再总是原生 12 单位。
- 烘焙后的顶点色视觉包仍会增加网页包体积。

### 中性

- 原有布局 JSON 主版本保持为 1，但门样式枚举和视觉包 ID 随当前开发版本同步迁移。

## 备选方案

- 继续使用 Modular Dungeon Kit：资源完整，但默认视觉不符合已确认的洞穴圆角方向。
- 混用 Dungeon Kit 门和 Cave Kit 房间：门型更多，但美术风格和资源来源不统一。
- 直接使用完整 Cave 房间 prefab：圆角自然，但固定入口无法覆盖任意程序化连接位置。

## 参考

- `assets/kenney_modular-cave-kit_1.0/License.txt`
- `assets/kenney_modular-cave-kit_1.0/Overview.html`
- `docs/plans/2026-08-14-kenney-cave-kit-migration-design.md`
