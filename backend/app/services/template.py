from app.models.template import Template
from app.schemas.template import TemplateCreate, TemplateUpdate
from app.services.base import BaseService


class TemplateService(BaseService[Template, TemplateCreate, TemplateUpdate]):
    def get_by_book(self, book_id: int) -> Template | None:
        return self.repository.get_by_book(book_id)

    def save_by_book(self, book_id: int, data: TemplateUpdate) -> Template | None:
        if not self.repository.book_exists(book_id):
            return None
        return self.repository.upsert_by_book(book_id, data)
