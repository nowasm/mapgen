# Godot 4 Mapgen Importer

本目录本身是一个最小 Godot 4 测试工程，也是插件开发环境。

## 安装到目标工程

将 `addons/mapgen_importer` 复制到目标 Godot 工程的 `addons` 目录，然后在
**Project Settings → Plugins** 中启用 **Mapgen Importer**。

启用后，编辑器右侧出现 **Mapgen Baker**：

1. 选择网页工具导出的 `*.layout.json`。
2. 确保同目录存在同名 `.glb`。
3. 可选指定输出 `.tscn`；留空则输出到导出文件旁边。
4. 点击 **Bake GLB + JSON to .tscn**。

插件会验证 Schema 版本、文件配对和 GLB SHA-256，然后创建可见模型、
`StaticBody3D`、`BoxShape3D`、`PlayerSpawn` 与生成元数据。

## 无界面测试

```powershell
& 'D:\tools\Godot_v4.6.2-stable_win64\Godot_v4.6.2-stable_win64_console.exe' `
  --headless --path godot --script res://test-project/tests/import_smoke_test.gd
```
