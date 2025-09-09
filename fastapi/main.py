import json
from typing import Dict, List
import io
import os

from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi import FastAPI, Response, UploadFile, File, Form, HTTPException
from gtts import gTTS
from pydantic import BaseModel
import json
import httpx
import requests
import speech_recognition as sr
import shutil

from schemas.users import JDRequest, EvaluateRequest

app = FastAPI()

# Optional: Enable CORS if using from frontend like React/Vue
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*", "http://localhost:3000", "https://localhost:3000"],  # Set to specific domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OLLAMA_URL = "http://localhost:11434/api/generate"

# Directory to save audio files
AUDIO_DIR = "audio_files"
os.makedirs(AUDIO_DIR, exist_ok=True)
# Mount static route to serve saved audio files
app.mount("/audio", StaticFiles(directory=AUDIO_DIR), name="audio")


QUESTIONS = {}

MEDIA_ROOT = "media"

# Simulated session storage
user_sessions = {}


async def call_ollama(model: str, prompt: str) -> str:
    """
    Async helper to call Ollama and collect streamed response.
    """
    output_text = ""
    async with httpx.AsyncClient(timeout=None) as client:
        async with client.stream(
            "POST",
            OLLAMA_URL,
            json={"model": model, "prompt": prompt},
        ) as response:
            async for line in response.aiter_lines():
                if line:
                    try:
                        data = json.loads(line)
                        if "response" in data:
                            output_text += data["response"]
                    except Exception:
                        pass
    return output_text


# LLM-based evaluation
async def evaluate_with_llm(question: str, answer: str) -> Dict:
    """
    Calls a local LLM API (Ollama, OpenAI, etc.) to evaluate answer.
    """
    prompt = f"""
    You are an interviewer. Evaluate the candidate's answer.

    Question: {question}
    Answer: {answer}

    Return the evaluation ONLY as a JSON object.
    Do not include any text, explanations, or code fences.
    The JSON must strictly follow this schema:

    {{
      "score": <integer 1–10>,
      "strengths": "<short text>",
      "improvements": "<short text>"
    }}
    """

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:11434/api/generate",  # 🔹 Change to your LLM API
            json={"model": "qwen2.5:7b", "prompt": prompt, "stream": False},
            timeout=120
        )

    result_text = response.json()["response"]
    # print("Evaluation result:", result_text)
    # Fallback in case model returns plain text
    import json
    try:
        return json.loads(result_text)
    except Exception:
        print("Failed to parse JSON, returning default evaluation.")
        return {
            "score": 5,
            "strengths": "Answer has some valid points",
            "improvements": "Provide more structured explanation"
        }


@app.post("/extract-and-generate/{user_id}")
async def extract_and_generate(request: JDRequest, user_id: str):
    """
    Extract skills from job description and generate interview questions.
    """

    print("user_id:", user_id)
    # Extract skills
    extract_prompt = f"""
    Extract all technical skills, programming languages, frameworks, libraries and tools mentioned in this job description. 

    Return only a JSON list of the extracted items, with no additional text or explanation.

    Job Description:
    {request.jd_text}
    """

    extracted_text = await call_ollama("qwen2.5:7b", extract_prompt)

    try:
        extracted_skills = json.loads(extracted_text)
    except Exception:
        extracted_skills = [s.strip() for s in extracted_text.split(",") if s.strip()]

    # Generate questions
    skills_str = ", ".join(extracted_skills)
    print("skills_str:", skills_str)
    questions_prompt = f"""
        You are an expert technical interviewer.
        Generate interview questions for the following skills:
        {skills_str}

        For each skill:
        - Give 1 technical questions (focused on practical knowledge).
        - Give 1 behavioral questions (focused on teamwork, problem-solving, project experience).

        Return the result as a JSON dictionary, where each key is a skill and its value is a list of the 5 questions.

        Example format: {{ "java": ["q1", "q2", ...], "python": ["q1", ...] }}
        Return the JSON only, with no extra explanation or text.
        """

    questions_text = await call_ollama("qwen2.5:7b", questions_prompt)

    try:
        QUESTIONS = json.loads(questions_text)
    except Exception:
        QUESTIONS = questions_text

    # Store session data
    user_sessions[user_id] = {
        "jd_text": request.jd_text,
        "extracted_skills": extracted_skills,
        "questions": QUESTIONS
    }

    return {
        "user_id": user_id,
        "skills": extracted_skills,
        "questions": QUESTIONS
    }


@app.post("/evaluate-answers")
async def evaluate_answers(payload: EvaluateRequest):
    evaluations: List[Dict] = []

    # Validate user_id exists in session
    if payload.user_id not in user_sessions:
        raise HTTPException(status_code=400, detail="Invalid or expired user_id")

    for qa in payload.qa_pairs:
        eval_result = await evaluate_with_llm(qa.question, qa.answer)
        evaluations.append({
            "question": qa.question,
            "answer": qa.answer,
            "score": eval_result["score"],
            "strengths": eval_result["strengths"],
            "improvements": eval_result["improvements"],
        })

    print("Evaluations:", evaluations)
    return {"user_id": payload.user_id, "evaluations": evaluations}


@app.post("/speech-to-text/")
async def speech_to_text(
    user_id: str = Form(...),  # user_id comes as form-data
    file: UploadFile = File(...)
):
    """
    Accepts an uploaded audio file, saves it in media/<user_id>/,
    converts it to text, and returns transcript.
    """
    recognizer = sr.Recognizer()

    try:
        # Create folder media/<user_id> if not exists
        user_folder = os.path.join(MEDIA_ROOT, user_id)
        os.makedirs(user_folder, exist_ok=True)

        # Save uploaded file to media/<user_id>/
        file_path = os.path.join(user_folder, file.filename)
        with open(file_path, "wb") as f:
            f.write(await file.read())

        # Process audio file
        with sr.AudioFile(file_path) as source:
            audio = recognizer.record(source)
            transcript = recognizer.recognize_google(audio)

        print("Transcription:", transcript)
        return {
            "transcript": transcript,
            "file_path": file_path  # optional: return stored path
        }

    except Exception as e:
        print(e)
        return {"error": str(e)}