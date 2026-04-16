# CHANGELOG 更新日志

## [1.4.0] - 2024-04-16 (中文定制版)

### ✨ 新增功能

- **新增变量 `${notenameWithoutExt}`**：返回不含 `.md` 扩展名的笔记名
  - 例如：笔记 `我的笔记.md` → `${notenameWithoutExt}` 返回 `我的笔记`

### 🔧 修改优化

- **`${path}` 变量行为修改**：现在只返回目录路径，不含文件名
  - 修改前：`${path}` → `folder/subfolder/note.md`
  - 修改后：`${path}` → `folder/subfolder`

### 🌐 本地化

- **菜单全面汉化**：
  - 命令面板：`Download attachments from links` → `下载链接中的附件`
  - 命令面板：`Download attachments from links (use previous options)` → `下载链接中的附件（使用上次选项）`
  - 右键菜单：`Download to local` → `下载到本地`
  - 文件菜单：`Download files (current note)` → `下载文件（当前笔记）`

### 📋 完整变量列表

| 变量 | 说明 | 示例值 |
|------|------|--------|
| `${path}` | 笔记所在目录路径 | `folder/subfolder` |
| `${notename}` | 笔记名称（含 .md） | `note.md` |
| `${notenameWithoutExt}` | 笔记名称（不含 .md）🆕 | `note` |
| `${originalName}` | 原始文件名 | `image.png` |
| `${date}` | 当前日期 | `2024-04-16` |
| `${time}` | 当前时间 | `14-30-00` |
| `${random}` | 随机字符串 | `a1b2c3` |

---

## [1.3.5] - 原始版本

详见原项目：https://github.com/ShermanTsang/obsidian-local-any-files
