# AGENTS.md — 项目工作规则
## 核心规则
- **最小修复**：不建补丁、不引入过度容错，保持简洁可维护。
- **文档同步**：规则/架构/边界变更更新本文档；任何版本/变更流水只写入 [CHANGELOG.md](CHANGELOG.md)（倒序、新条目在表头行之下顶部追加），本文档严禁内嵌版本表或变更流水，末尾「版本记录」小节仅作引用。
- **逐步提交**：每完成一步操作，主动创建对应的 Git 提交记录（commit 写入同一 `.git`，GitHub Desktop 刷新后即可见）；提交信息（commit message）使用中文。
## 项目概览
Bitfocus Companion 模块，通过 WebSocket 协议控制 Bob FlyClock 设备。提供时间设置、控制模式切换（半自动/全自动）、开始/停止、暂停/恢复、闪烁、黑屏、显示/隐藏、重置、机器时间显示、计时模式设置等动作，以及控制模式、计时状态反馈与多个变量。
## 架构与边界
- 入口 `main.js` 继承 `InstanceBase`，负责 WebSocket 连接管理、命令收发、变量/反馈/动作定义。
- 配置字段见 `getConfigFields()`：WebSocket URL、重连、终止字符、调试消息。
- 升级脚本见 `upgrade.js`。
- 一键打包入口为根目录 `Build.bat`（双击运行，自动补齐缺失依赖与文档后执行 `npm run package` 并校验本次 `*.tgz` 产物；只补齐不覆盖已有配置）。
- 模块标识与包名遵循 bob 命名规范（`companion/manifest.json` 与 `package.json`）。
## 已知约定与边界
- 命令以 `cmd=` / `cmdd=` / `msg=` 前缀经 WebSocket 收发。
- 反馈消息经 `validateFeedbackMessage` 校验后分类存储，变量与反馈状态据此更新。
- 模块内文档为 `companion/HELP.md`（Companion 加载）；根 `HELP.md` 为简要说明（`Build.bat` 的检查项），改动模块文档时同步根文件。
- 打包产物 `*.tgz` 是可分发文件，**必须纳入版本库**；`.gitignore` 不得忽略 `*.tgz`（仅忽略 `node_modules/`、`/pkg` 等构建中间物）。
- 模块标识（`id` 与 `package.json` 的 `name`）须为官方形态 `companion-module-Bob-FlyClock`；显示名（`name`/`products`）为无前缀的 `FlyClock`。
## 版本记录
见 [CHANGELOG.md](CHANGELOG.md)。
