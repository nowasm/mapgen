# ADR-0002：用 GLB 与版本化布局 JSON 分离外观和语义

## 状态

已接受，2026-08-13。

## 背景

GLB 适合跨工具传递模型和材质，但碰撞、门状态、房间图和出生点如果依赖自定义 glTF
扩展，会增加浏览器导出器与 Godot 导入器之间的兼容风险。最终碰撞必须是 Godot 原生节点。

## 决策

每次导出生成配对的 `dungeon.glb` 与 `dungeon.layout.json`。GLB 仅负责可见模型；版本化
JSON 保存布局结构、门、出生点、模块和简化碰撞盒。二者通过 `exportId` 和摘要配对。

## 结果

### 正面

- Godot 可稳定重建 `StaticBody3D`、`CollisionShape3D` 和 `Marker3D`。
- 结构语义可读、可测试、可迁移，不受渲染网格优化影响。
- 可独立更新美术而不改变布局算法。

### 负面

- 用户必须管理两个配对文件。
- Schema 和兼容迁移需要长期维护。
- 导入器必须检测错配，不能只按文件名关联。

### 中性

- 第一版不使用自定义 glTF 扩展或 GPU 实例化扩展。

## 备选方案

- **全部写入 GLB extras**：单文件方便，但碰撞数据体量、Schema 校验和工具可见性较差。
- **只导出 GLB 并自动生成网格碰撞**：操作简单，但角色行走质量与性能不可控。
- **直接生成 `.tscn`**：绕过 glTF，但让网页工具承担 Godot 私有格式维护。

## 参考

- https://docs.godotengine.org/en/stable/classes/class_gltfdocument.html
