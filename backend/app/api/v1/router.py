from fastapi import APIRouter

from app.api.v1 import articles, authors, books, templates

api_router = APIRouter()
api_router.include_router(books.router)
api_router.include_router(templates.router)
api_router.include_router(authors.router)
api_router.include_router(articles.router)
