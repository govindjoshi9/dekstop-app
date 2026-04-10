import * as path from 'path'
import * as fs from 'fs'
import { spawn } from 'child_process'

// Try to load ffmpeg-static binary path
let ffmpegPath: string
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ffmpegPath = require('ffmpeg-static') as string
} catch {
  ffmpegPath = 'ffmpeg' // fallback to system ffmpeg
}

/**
 * Merge screen.webm and (optionally) webcam.webm into final.mp4
 * Webcam is overlaid as a picture-in-picture in the bottom-right corner.
 */
export function mergeRecordings(
  screenFile: string,
  webcamFile: string,
  outputFile: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const hasWebcam = fs.existsSync(webcamFile)

    let args: string[]

    if (hasWebcam) {
      // PiP: webcam in bottom-right, scaled to 240x135
      args = [
        '-y',
        '-i', screenFile,
        '-i', webcamFile,
        '-filter_complex',
        '[1:v]scale=240:135[pip];[0:v][pip]overlay=W-w-20:H-h-20[v]',
        '-map', '[v]',
        '-map', '0:a?',
        '-map', '1:a?',
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',
        '-c:a', 'aac',
        '-shortest',
        outputFile,
      ]
    } else {
      args = [
        '-y',
        '-i', screenFile,
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',
        '-c:a', 'aac',
        outputFile,
      ]
    }

    const proc = spawn(ffmpegPath, args)
    let stderr = ''
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString() })
    proc.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`FFmpeg exited with code ${code}:\n${stderr}`))
      }
    })
    proc.on('error', reject)
  })
}

/**
 * Get the path to the ffmpeg binary (for display purposes)
 */
export function getFFmpegPath(): string {
  return ffmpegPath
}

/**
 * Check if ffmpeg is available
 */
export function checkFFmpeg(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn(ffmpegPath, ['-version'])
    proc.on('close', (code) => resolve(code === 0))
    proc.on('error', () => resolve(false))
  })
}
