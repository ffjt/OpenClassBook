from fastapi import APIRouter

from app.api.v1 import articles, authors, books, invites, join, templates

api_router = APIRouter()
api_router.include_router(books.router)
api_router.include_router(templates.router)
api_router.include_router(authors.router)
api_router.include_router(articles.router)
api_router.include_router(invites.router)
api_router.include_router(join.router)
