# RPG-Cobo 地牢视觉包设计

## 目标

将参考仓库中 Apache-2.0 授权的实际地牢 VOX 子模型用于 Mapgen 生成结果，同时保持当前布局、碰撞、GLB + JSON 配对和 Godot 固定烘焙协议不变。

## 选择方案

采用离线、白名单、可追溯转换。转换器只读取三个明确的源文件和 `map_vox.json`：墙使用 `wall1/brick1`，地面使用 `pave1/stone4`，门使用 `indoor1/door1`。它解析 MagicaVoxel v200 的模型、场景节点名称和 RGBA 调色板，应用 RPG-Cobo 的 `pal0` 重映射，输出紧凑的 `dungeon-visual-pack.json`。清单记录源相对路径、SHA-256、子模型名、转换器版本和许可证。

网页和导出器只读取生成后的静态视觉包。墙和地面按模块尺寸重复源体素表面图案；门使用源体素模型轮廓并缩放到门洞。普通碰撞仍来自 `DungeonLayout.colliders`，不会从复杂可视网格推导，因此角色通行和 Godot 性能不受视觉替换影响。若视觉包缺失或校验失败，渲染器明确回退到现有占位盒材质并给出测试可观察的诊断。

## 数据流与验证

```text
RPG-Cobo VOX + map_vox.json + LICENSE/NOTICE
  → 白名单转换器
  → dungeon-visual-pack.json + SOURCE_MANIFEST.md
  → Three.js 可视网格
  → GLB
  → Godot VisualModel

DungeonLayout.colliders ─────────────────→ Godot StaticBody3D
```

测试覆盖 VOX 块边界、命名场景图、调色重映射、源哈希、视觉包确定性、墙/地面图案重复、门轮廓、GLB 导出和 Godot 烘焙。源资产复制时保留 Apache-2.0 LICENSE、NOTICE，并在清单中注明转换和缩放属于修改。
