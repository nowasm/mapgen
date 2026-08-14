# Kenney Building Kit 视觉包验证

- 视觉包：`kenney-building-kit-1.0` v1
- 许可证：CC0 1.0
- 原型数量：25
- 原生模数：地板、直墙与当前门框跨度 2 米；C 型门扇保持 0.925 × 2.1 × 0.25 米原始包围盒
- 核心映射：`floor`、`floor-corner-diagonal`、`floor-corner-round`、`wall`、三种角落墙、四种门框与八种源门扇；生成器固定使用方形/圆形 C 型单门扇
- 自包含导出：colormap UV 在构建阶段烘焙为线性渲染所需的顶点色数据

验证命令：

```powershell
pnpm assets:build
pnpm --filter @mapgen/dungeon-renderer test
```

资源包构建会记录每个 OBJ、MTL、纹理与许可证文件的 SHA-256；缺失输入或不支持的 PNG 格式会直接失败。
