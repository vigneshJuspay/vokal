/**
 * Audio Player Utility
 *
 * @module utils/audio-player
 * @since 1.0.0
 */

import { spawn } from 'child_process';
import { resolve } from 'path';
import { existsSync, accessSync, constants } from 'fs';
import { VoiceTestError, ErrorCode } from '../errors/voice-test.errors.js';

export async function playAudio(filePath: string): Promise<void> {
  const resolvedPath = resolve(filePath);

  if (!existsSync(resolvedPath)) {
    throw new VoiceTestError(`Audio file not found: ${filePath}`, ErrorCode.FILE_NOT_FOUND);
  }

  let command: string;
  let args: string[];

  if (process.platform === 'darwin') {
    command = '/usr/bin/afplay';
    args = [resolvedPath];
  } else if (process.platform === 'linux') {
    command = '/usr/bin/aplay';
    args = [resolvedPath];
  } else if (process.platform === 'win32') {
    command = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';
    args = [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      `(New-Object Media.SoundPlayer '${resolvedPath.replace(/'/g, "''")}').PlaySync()`,
    ];
  } else {
    throw new VoiceTestError(
      `Unsupported platform: ${process.platform}`,
      ErrorCode.AUDIO_PLAYBACK_FAILED
    );
  }

  // 🔒 Ensure binary is executable (prevents fake / replaced files)
  try {
    accessSync(command, constants.X_OK);
  } catch {
    throw new VoiceTestError(
      `Audio player binary is not executable or not trusted: ${command}`,
      ErrorCode.AUDIO_PLAYBACK_FAILED
    );
  }

  return new Promise((resolve, reject) => {
    const player = spawn(command, args, {
      shell: false,
      stdio: 'ignore',
    });

    player.on('error', (error) => {
      reject(
        new VoiceTestError(
          `Failed to start audio player: ${error.message}`,
          ErrorCode.AUDIO_PLAYBACK_FAILED,
          error
        )
      );
    });

    player.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new VoiceTestError(
            `Audio player exited with code ${code}`,
            ErrorCode.AUDIO_PLAYBACK_FAILED
          )
        );
      }
    });
  });
}
