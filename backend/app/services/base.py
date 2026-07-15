from pydantic import BaseModel

from app.db.database import Base
from app.repositories.base import BaseRepository


class BaseService[
    ModelT: Base,
    CreateSchemaT: BaseModel,
    UpdateSchemaT: BaseModel,
]:
    def __init__(
        self,
        repository: BaseRepository[ModelT, CreateSchemaT, UpdateSchemaT],
    ) -> None:
        self.repository = repository

    def create(self, data: CreateSchemaT) -> ModelT:
        return self.repository.create(data)

    def get(self, resource_id: int) -> ModelT | None:
        return self.repository.get(resource_id)

    def update(self, resource_id: int, data: UpdateSchemaT) -> ModelT | None:
        return self.repository.update(resource_id, data)

    def delete(self, resource_id: int) -> bool:
        return self.repository.delete(resource_id)

    def list(self, *, offset: int = 0, limit: int = 100) -> list[ModelT]:
        return self.repository.list(offset=offset, limit=limit)
