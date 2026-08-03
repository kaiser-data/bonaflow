"use client";

import { useEffect, useRef, useState } from "react";

const mimeCandidates = [
  "audio/mp4",
  "audio/webm;codecs=opus",
  "audio/webm",
];

// Below this the button was tapped, not held. Say so instead of blaming the API.
const MIN_AUDIO_BYTES = 2000;

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
  const stopRequestedRef = useRef(false);

  useEffect(() => () => releaseStream(), []);

  function releaseStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  async function startRecording() {
    if (recorderRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia || !("MediaRecorder" in window)) {
      setMessage("Voice unavailable — use text below");
      onFallback();
      return;
    }
    stopRequestedRef.current = false;
    setRecording(true);
    setMessage("Listening… release to stop");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // The button can be released while the permission prompt is still pending.
      if (stopRequestedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        setMessage("Hold the button while you speak");
        return;
      }
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
      recorder.onstop = () => {
        // Release the microphone only once the last chunk has been flushed.
        releaseStream();
        recorderRef.current = null;
        void transcribe(recorder.mimeType);
      };
      recorderRef.current = recorder;
      recorder.start(250);
    } catch {
      setRecording(false);
      releaseStream();
      setMessage("Microphone unavailable — use text below");
      onFallback();
    }
  }

  function stopRecording() {
    stopRequestedRef.current = true;
    setRecording(false);
    const recorder = recorderRef.current;
    if (recorder?.state === "recording") recorder.stop();
  }

  async function transcribe(mimeType: string) {
    const blob = new Blob(chunksRef.current, { type: mimeType });
    if (blob.size < MIN_AUDIO_BYTES) {
      setMessage("That was too short — hold the button while you speak");
      return;
    }
    setMessage("Transcribing…");
    const extension = mimeType.includes("mp4") ? "m4a" : "webm";
    const formData = new FormData();
    formData.append("audio", blob, `bonaflow-update.${extension}`);
    try {
      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as {
        transcript?: string;
        error?: string;
      };
      if (!response.ok || !data.transcript) {
        throw new Error(data.error ?? "Transcription unavailable.");
      }
      onTranscript(data.transcript);
      setMessage("Captured — check the text below");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `${error.message} Use text below.`
          : "Transcription unavailable — use text below",
      );
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
