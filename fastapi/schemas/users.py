from typing import List
from pydantic import BaseModel


class JDRequest(BaseModel):
    """_summary_

    Args:
        BaseModel (_type_): _description_
    """
    jd_text: str 


class QAPair(BaseModel):
    question: str
    answer: str
    mode: str | None = None


class EvaluateRequest(BaseModel):
    user_id: str
    qa_pairs: List[QAPair]