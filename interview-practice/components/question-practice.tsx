"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { getUserId } from "@/lib/user-id"
import { FeedbackCard } from "@/components/feedback-card"
import { VoiceRecorder } from "@/components/voice-recorder"

type Feedback = { score: number; strengths: string[]; improvements: string[] }

export function PracticeScreen() {
  const [questions, setQuestions] = useState<string[]>([])
  const [index, setIndex] = useState(0)

  // Replaces single-answer state with per-question answers and modes
  const [answers, setAnswers] = useState<string[]>([])
  const [modes, setModes] = useState<("text" | "voice")[]>([]) // optional tracking of how the answer was captured

  // Loading states
  const [loading, setLoading] = useState(false) // used for voice STT
  const [evalLoading, setEvalLoading] = useState(false) // used for Evaluate All

  // Final feedbacks after Evaluate All (one per question)
  const [allFeedback, setAllFeedback] = useState<Feedback[] | null>(null)

  // TTS support and state
  const [ttsSupported, setTtsSupported] = useState(false)
  const [ttsPlaying, setTtsPlaying] = useState(false)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem("practice_questions")
    if (stored) {
      try {
        const arr = JSON.parse(stored)
        if (Array.isArray(arr)) {
          setQuestions(arr)
          // initialize answers/modes to match number of questions
          setAnswers(Array(arr.length).fill(""))
          setModes(Array(arr.length).fill("text"))
        }
      } catch {}
    }
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined") {
      setTtsSupported("speechSynthesis" in window && "SpeechSynthesisUtterance" in window)
    }
    // stop speaking when unmounting
    return () => {
      try {
        window.speechSynthesis?.cancel()
      } catch {}
    }
  }, [])

  // current values based on index
  const question = useMemo(() => questions[index] || "", [questions, index])
  const currentAnswer = useMemo(() => answers[index] || "", [answers, index])

  // TTS controls for the current question
  function toggleSpeakQuestion() {
    if (!ttsSupported || !question) return
    const synth = window.speechSynthesis
    if (ttsPlaying) {
      synth.cancel()
      setTtsPlaying(false)
      return
    }
    synth.cancel()
    const u = new SpeechSynthesisUtterance(question)
    u.lang = "en-US"
    u.rate = 1
    u.onend = () => setTtsPlaying(false)
    utteranceRef.current = u
    setTtsPlaying(true)
    synth.speak(u)
  }

  useEffect(() => {
    // stop speaking when question changes
    if (ttsPlaying) {
      try {
        window.speechSynthesis?.cancel()
      } catch {}
      setTtsPlaying(false)
    }
  }, [index, question, ttsPlaying])

  // Update current answer in the answers array
  function updateCurrentAnswer(next: string) {
    setAllFeedback(null) // clear previous final results if user edits
    setAnswers((prev) => {
      const copy = prev.slice()
      copy[index] = next
      return copy
    })
    setModes((prev) => {
      const copy = prev.slice()
      copy[index] = "text"
      return copy
    })
  }

  async function submitVoiceBlob(blob: Blob) {
    const user_id = getUserId();
    try {
      // Convert blob into FormData (so it mimics file upload)
      const formData = new FormData()
      formData.append("file", blob, "recording.wav")
      formData.append("user_id", user_id) // pass logged-in user id here


      const response = await fetch("http://127.0.0.1:8000/speech-to-text/", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to transcribe audio")
      }

      const data = await response.json()
      console.log("Transcript:", data)

      // Example: if your backend returns { transcript: "..." }
      // set the transcript into your text field
      updateCurrentAnswer(data.transcript)
    } catch (err) {
      console.error("Speech-to-text error:", err)
    }
  }

  // Voice flow now only transcribes and stores the text; no per-question evaluation
  // async function submitVoiceBlob(blob: Blob) {
  //   setLoading(true)
  //   setAllFeedback(null)
  //   try {
  //     const formData = new FormData()
  //     formData.append("audio", blob, "answer.webm")
  //     const stt = await fetch("/api/speech-to-text", { method: "POST", body: formData })
  //     if (!stt.ok) throw new Error("Failed to transcribe audio")
  //     const { transcript } = await stt.json()

  //     setAnswers((prev) => {
  //       const copy = prev.slice()
  //       copy[index] = transcript || ""
  //       return copy
  //     })
  //     setModes((prev) => {
  //       const copy = prev.slice()
  //       copy[index] = "voice"
  //       return copy
  //     })
  //   } catch (e) {
  //     console.error("[v0] voice transcription error", e)
  //   } finally {
  //     setLoading(false)
  //   }
  // }

  function nextQuestion() {
    setIndex((i) => Math.min(i + 1, Math.max(questions.length - 1, 0)))
  }
  function prevQuestion() {
    setIndex((i) => Math.max(i - 1, 0))
  }

  const allAnswered =
    questions.length > 0 && answers.length === questions.length && answers.every((a) => (a || "").trim().length > 0)

  async function evaluateAll() {
    if (!allAnswered) return;
    setEvalLoading(true);
    setAllFeedback(null);

    const user_id = getUserId();

    try {
      const payload = {
        user_id,
        qa_pairs: questions.map((q, i) => ({
          question: q,
          answer: answers[i],
          mode: modes[i],
        })),
      };

      const res = await fetch(`http://127.0.0.1:8000/evaluate-answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to evaluate answers");

      const data = await res.json();
      // data = { user_id, evaluations: [{ question, answer, evaluation }] }
      setAllFeedback(data.evaluations);
    } catch (e) {
      console.error("[evaluateAll] error", e);
    } finally {
      setEvalLoading(false);
    }
  }


  if (!questions.length) {
    return (
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>No questions found</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            You don’t have any generated questions yet. Go to the upload page to generate questions from a job
            description.
          </p>
          <Button asChild>
            <a href="/upload">Generate Questions</a>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-3xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-pretty">Practice</CardTitle>
          <Badge variant="secondary">
            {index + 1} / {questions.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Question with TTS controls */}
        <div className="p-4 rounded-md border bg-card">
          <p className="text-lg">{question}</p>
          <div className="mt-3 flex gap-2">
            {ttsSupported && (
              <Button variant="outline" size="sm" onClick={toggleSpeakQuestion}>
                {ttsPlaying ? "Stop" : "Play question"}
              </Button>
            )}
          </div>
        </div>

        {/* Text answer */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Type your answer</label>
          <Textarea
            rows={6}
            placeholder="Write your answer here..."
            value={currentAnswer}
            onChange={(e) => updateCurrentAnswer(e.target.value)}
          />
        </div>

        {/* Voice answer to fill the text automatically */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Or answer with voice (it will fill the text)</label>
          <VoiceRecorder onStop={submitVoiceBlob} disabled={loading || evalLoading} />
        </div>

        {/* Navigation and evaluate-all actions */}
        <div className="flex items-center justify-between pt-2">
          <Button variant="outline" onClick={prevQuestion} disabled={index === 0 || loading || evalLoading}>
            Previous
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={nextQuestion}
              disabled={index >= questions.length - 1 || loading || evalLoading}
            >
              Next
            </Button>
            <Button onClick={evaluateAll} disabled={!allAnswered || evalLoading}>
              {evalLoading ? "Evaluating..." : "Evaluate All"}
            </Button>
          </div>
        </div>

        {/* Final results after evaluate-all */}
        {allFeedback && (
          <div className="space-y-4 pt-4">
            {allFeedback.map((fb, i) => (
              <div key={i} className="space-y-2">
                <div className="p-3 rounded-md border bg-muted/30">
                  <p className="text-sm font-medium">Question {i + 1}</p>
                  <p className="text-sm text-muted-foreground">{questions[i]}</p>
                </div>
                <FeedbackCard feedback={fb} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
