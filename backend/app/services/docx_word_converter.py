import importlib.util
import logging
import sys
from contextlib import redirect_stderr, redirect_stdout
from dataclasses import dataclass
from functools import lru_cache
from io import StringIO
from pathlib import Path
from threading import Lock

from pypdf import PdfReader

logger = logging.getLogger(__name__)

_WORD_CONVERSION_LOCK = Lock()


@dataclass(frozen=True)
class WordConversionResult:
    converted: bool
    attempted: bool


@lru_cache(maxsize=1)
def word_conversion_available() -> bool:
    if importlib.util.find_spec("docx2pdf") is None:
        return False
    if sys.platform == "darwin":
        return Path("/Applications/Microsoft Word.app").exists()
    if sys.platform != "win32":
        return False

    import winreg

    try:
        with winreg.OpenKey(winreg.HKEY_CLASSES_ROOT, r"Word.Application\CLSID"):
            return True
    except OSError:
        return False


def convert_docx_with_word(source: Path, destination: Path) -> WordConversionResult:
    if not word_conversion_available():
        return WordConversionResult(converted=False, attempted=False)

    destination.unlink(missing_ok=True)
    with _WORD_CONVERSION_LOCK:
        try:
            _convert(source.resolve(), destination.resolve())
            reader = PdfReader(destination, strict=False)
            if reader.is_encrypted or not reader.pages:
                raise ValueError("Microsoft Word produced an invalid PDF")
            return WordConversionResult(converted=True, attempted=True)
        except Exception:
            destination.unlink(missing_ok=True)
            logger.warning("Microsoft Word DOCX conversion failed", exc_info=True)
            return WordConversionResult(converted=False, attempted=True)


def _convert(source: Path, destination: Path) -> None:
    from docx2pdf import convert

    if sys.platform != "win32":
        convert(str(source), str(destination))
        return

    import pythoncom
    import win32com.client

    pythoncom.CoInitialize()
    word_was_running = _word_is_running(win32com.client)
    try:
        with redirect_stdout(StringIO()), redirect_stderr(StringIO()):
            convert(str(source), str(destination), keep_active=word_was_running)
    except Exception:
        if not word_was_running:
            _quit_word_started_for_conversion(win32com.client)
        raise
    finally:
        pythoncom.CoUninitialize()


def _word_is_running(client) -> bool:
    try:
        client.GetActiveObject("Word.Application")
        return True
    except Exception:
        return False


def _quit_word_started_for_conversion(client) -> None:
    try:
        client.GetActiveObject("Word.Application").Quit()
    except Exception:
        pass


__all__ = [
    "WordConversionResult",
    "convert_docx_with_word",
    "word_conversion_available",
]
