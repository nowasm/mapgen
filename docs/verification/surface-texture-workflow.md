# 表面纹理工作流验证

- 验证日期：2026-08-14
- 纹理包：`assets/textures/bricks_and_tiles`
- 许可：CC0 / public domain
- 第一版通道：Base Color

## 默认设置

| 表面 | 纹理 ID | 源文件 | 覆盖尺寸 |
|---|---|---|---|
| 墙体 | `bt-2-001` | `Textures_2/001_basecolor.png` | 2 m |
| 地面 | `bt-2-002` | `Textures_2/002_basecolor.png` | 2 m |
| 门框 | `follow-wall` | 跟随当前墙体纹理 | 2 m |
| 门扇 | `kenney-original` | Kenney Building Kit 顶点色 | 原始尺寸 |

## 已验证行为

- 墙体、地面和门框可独立选择，十张 Base Color 图片按用途全部进入选择目录；门框默认跟随墙体。
- 两个选择器都提供“Kenney 原始颜色”。
- 纹理覆盖尺寸限制为 `0.25–32 m`。
- 修改纹理或覆盖尺寸只重建 Three.js 预览，不改变 Seed、候选布局、碰撞或门状态，也不会把布局标记为待重新生成。
- 地面使用世界 X/Z UV；墙体按表面法线使用 X/Y 或 Z/Y UV。相邻模块保持相同纹理密度。
- 纹理材质不再乘 Kenney 顶点色；门框使用墙面投影 UV，门扇仍使用顶点色且不挂新纹理。
- 导出器接收与预览相同的纹理对象，GLTFExporter 将同源图片写入 GLB；配对 JSON 同时记录 `appearance` 和最终 GLB SHA-256。
- 不提供 PBR 参数；原始 normal、roughness、AO、height 和 emission 文件留待后续版本。

## 浏览器实测

在本地开发页验证默认灰石墙/八角地砖可见。将墙体切换为 `bt-1-003`、地面切换为 `bt-2-004`、地面覆盖尺寸切换为 `4 m` 后，预览立即显示暖棕砖墙和蓝色嵌饰地砖；当前候选仍为 Seed `104729`，导出按钮保持可用。

门框扩展验证中，将墙体恢复 Kenney 原色、门框单独切换为 `bt-1-003`、门框覆盖尺寸改为 `1 m`，门框立即显示暖棕砖石表面；Seed 仍为 `104729`，没有出现“参数已改变”提示，导出按钮保持可用，浏览器控制台无错误或警告。

## 自动化检查

```powershell
pnpm test
pnpm typecheck
pnpm build
```

几何单元测试覆盖 UV 克隆、覆盖尺寸校验、墙地贴图材质及门原色保留；布局契约测试覆盖 `appearance` 的接受与错误尺寸拒绝；Web 测试覆盖默认设置、材质切换不触发布局 stale 和导出按钮保持可用。
