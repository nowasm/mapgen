# Building Kit 房间角落样式设计

## 目标

将全局 `roundedRooms` 布尔参数替换为 `roomCornerStyle` 三选一参数，直接对应 Kenney Building Kit 的 `wall-corner-column`、`wall-corner-diagonal` 和 `wall-corner-round`。默认值保持 `round`，所有房间统一使用所选样式，不引入概率。

## 拼装规则

- `column`：使用立柱直角墙，房间地板保持完整矩形，角落碰撞由两段互相垂直的墙组成。
- `diagonal`：使用削角墙和 `floor-corner-diagonal`，角落碰撞是一段连接两条直墙端点的斜墙。
- `round`：使用圆角墙和 `floor-corner-round`，角落碰撞继续由六段盒体近似圆弧。

三种样式共享同一套四角位置和旋转表。房间直墙统一从距角落 2 米的切点开始，门洞扣除与走廊逻辑不变。

## 参数与界面

布局 schema、默认参数和 resolved 参数使用 `roomCornerStyle: "column" | "diagonal" | "round"`。网页参数面板使用单选下拉框，避免多个样式同时开启。导出的 JSON 会保存选择，GLB 中每个角模块保留相应的 `assetKey`。

## 验证

- schema 拒绝未知角落样式。
- 生成器分别检查三种模式的墙角、地板和碰撞数量。
- 浏览器切换三种选项并重新生成，检查四角朝向与封闭性。
- 更新固定 GLB/JSON，运行完整测试、构建和 Godot 导入测试。
