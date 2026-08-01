"use client";

import { useEffect, useRef, useState } from "react";

const mimeCandidates = [
  "audio/mp4",
  "audio/webm;codecs=opus",
  "audio/webm",
];

export function VoiceRecorder({
  onTranscript,
  onFallback,
}: {
  onTranscript: (transcript: string) => void;
  onFallback: () => void;
}) {
  const [recording, setRecording] = useState(false);
  const [message, setMessage] = useState("Hold to talk");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(
    () => () => streamRef.current?.getTracks().forEach((track) => track.stop()),
    [],
  );

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || !("MediaRecorder" in window)) {
      setMessage("Voice unavailable — use text below");
      onFallback();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = mimeCandidates.find((candidate) =>
        MediaRecorder.isTypeSupported(candidate),
      );
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => void transcribe(recorder.mimeType);
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setMessage("Listening… release to stop");
    } catch {
      setMessage("Microphone unavailable — use text below");
      onFallback();
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current;
    if (recorder?.state === "recording") recorder.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    setRecording(false);
  }

  async function transcribe(mimeType: string) {
    setMessage("Transcribing…");
    const blob = new Blob(chunksRef.current, { type: mimeType });
    const extension = mimeType.includes("mp4") ? "m4a" : "webm";
    const formData = new FormData();
    formData.append("audio", blob, `staff-update.${extension}`);
    try {
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Transcription unavailable");
      const data = (await response.json()) as { transcript?: string };
      if (!data.transcript) throw new Error("Empty transcript");
      onTranscript(data.transcript);
      setMessage("Captured — check the text below");
    } catch {
      setMessage("Voice captured; transcription unavailable — use text below");
      onFallback();
    }
  }

  return (
    <div className="voice-control">
      <button
        type="button"
        className={recording ? "hold-button is-recording" : "hold-button"}
        onPointerDown={() => void startRecording()}
        onPointerUp={stopRecording}
        onPointerCancel={stopRecording}
        onContextMenu={(event) => event.preventDefault()}
      >
        <span aria-hidden="true">●</span>
        {recording ? "Release" : "Hold to talk"}
      </button>
      <p aria-live="polite">{message}</p>
    </div>
  );
}
