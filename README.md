# Bitfocus Companion Generic FlyClock Module

This module provides a generic FlyClock connection for Bitfocus Companion, allowing you to send and receive messages from any FlyClock server.

## Features

- Connect to any FlyClock server (ws:// or wss://)
- Send text commands
- Send JSON objects
- Auto-reconnect functionality
- Connection status feedback
- Message received feedback
- Preset commands

## Installation

1. Clone or download this repository to your Companion modules directory
2. Run `npm install` in the module directory
3. Restart Companion
4. Add a new instance of "Generic FlyClock"

## Configuration

### General Settings

- **FlyClock URL**: The URL of the FlyClock server (e.g., `ws://localhost:8080` or `wss://example.com:443`)
- **Reconnect Interval**: Time in milliseconds to wait before attempting to reconnect after a disconnection
- **Auto Reconnect**: Enable or disable automatic reconnection

## Actions

### Send Text
Send a text command over FlyClock.

**Options:**
- **Command**: The text to send

### Send JSON
Send a JSON object over FlyClock.

**Options:**
- **JSON Object**: The JSON object to send (must be valid JSON)

## Feedbacks

### Connected
Indicates if the FlyClock connection is active.

**Style:**
- Green background when connected

### Message Received
Indicates if a message has been received from the FlyClock server.

**Style:**
- Yellow background when a message is received

## Presets

### Send Hello
Sends a simple "hello" command over FlyClock with connection status feedback.

## Example Usage

### Sending Commands
1. Add a button in Companion
2. Set the action to "Generic FlyClock: Send Text"
3. Enter the command to send (e.g., `toggle_power`)
4. Save the button

### Receiving Messages
Messages received from the FlyClock server are logged in the Companion debug logs.
You can extend the `handleIncomingMessage` function in `main.js` to process incoming messages and update feedbacks.

## Development

### Dependencies
- `@companion-module/base`: Companion base module
- `ws`: FlyClock library

### Running Tests
```bash
npm test
```

## License

MIT
