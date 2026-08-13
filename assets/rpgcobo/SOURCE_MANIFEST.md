# RPG-Cobo 地牢视觉包来源清单

该目录包含从 RPG-Cobo 默认素材机械转换的派生数据。上游项目和默认素材以 Apache License 2.0 发布；完整许可证与 NOTICE 随目录保存。

- 上游仓库：`rpgcobo-tool`
- 转换器：`tools/build-rpgcobo-visual-pack.ts` v1.0.0
- 修改：子模型筛选、调色映射、坐标归一、表面重复与门洞缩放
- 墙：`wall1.vox / brick1/mid`
- 地板：`pave1.vox / stone4`
- 门：`indoor1.vox / door1/open|close`

每个输入文件的 SHA-256 保存在 `dungeon-visual-pack.json`。原始 VOX 文件未复制到本仓库，生成包仅包含所选模型的体素和颜色数据。
