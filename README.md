# FlyClock Companion Module

This module allows Bitfocus Companion to control FlyClock devices via WebSocket.

## Features

- Start/Stop countdown timer
- Pause/Resume functionality
- Flash display
- Black screen toggle
- Show/Hide controls
- Reset timer
- Toggle between machine time display modes
- Switch between countdown and count-up modes
- Toggle between manual and automatic control modes

## Installation

1. Download the module package (.tgz file)
2. In Companion, go to Settings > Modules
3. Click "Install Module" and select the .tgz file
4. Restart Companion if prompted

## Configuration

1. Add a new instance of the FlyClock module
2. Configure the following settings:
   - **Host**: IP address of your FlyClock device (default: 192.168.0.38)
   - **Control Port**: WebSocket control port (default: 7777)
   - **Web Port**: HTTP web interface port (default: 8888)

## Usage

The module provides several actions and feedbacks:

### Actions
- Basic timer controls (Start/Stop, Pause/Resume, etc.)
- Mode toggles (Show time, Timing mode, Control mode)
- Adjust default time

### Feedbacks
- Connection status
- Playback status
- Current mode indicators

### Presets
Pre-configured buttons for common operations with visual feedback.

## Requirements

- FlyClock device with WebSocket server enabled
- Network connectivity between Companion and FlyClock
- Node.js 14+ (handled by Companion)
