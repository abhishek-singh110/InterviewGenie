"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"

type Props = { onStop: (blob: Blob) => void; disabled?: boolean }

export function VoiceRecorder({ onStop, disabled }: Props) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const [recording, setRecording] = useState(false)
  const [supported, setSupported] = useState(true)

  useEffect(() => {
    setSupported(typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia)
  }, [])

  async function start() {
    if (!supported || disabled) return
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mr = new MediaRecorder(stream, { mimeType: "audio/webm" })
    chunksRef.current = []
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }
    mr.onstop = async () => {
      const webmBlob = new Blob(chunksRef.current, { type: "audio/webm" })

      // Convert WebM -> WAV before sending
      const wavBlob = await webmToWav(webmBlob)

      onStop(wavBlob)
      stream.getTracks().forEach((t) => t.stop())
    }
    mediaRecorderRef.current = mr
    mr.start()
    setRecording(true)
  }

  function stop() {
    mediaRecorderRef.current?.stop()
    setRecording(false)
  }

  if (!supported) {
    return <p className="text-sm text-muted-foreground">Voice recording not supported in this browser.</p>
  }

  return (
    <div className="flex gap-2">
      {recording ? (
        <Button variant="destructive" onClick={stop} disabled={disabled}>
          Stop Recording
        </Button>
      ) : (
        <Button onClick={start} disabled={disabled}>
          Start Recording
        </Button>
      )}
    </div>
  )
}

/**
 * Convert WebM blob to WAV blob
 */
async function webmToWav(webmBlob: Blob): Promise<Blob> {
  const arrayBuffer = await webmBlob.arrayBuffer()
  const audioCtx = new AudioContext()
  const decoded = await audioCtx.decodeAudioData(arrayBuffer)

  const numOfChannels = decoded.numberOfChannels
  const length = decoded.length * numOfChannels * 2 + 44
  const buffer = new ArrayBuffer(length)
  const view = new DataView(buffer)

  // WAV header
  function writeString(view: DataView, offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i))
    }
  }

  let offset = 0
  writeString(view, offset, "RIFF"); offset += 4
  view.setUint32(offset, 36 + decoded.length * numOfChannels * 2, true); offset += 4
  writeString(view, offset, "WAVE"); offset += 4
  writeString(view, offset, "fmt "); offset += 4
  view.setUint32(offset, 16, true); offset += 4
  view.setUint16(offset, 1, true); offset += 2
  view.setUint16(offset, numOfChannels, true); offset += 2
  view.setUint32(offset, decoded.sampleRate, true); offset += 4
  view.setUint32(offset, decoded.sampleRate * numOfChannels * 2, true); offset += 4
  view.setUint16(offset, numOfChannels * 2, true); offset += 2
  view.setUint16(offset, 16, true); offset += 2
  writeString(view, offset, "data"); offset += 4
  view.setUint32(offset, decoded.length * numOfChannels * 2, true); offset += 4

  // PCM samples
  const channels: Float32Array[] = []
  for (let i = 0; i < numOfChannels; i++) {
    channels.push(decoded.getChannelData(i))
  }

  let sampleIndex = 0
  while (sampleIndex < decoded.length) {
    for (let i = 0; i < numOfChannels; i++) {
      let sample = channels[i][sampleIndex]
      const s = Math.max(-1, Math.min(1, sample))
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
      offset += 2
    }
    sampleIndex++
  }

  return new Blob([buffer], { type: "audio/wav" })
}
