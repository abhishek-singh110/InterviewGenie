# AI Practice Platform

AI Practice is an interactive web-based platform that helps users prepare for job interviews by practicing with automatically generated questions based on a Job Description (JD). The system uses AI to generate questions, allows users to answer them (via text or audio), and provides an evaluation score.  

***

### Features
- **Upload or Paste JD**: Users can upload a Job Description file or paste the text directly.  
- **AI-Generated Questions**: An LLM generates relevant practice questions from the provided JD.  
- **Interactive Answering**: Users can answer the questions one by one via text input.  
- **Audio Support**: Users can also speak their answers, which are saved as audio files in the `media` folder.  
- **Scoring System**: AI evaluates the answers and provides feedback with a score.  
- **Session Management**: Each user session is tracked using a session store with unique `user_id`.  
- **Scalable Design**: Currently using session store, but ready for future database integration and enhanced features.  

***

### Tech Stack
- **Backend**: [FastAPI](https://fastapi.tiangolo.com/)  
- **Frontend**: [Next.js](https://nextjs.org/)  
- **LLM**: supported LLM (qwen2.5:7b) via Ollama.
- **Audio Management**: User answers saved as `.wav` in `media/` folder  
- **Session Store**: For unique user identification  

***

### Project Structure
```
askmyJD/
├── main.py          # API endpoints
├── utils/           # Helper functions
├── schemas/         # Schemas Requests 
│── media/           # Saved audio files
│── README.md        # Project documentation
```

***

### Installation & Setup

#### Prerequisites
- Python 3.9+  
- Node.js 16+  
- npm or yarn  
- Ollama

#### Backend (FastAPI)
```bash
cd backend
python -m venv venv
source venv/bin/activate   # On Windows use venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```
Runs the backend on `http://127.0.0.1:8000`

#### Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```
Runs the frontend on `http://localhost:3000`

***

### Usage
1. Navigate to the frontend app.  
2. Upload or paste a Job Description.  
3. Wait while AI generates relevant interview questions.  
4. Answer via text or audio input.  
5. Receive AI-generated feedback and score.  

***

### Future Enhancements
- Store results and audio files in a database.  
- Add user authentication for progress tracking.  
- Provide analytics and reports for performance improvement.  
- Add multiple AI model support.  
- Support multiple languages for Q&A.  

***

### Notes
- The platform currently uses the Qwen 7B model through Ollama.
- You need to download and install Ollama on your system in order to run the model locally.
- Since the 7B model is large and runs on CPU by default, generating questions and evaluating answers may take noticeable time.
- For faster performance, it is recommended to use GPU acceleration when available.
- The system is flexible: you can also integrate any other LLM (OpenAI, Hugging Face, etc.) for better speed and accuracy.