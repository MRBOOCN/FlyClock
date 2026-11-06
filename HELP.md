# Bob FlyClock 模块说明

本模块通过 WebSocket 协议控制 Bob FlyClock 设备。完整动作、变量与故障排除说明见 [companion/HELP.md](companion/HELP.md)。

## 配置项

- **WebSocket URL**：Bob FlyClock 设备上 WebSocket 服务的地址（`ws[s]://域名[:端口][/路径]`）。
- **重新连接**：连接错误时 5 秒后自动重连。
- **添加终止字符**：发送命令时追加的终止字符（无 / 回车+换行 / 换行+回车 / 回车 / 换行）。
- **调试消息**：记录收发消息的详细日志。

## 常用动作

- 设置倒计时时间
- 设置半自动 / 全自动模式
- 开始 / 停止、暂停 / 恢复、重置计时器
- 闪烁控制、黑屏 / 取消黑屏、显示 / 隐藏窗口
- 显示 / 隐藏机器时间
- 设置计时模式（正计时 / 倒计时）

## 变量与反馈

- 变量：`controlMode`、`showTime`、`timingStatus`、`defaultCountdownDuration`、`specialStatus`
- 反馈：控制模式、计时状态

## 本地打包

在模块根目录双击 `Build.bat` 即可一键打包，产物为 `companion-module-Bob-FlyClock-<version>.tgz`。
