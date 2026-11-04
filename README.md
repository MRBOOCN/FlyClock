# companion-module-Bob-FlyClock

Bitfocus Companion模块，用于控制Bob FlyClock设备通过WebSocket协议。

## 功能特性

- 时间设置功能
- 控制模式切换功能（半自动/全自动）
- 开始/停止控制功能
- 暂停/恢复功能
- 闪烁控制功能
- 黑屏/取消黑屏功能
- 显示/隐藏控制功能
- 重置功能
- 时钟时间显示功能
- 计时模式设置功能

## 安装

1. 下载模块的.tgz文件
2. 在Companion中，进入"添加模块"界面
3. 选择"从文件安装"
4. 选择下载的.tgz文件
5. 安装完成后，添加模块实例并配置WebSocket URL

## 配置

- **WebSocket URL**: Bob FlyClock设备的WebSocket服务地址
- **Reconnect**: 是否在WebSocket错误时自动重连
- **Append termination character**: 发送命令时追加的终止字符
- **Debug messages**: 是否记录调试消息

## 使用

模块提供了多种动作，可通过Companion的按钮和触发器使用：

- **Set Countdown Time**: 设置倒计时时间
- **Set Semi-Automatic Mode**: 设置半自动模式
- **Set Full-Automatic Mode**: 设置全自动模式
- **Start/Stop**: 开始/停止计时
- **Pause/Resume**: 暂停/恢复计时
- **Shine Control**: 闪烁控制
- **Black/White Screen**: 黑屏/取消黑屏
- **Show/Hide Window**: 显示/隐藏窗口
- **Reset Timer**: 重置计时器
- **Show Machine Time**: 显示/隐藏机器时间
- **Set Timing Mode**: 设置计时模式（正计时/倒计时）

## 变量

模块提供了以下变量，可在Companion中使用：

- **controlMode**: 控制模式信息
- **showTime**: 显示时间信息
- **timingStatus**: 计时状态信息
- **defaultCountdownDuration**: 默认倒计时时长
- **specialStatus**: 特殊状态信息

## 反馈

模块提供了以下反馈，可用于按钮状态：

- **Control Mode**: 显示当前控制模式
- **Timing Status**: 显示当前计时状态

## 本地打包

本模块使用 Bitfocus Companion 官方构建工具 `@companion-module/tools` 打包。

1. 安装依赖：
   ```bash
   npm install
   # 或使用 yarn：
   yarn install
   ```

2. 执行打包，生成可导入 Companion 的 `*.tgz`：
   ```bash
   npm run package
   # 或：
   yarn package
   ```

3. 打包产物为 `companion-module-Bob-FlyClock-<version>.tgz`（由 `manifest.json` 的 `id` 与 `version` 派生），
   即最终可分发的模块文件，**须随仓库一并提交**（请勿在 `.gitignore` 中忽略 `*.tgz`）。

> 依赖说明：`@companion-module/base` 为运行时依赖，`@companion-module/tools` 仅用于构建。
