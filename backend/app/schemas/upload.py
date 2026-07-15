from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

UploadType = Literal[
    "cover",
    "preface",
    "afterword",
    "acknowledgement",
    "back_cover",
]


class UploadResponse(BaseModel):
    success: Literal[True] = True
    file_name: str
    file_size: int = Field(ge=0)
    file_type: str
    path: str
    uploaded_at: datetime
