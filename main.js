const { InstanceBase, runEntrypoint, InstanceStatus } = require('@companion-module/base')
const WebSocket = require('ws')

class BobFlyClockInstance extends InstanceBase {
	isInitialized = false
	ws = null
	reconnect_timer = null
	wsRegex = '^wss?:\\/\\/([\\da-z\\.-]+)(:\\d{1,5})?(?:\\/(.*))?$'

	// 状态变量
	controlMode = ''
	showTime = ''
	timingStatus = ''
	defaultCountdownDuration = ''
	specialStatus = ''
	// 反馈信息变量
	feedbackMessages = {}
	lastFeedbackMessage = ''
	feedbackErrorCount = 0
	
	// 重连机制变量
	reconnectAttempts = 0
	maxReconnectDelay = 60000 // 最大重连延迟60秒
	baseReconnectDelay = 5000 // 基础重连延迟5秒
	connectionMonitorInterval = null
	lastDataReceivedTime = 0
	dataTimeout = 30000 // 数据超时时间30秒
	isVariablesSynced = false // 关键变量是否已同步

	async init(config) {
		this.config = config
		if (!this.config.fbprefix) this.config.fbprefix = ''
		if (!this.config.fbsuffix) this.config.fbsuffix = ''

		this.initWebSocket()
		this.isInitialized = true

		this.updateVariables()
		this.initActions()
		this.initFeedbacks()
		
		// 初始化连接状态监测
		this.initConnectionMonitor()
	}

	async destroy() {
		this.isInitialized = false
		if (this.reconnect_timer) {
			clearTimeout(this.reconnect_timer)
			this.reconnect_timer = null
		}
		if (this.connectionMonitorInterval) {
			clearInterval(this.connectionMonitorInterval)
			this.connectionMonitorInterval = null
		}
		if (this.ws) {
			this.ws.close(1000)
			delete this.ws
		}
	}

	async configUpdated(config) {
		const oldconfig = {...this.config}

		this.config = config
		if (!this.config.fbprefix) this.config.fbprefix = ''
		if (!this.config.fbsuffix) this.config.fbsuffix = ''

		if (oldconfig['url'] !== config['url']) this.initWebSocket()
	}

	updateVariables() {
		const variableDefinitions = [
			{name: '控制模式', variableId: 'controlMode'},
			{name: '显示时间', variableId: 'showTime'},
			{name: '计时状态', variableId: 'timingStatus'},
			{name: '默认倒计时时长', variableId: 'defaultCountdownDuration'},
			{name: '特殊状态', variableId: 'specialStatus'},
			{name: '最后数据接收时间戳', variableId: 'lastDataReceived'},
			// 反馈信息变量
			{name: '最后反馈信息', variableId: 'lastFeedbackMessage'},
			{name: '反馈错误计数', variableId: 'feedbackErrorCount'}
		]
		this.setVariableDefinitions(variableDefinitions)
		
		// 更新变量值
		this.setVariableValues({
			controlMode: this.controlMode,
			showTime: this.showTime,
			timingStatus: this.timingStatus,
			defaultCountdownDuration: this.defaultCountdownDuration,
			specialStatus: this.specialStatus,
			lastDataReceived: Date.now(),
			// 反馈信息变量
			lastFeedbackMessage: this.lastFeedbackMessage,
			feedbackErrorCount: this.feedbackErrorCount
		})
	}

	maybeReconnect() {
		if (this.isInitialized && this.config.reconnect) {
			if (this.reconnect_timer) {
				clearTimeout(this.reconnect_timer)
			}
			this.reconnect_timer = setTimeout(() => {
				this.initWebSocket()
			}, 5000)
		}
	}

	initWebSocket() {
		// 清除现有的重连定时器
		if (this.reconnect_timer) {
			clearTimeout(this.reconnect_timer)
			this.reconnect_timer = null
		}

		const url = this.config.url
		if (!url || url.match(new RegExp(this.wsRegex)) === null) {
				this.updateStatus(InstanceStatus.BadConfig, `WS URL 未定义或无效`)
				return
			}

		this.updateStatus(InstanceStatus.Connecting)

		// 关闭现有的WebSocket连接
		if (this.ws) {
			try {
				this.ws.close(1000)
			} catch (error) {
				this.log('debug', `Error closing existing WebSocket: ${error}`)
			}
			delete this.ws
		}

		try {
			// 创建新的WebSocket连接
			this.ws = new WebSocket(url)

			this.ws.on('open', () => {
			this.updateStatus(InstanceStatus.Ok)
			this.log('info', `连接成功打开`)
			// 连接成功后重置变量同步状态
			this.isVariablesSynced = false
			// 更新最后数据接收时间
			this.lastDataReceivedTime = Date.now()
		})

			this.ws.on('close', (code, reason) => {
			this.log('info', `连接已关闭，代码 ${code}: ${reason || '未提供原因'}`)
			this.updateStatus(InstanceStatus.Disconnected, `连接已关闭，代码 ${code}`)
			// 触发重连
			this.maybeReconnect()
		})

			this.ws.on('message', this.messageReceivedFromWebSocket.bind(this))

			this.ws.on('error', (error) => {
			this.log('error', `WebSocket 错误: ${error.message || error}`)
			// 错误发生后也触发重连
			this.maybeReconnect()
		})
		} catch (error) {
			this.log('error', `WebSocket 初始化失败: ${error.message || error}`)
			this.updateStatus(InstanceStatus.Disconnected, `WebSocket 初始化失败`)
			// 初始化失败后触发重连
			this.maybeReconnect()
		}
	}

	messageReceivedFromWebSocket(data) {
		if (this.config.debug_messages) {
			this.log('debug', `收到消息: ${data}`)
		}

		// 更新最后数据接收时间
		this.lastDataReceivedTime = Date.now()

		let msgValue = null
		if (Buffer.isBuffer(data)) {
			data = data.toString()
		}

		// 处理接收到的消息
		if (data.startsWith('cmdd=')) {
			const cmdValue = data.substring(5)
			if (cmdValue.startsWith('CtrlMode')) {
				this.controlMode = cmdValue
				this.checkVariablesSynced()
			} else if (cmdValue.startsWith('ShowTime')) {
				this.showTime = cmdValue.substring(8)
				this.checkVariablesSynced()
			} else if (cmdValue.startsWith('Timimg')) {
				this.timingStatus = cmdValue.substring(7)
				this.checkVariablesSynced()
			} else if (cmdValue.startsWith('DefCDT')) {
				this.defaultCountdownDuration = cmdValue.substring(6)
				this.checkVariablesSynced()
			} else if (cmdValue === 'SP') {
				this.specialStatus = cmdValue
				this.checkVariablesSynced()
			} else if (cmdValue === 'Play') {
				this.timingStatus = 'Play'
				this.checkVariablesSynced()
			} else if (cmdValue === 'Stop') {
				this.timingStatus = 'Stop'
				this.checkVariablesSynced()
			}
		} else if (data.startsWith('msg=')) {
			const msgValue = data.substring(4)
			
			// 处理收到的反馈信息
			if (this.validateFeedbackMessage(msgValue)) {
				this.processValidFeedback(msgValue)
			} else {
				this.processInvalidFeedback(msgValue)
			}
		}

		// 更新变量
		this.updateVariables()
		// 触发反馈
		this.checkFeedbacks()
	}

	// 验证反馈信息有效性
	validateFeedbackMessage(message) {
		// 1. 基本验证：非空且长度合理
		if (!message || typeof message !== 'string') {
			return false
		}
		
		const trimmedMessage = message.trim()
		if (trimmedMessage.length === 0) {
			return false
		}
		
		// 2. 长度验证
		if (trimmedMessage.length > 255) {
			return false
		}
		
		// 3. 内容验证：确保是有效的反馈信息
		// 3.1 已知的有效反馈模式
		const validFeedbackPatterns = {
			machineTime: {
				show: '计时器不计时时显示机器时间',
				hide: '计时器不计时时显示机器时间已被关闭'
			},
			shine: '闪烁控制',
			blackWhite: '黑屏模式',
			showHide: '窗口显示',
			timer: {
				start: '计时器启动',
				stop: '计时器停止',
				pause: '计时器暂停',
				resume: '计时器恢复',
				reset: '计时器重置'
			}
		}
		
		// 3.2 检查是否匹配已知的有效反馈模式
		let isKnownPattern = false
		for (const category in validFeedbackPatterns) {
			const pattern = validFeedbackPatterns[category]
			if (typeof pattern === 'string') {
				if (trimmedMessage.includes(pattern)) {
					isKnownPattern = true
					break
				}
			} else if (typeof pattern === 'object') {
				for (const key in pattern) {
					if (trimmedMessage.includes(pattern[key])) {
						isKnownPattern = true
						break
					}
				}
				if (isKnownPattern) break
			}
		}
		
		// 3.3 如果是未知模式但格式正确，也视为有效
		// 允许中文、英文、数字、空格和常见标点符号
		const validFormatPattern = /^[\u4e00-\u9fa5a-zA-Z0-9\s，。！？;:\-\(\)\[\]]+$/;
		const isFormatValid = validFormatPattern.test(trimmedMessage);
		
		// 4. 综合判断：已知模式或格式正确的未知模式
		return isKnownPattern || isFormatValid;
	}

	// 处理有效的反馈信息
	processValidFeedback(message) {
		const trimmedMessage = message.trim()
		this.lastFeedbackMessage = trimmedMessage
		this.log('info', `收到有效反馈: ${trimmedMessage}`)
		
		// 分类存储反馈信息
		const timestamp = Date.now()
		const category = this.categorizeFeedback(trimmedMessage)
		
		this.feedbackMessages[timestamp] = {
			message: trimmedMessage,
			timestamp: timestamp,
			valid: true,
			category: category
		}
		
		// 限制存储的反馈信息数量
		this.limitFeedbackMessages()
	}

	// 处理无效的反馈信息
	processInvalidFeedback(message) {
		const trimmedMessage = message.trim()
		const invalidMessage = `[无效] ${trimmedMessage}`
			this.lastFeedbackMessage = invalidMessage
			this.feedbackErrorCount++
			this.log('warning', `收到无效反馈: ${trimmedMessage}`)
		
		// 存储无效反馈信息用于分析
		const timestamp = Date.now()
		this.feedbackMessages[timestamp] = {
			message: trimmedMessage,
			timestamp: timestamp,
			valid: false,
			category: 'invalid'
		}
		
		// 限制存储的反馈信息数量
		this.limitFeedbackMessages()
	}

	// 分类反馈信息
	categorizeFeedback(message) {
		const trimmedMessage = message.trim()
		
		// 根据内容分类反馈信息
		if (trimmedMessage.includes('计时器不计时时显示机器时间')) {
			return 'machine_time'
		} else if (trimmedMessage.includes('闪烁控制')) {
			return 'shine'
		} else if (trimmedMessage.includes('黑屏模式')) {
			return 'black_white'
		} else if (trimmedMessage.includes('窗口显示')) {
			return 'show_hide'
		} else if (trimmedMessage.includes('计时器启动')) {
			return 'timer_start'
		} else if (trimmedMessage.includes('计时器停止')) {
			return 'timer_stop'
		} else if (trimmedMessage.includes('计时器暂停')) {
			return 'timer_pause'
		} else if (trimmedMessage.includes('计时器恢复')) {
			return 'timer_resume'
		} else if (trimmedMessage.includes('计时器重置')) {
			return 'timer_reset'
		} else {
			return 'other'
		}
	}

	// 限制存储的反馈信息数量
	limitFeedbackMessages() {
		const maxMessages = 100
		const messageKeys = Object.keys(this.feedbackMessages).sort((a, b) => a - b)
		
		if (messageKeys.length > maxMessages) {
			const messagesToDelete = messageKeys.slice(0, messageKeys.length - maxMessages)
			messagesToDelete.forEach(key => {
				delete this.feedbackMessages[key]
			})
		}
	}

	// 初始化连接状态监测
	initConnectionMonitor() {
		// 清除现有的监测器
			if (this.connectionMonitorInterval) {
				clearInterval(this.connectionMonitorInterval)
			}
			
			// 每5秒监测一次连接状态
			this.connectionMonitorInterval = setInterval(() => {
				this.monitorConnectionStatus()
			}, 5000)
			
			this.log('debug', '连接监测器已初始化')
	}

	// 监测连接状态
	monitorConnectionStatus() {
		// 检查连接是否断开
			if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
				this.log('debug', '连接已丢失，触发重连')
				this.maybeReconnect()
				return
			}
			
			// 检查数据是否超时
			const now = Date.now()
			if (now - this.lastDataReceivedTime > this.dataTimeout) {
				this.log('warning', '检测到数据超时，触发重连')
				this.maybeReconnect()
				return
			}
			
			// 每5秒固定时间间隔自动触发重新连接操作
			// 无论连接状态如何，都执行重连以获取最新反馈
			this.log('debug', '在固定的5秒间隔触发定时重连')
			this.maybeReconnect()
			
			// 检查关键变量是否已同步
			if (!this.isVariablesSynced) {
				this.log('debug', '变量未同步，检查同步状态')
				this.checkVariablesSynced()
			}
	}

	// 检查关键变量是否已同步
	checkVariablesSynced() {
		// 检查所有关键变量是否都有值
		const isSynced = this.controlMode !== '' && 
			this.showTime !== '' && 
			this.timingStatus !== '' && 
			this.defaultCountdownDuration !== '' && 
			this.specialStatus !== ''
		
		if (isSynced && !this.isVariablesSynced) {
				this.isVariablesSynced = true
				this.log('info', '所有关键变量已成功同步')
				// 重置重连尝试次数
				this.reconnectAttempts = 0
			}
	}

	// 改进的重连机制
	maybeReconnect(isCommandTriggered = false) {
		if (!this.isInitialized || !this.config.reconnect) {
			return
		}
		
		// 清除现有的重连定时器
		if (this.reconnect_timer) {
			clearTimeout(this.reconnect_timer)
			this.reconnect_timer = null
		}
		
		// 计算重连延迟（指数退避）
		// 命令触发的重连使用固定延迟，定时重连使用指数退避
		const reconnectDelay = isCommandTriggered ? 
			1000 : // 命令触发重连使用1秒固定延迟
			Math.min(
				this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts),
				this.maxReconnectDelay
			)
		
		// 增加重连尝试次数
		this.reconnectAttempts++
		
		const triggerType = isCommandTriggered ? '命令触发' : '定时'
			this.log('info', `${triggerType} 重连尝试 ${this.reconnectAttempts} 计划在 ${reconnectDelay}ms 后执行`)
			
			// 重置变量同步状态
			this.isVariablesSynced = false
			
			// 安排重连
			this.reconnect_timer = setTimeout(() => {
				this.log('info', `尝试重连 (${triggerType}, 尝试 ${this.reconnectAttempts})`)
				this.initWebSocket()
			}, reconnectDelay)
	}

	sendCommand(command) {
		return new Promise((resolve, reject) => {
			// 检查WebSocket连接状态
			if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
				this.log('info', `命令触发重连，命令: ${command}`)
				// 触发命令式重连
				this.maybeReconnect(true) // true表示是命令触发的重连
				// 重连后尝试发送命令
				setTimeout(() => {
					this.sendCommand(command).then(resolve).catch(reject)
				}, 1000) // 等待1秒后重新尝试发送命令
				return
			}

			let termination = ''
			switch (this.config.append_new_line) {
				case 'rn':
					termination = '\r\n'
					break
				case 'nr':
					termination = '\n\r'
					break
				case 'r':
					termination = '\r'
					break
				case 'n':
					termination = '\n'
					break
				default:
					termination = ''
					break
			}

			if (this.config.debug_messages) {
				this.log('debug', `发送消息: ${command}`)
			}

			this.ws.send(`${command}${termination}`, (err) => {
				if (err) {
					if (this.config.debug_messages) {
						this.log('error', `发送消息失败: ${err}`)
					}
					// 发送失败时也触发重连
					this.log('info', `命令发送失败，触发重连: ${err.message || err}`)
					this.maybeReconnect(true)
					reject(err)
				} else {
					if (this.config.debug_messages) {
						this.log('debug', `消息发送成功: ${command}`)
					}
					// 发送成功后也执行重连以获取最新反馈
					this.log('info', `命令发送成功，触发重连以获取最新反馈`)
					this.maybeReconnect(true)
					resolve()
				}
			})
		})
	}

	getConfigFields() {
		return [
			{
			type: 'static-text',
			id: 'info',
			width: 12,
			label: '信息',
			value:
				'<strong>Bob FlyClock WebSocket 模块</strong><br>通过 WebSocket 控制 Bob FlyClock 设备',
		},
		{
			type: 'static-text',
			id: 'feedback_info',
			width: 12,
			label: '反馈信息',
			value:
				'<strong>反馈监控</strong><br>跟踪反馈消息和错误计数',
		},
			{
				type: 'textinput',
				id: 'url',
				label: 'WebSocket URL',
				tooltip: 'WebSocket 服务器的 URL (ws[s]://域名[:端口][/路径])',
				width: 12,
				regex: '/' + this.wsRegex + '/',
			},
			{
				type: 'checkbox',
				id: 'reconnect',
				label: '重新连接',
				tooltip: 'WebSocket 错误时重新连接 (5秒后)',
				width: 6,
				default: true,
			},
			{
				type: 'dropdown',
				id: 'append_new_line',
				label: '添加终止字符',
				choices: [
					{id: '',   label: '无'},
					{id: 'rn', label: '回车+换行'},
					{id: 'nr', label: '换行+回车'},
					{id: 'r',  label: '回车'},
					{id: 'n',  label: '换行'},
				],
				width: 6,
				default: 'rn',
			},
			{
				type: 'checkbox',
				id: 'debug_messages',
				label: '调试消息',
				tooltip: '记录传入和传出的消息',
				width: 6,
			},
		]
	}

	initFeedbacks() {
		this.setFeedbackDefinitions({
			control_mode: {
				type: 'boolean',
				name: '控制模式',
				description: '指示当前控制模式',
				options: [
					{
						type: 'dropdown',
						label: '模式',
						id: 'mode',
						choices: [
							{id: 'CtrlMode1', label: '模式 1'},
							{id: 'CtrlMode2', label: '模式 2'}
						],
						default: 'CtrlMode2'
					}
				],
				callback: (feedback) => {
					return this.controlMode === feedback.options.mode
				}
			},
			timing_status: {
				type: 'boolean',
				name: '计时状态',
				description: '指示当前计时状态',
				options: [
					{
						type: 'dropdown',
						label: '状态',
						id: 'status',
						choices: [
							{id: 'Play', label: '运行中'},
							{id: 'Stop', label: '已停止'}
						],
						default: 'Play'
					}
				],
				callback: (feedback) => {
					return this.timingStatus === feedback.options.status
				}
			},
			// 反馈信息状态监控
			feedback_status: {
				type: 'boolean',
				name: '反馈状态',
				description: '指示反馈消息状态',
				options: [
					{
						type: 'dropdown',
						label: '状态',
						id: 'status',
						choices: [
							{id: 'valid', label: '有效反馈'},
							{id: 'invalid', label: '无效反馈'},
							{id: 'error', label: '错误计数 > 0'},
							{id: 'machine_time', label: '机器时间反馈'},
							{id: 'timer', label: '计时器反馈'}
						],
						default: 'valid'
					}
				],
				callback: (feedback) => {
					const status = feedback.options.status
					if (status === 'valid') {
						return this.lastFeedbackMessage && typeof this.lastFeedbackMessage === 'string' && !this.lastFeedbackMessage.startsWith('[INVALID]')
					} else if (status === 'invalid') {
						return this.lastFeedbackMessage && typeof this.lastFeedbackMessage === 'string' && this.lastFeedbackMessage.startsWith('[INVALID]')
					} else if (status === 'error') {
						return this.feedbackErrorCount > 0
					} else if (status === 'machine_time') {
						return this.lastFeedbackMessage && typeof this.lastFeedbackMessage === 'string' && this.lastFeedbackMessage.includes('计时器不计时时显示机器时间')
					} else if (status === 'timer') {
						return this.lastFeedbackMessage && typeof this.lastFeedbackMessage === 'string' && (
							this.lastFeedbackMessage.includes('计时器启动') ||
							this.lastFeedbackMessage.includes('计时器停止') ||
							this.lastFeedbackMessage.includes('计时器暂停') ||
							this.lastFeedbackMessage.includes('计时器恢复') ||
							this.lastFeedbackMessage.includes('计时器重置')
						)
					}
					return false
				}
			}
		})
	}

	initActions() {
		this.setActionDefinitions({
			// 时间设置功能
			set_time: {
				name: '设置倒计时时间',
				options: [
					{
						type: 'number',
						label: '文件编号',
						id: 'fileNumber',
						default: 0,
						min: 0,
						max: 99
					},
					{
						type: 'number',
						label: '时间（秒）',
						id: 'timeSeconds',
						default: 60,
						min: 1,
						max: 3600
					}
				],
				callback: async (action) => {
					const command = `cmd=AdCDS_${action.options.fileNumber}_${action.options.timeSeconds}_`
					await this.sendCommand(command)
				}
			},
			// 控制模式切换功能
			set_half_hand: {
				name: '设置半自动模式',
				callback: async () => {
					await this.sendCommand('cmd=CtrlHalfHand')
				}
			},
			set_full_hand: {
				name: '设置全自动模式',
				callback: async () => {
					await this.sendCommand('cmd=CtrlFullHand')
				}
			},
			// 开始/停止控制功能
			start_stop: {
				name: '开始/停止',
				callback: async () => {
					await this.sendCommand('cmd=StartStop')
				}
			},
			// 暂停/恢复功能
			pause_resume: {
				name: '暂停/恢复',
				callback: async () => {
					await this.sendCommand('cmd=PR')
				}
			},
			// 闪烁控制功能
			shine: {
				name: '闪烁控制',
				callback: async () => {
					await this.sendCommand('cmd=Shine')
				}
			},
			// 黑屏/取消黑屏功能
			black_white: {
				name: '黑屏/取消黑屏',
				callback: async () => {
					await this.sendCommand('cmd=BW')
				}
			},
			// 显示/隐藏控制功能
			show_hide: {
				name: '显示/隐藏窗口',
				callback: async () => {
					await this.sendCommand('cmd=SH')
				}
			},
			// 重置功能
			reset: {
				name: '重置计时器',
				callback: async () => {
					await this.sendCommand('cmd=Reset')
				}
			},
			// 时钟时间显示功能
			show_machine_time: {
				name: '显示机器时间',
				options: [
					{
						type: 'dropdown',
						label: '状态',
						id: 'state',
						choices: [
							{id: 'T', label: '显示'},
							{id: 'F', label: '隐藏'}
						],
						default: 'T'
					}
				],
				callback: async (action) => {
					const command = `cmd=ShowMachineTime_${action.options.state}`
					await this.sendCommand(command)
				}
			},
			// 计时模式设置功能
			timing_mode: {
				name: '设置计时模式',
				options: [
					{
						type: 'dropdown',
						label: '模式',
						id: 'mode',
						choices: [
							{id: 'T', label: '正计时'},
							{id: 'F', label: '倒计时'}
						],
						default: 'T'
					}
				],
				callback: async (action) => {
					const command = `cmd=IsTiming_${action.options.mode}`
					await this.sendCommand(command)
				}
			}
		})
	}
}

runEntrypoint(BobFlyClockInstance, [])