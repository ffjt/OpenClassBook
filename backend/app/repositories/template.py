from sqlalchemy import select

from app.models.book import Book
from app.models.template import Template
from app.repositories.base import BaseRepository
from app.schemas.template import TemplateCreate, TemplateUpdate


class TemplateRepository(BaseRepository[Template, TemplateCreate, TemplateUpdate]):
    model = Template

    def get_by_book(self, book_id: int) -> Template | None:
        statement = select(Template).where(Template.book_id == book_id)
        return self.session.scalar(statement)

    def book_exists(self, book_id: int) -> bool:
        return self.session.get(Book, book_id) is not None

    def upsert_by_book(self, book_id: int, data: TemplateUpdate) -> Template:
        template = self.get_by_book(book_id)
        changes = data.model_dump(exclude_unset=True)

        if template is None:
            template = Template(book_id=book_id, **changes)
            self.session.add(template)
        else:
            for field, value in changes.items():
                setattr(template, field, value)

        self.session.commit()
        self.session.refresh(template)
        return template
