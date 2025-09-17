import json
from typing import Dict, List
import io
import os
import asyncio
from contextlib import asynccontextmanager
from datetime import datetime, timedelta

from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi import FastAPI, Response, UploadFile, File, Form, HTTPException
# from gtts import gTTS
# from pydantic import BaseModel
import json
import httpx
# import requests
import speech_recognition as sr
# import shutil

from schemas.users import JDRequest, EvaluateRequest




import os
import asyncio
from datetime import datetime, timedelta
from contextlib import asynccontextmanager
from fastapi import FastAPI

AUDIO_DIR = "your_audio_dir_path"  # change to your folder path

async def delete_old_files():
    while True:
        now = datetime.now()
        for filename in os.listdir(AUDIO_DIR):
            file_path = os.path.join(AUDIO_DIR, filename)
            if os.path.isfile(file_path):
                try:
                    # Extract timestamp from the second last underscore-separated part
                    parts = filename.rsplit("_", maxsplit=2)
                    if len(parts) < 2:
                        continue
                    timestamp_str = parts[-2]
                    file_time = datetime.strptime(timestamp_str, "%Y%m%d%H%M%S")
                    
                    # ✅ Delete if older than 1 minute
                    if now - file_time > timedelta(minutes=30):
                        os.remove(file_path)
                        print(f"🗑️ Deleted file: {filename}")
                except Exception as e:
                    print(f"⚠️ Skipping file {filename} due to error: {e}")
        
        # ✅ Check every 30 seconds
        await asyncio.sleep(1800)

# Lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: launch cleanup task
    task = asyncio.create_task(delete_old_files())
    yield
    # Shutdown: cancel cleanup task if needed
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        print("Cleanup task cancelled")

app = FastAPI(lifespan=lifespan)


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
AUDIO_DIR = "media"
os.makedirs(AUDIO_DIR, exist_ok=True)
# Mount static route to serve saved audio files
app.mount("/audio", StaticFiles(directory=AUDIO_DIR), name="audio")


QUESTIONS = {}

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
async def extract_and_generate(
    user_id: str,
    jd_text: str = Form(None),
    file: UploadFile = File(None)
):
    """
    Extract skills from job description text or uploaded file,
    then generate interview questions.
    """
    if jd_text and file:
        return {"error": "Please provide either text OR file, not both."}
    # ✅ 1. Get JD text either from form field or file
    content = ""
    if jd_text:
        content = jd_text
    elif file:
        file_content = await file.read()
        # If it's a text file
        if file.filename.endswith(".txt"):
            content = file_content.decode("utf-8")
        # If it's a pdf (use PyPDF2 or pdfplumber)
        elif file.filename.endswith(".pdf"):
            import fitz
            with fitz.open(stream=file_content, filetype="pdf") as doc:
                content = "\n".join(page.get_text() for page in doc)
        # If it's a docx
        elif file.filename.endswith(".docx"):
            from docx import Document
            import io
            doc = Document(io.BytesIO(file_content))
            content = "\n".join([p.text for p in doc.paragraphs])
        else:
            return {"error": "Unsupported file format"}

    if not content:
        return {"error": "No job description text or file provided"}

    print("Job Description Content:", content[:200])  # Print first 200 chars
    # ✅ 2. Extract skills (your same prompt logic)
    extract_prompt = f"""
    Extract all technical skills, programming languages, frameworks, libraries and tools mentioned in this job description. 

    Return only a JSON list of the extracted items, with no additional text or explanation.

    Job Description:
    {content}
    """

    extracted_text = await call_ollama("qwen2.5:7b", extract_prompt)

    try:
        extracted_skills = json.loads(extracted_text)
    except Exception:
        extracted_skills = [s.strip() for s in extracted_text.split(",") if s.strip()]

    # 3. Generate questions
    skills_str = ", ".join(extracted_skills)
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

    # ✅ 4. Store session data
    user_sessions[user_id] = {
        "jd_text": content,
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
        user_folder = os.path.join(AUDIO_DIR, user_id)
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