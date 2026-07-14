from pydantic import BaseModel


class MessageResponse(BaseModel):
    message: str
    message_zh: str


class HealthResponse(BaseModel):
    status: str
    status_zh: str
