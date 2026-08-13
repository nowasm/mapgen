# ADR-0001：采用本地 Web 生成器与 Godot 烘焙插件

## 状态

已接受，2026-08-13。

## 背景

工具需要提供参数面板、10 个候选、三维预览和第三人称行走验证，但最终资产必须进入
Godot，成为可编辑、带原生碰撞的固定场景。用户允许使用任意引擎，也明确允许网页技术。

## 决策

使用 TypeScript、React/Vite 与 Three.js 构建纯本地 Web 生成器；网页端以 Rapier 做
非权威的行走预览。另建 Godot 4 编辑器插件，将导出物固定烘焙为 `.tscn`。

## 结果

### 正面

- 参数和候选工作流不依赖特定桌面引擎编辑器。
- Three.js 可直接预览并导出 GLB。
- Godot 仍掌握最终碰撞和场景结构，运行时无生成器依赖。
- 核心 TypeScript 算法易于单元测试和复用。

### 负面

- 需要维护 TypeScript 和 GDScript 两套环境。
- 必须处理 Three.js、glTF 和 Godot 之间的坐标与材质差异。
- 网页物理预览无法替代 Godot 内验收。

### 中性

- 工具第一版为本地静态应用，无后端、账户、云存储或协作功能。

## 备选方案

- **Godot-only 编辑器插件**：目标集成最直接，但网页工作流和独立分发较弱。
- **Babylon.js**：物理和引擎功能更集成，但本项目更看重轻量场景构建与直接 GLB 管线。
- **Unity/Unreal/Blender 工具**：能力充足，但安装、自动化或导出链路对本需求偏重。

## 参考

- https://threejs.org/docs/pages/GLTFExporter.html
- https://docs.godotengine.org/en/stable/tutorials/assets_pipeline/importing_3d_scenes/available_formats.html
