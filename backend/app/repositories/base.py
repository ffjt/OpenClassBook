from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import Base


class BaseRepository[
    ModelT: Base,
    CreateSchemaT: BaseModel,
    UpdateSchemaT: BaseModel,
]:
    model: type[ModelT]

    def __init__(self, session: Session) -> None:
        self.session = session

    def create(self, data: CreateSchemaT) -> ModelT:
        """Persist and return a new model instance."""
        raise NotImplementedError

    def get(self, resource_id: int) -> ModelT | None:
        """Return one model instance by primary key."""
        raise NotImplementedError

    def update(self, resource_id: int, data: UpdateSchemaT) -> ModelT | None:
        """Update and return one model instance."""
        raise NotImplementedError

    def delete(self, resource_id: int) -> bool:
        """Delete one model instance."""
        raise NotImplementedError

    def list(self, *, offset: int = 0, limit: int = 100) -> list[ModelT]:
        """Return a paginated model collection."""
        raise NotImplementedError
