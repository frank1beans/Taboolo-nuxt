from typing import Protocol, BinaryIO
from schemas.domain import NormalizedEstimate

class ParserProtocol(Protocol):
    def parse(self, file_content: bytes, filename: str | None = None) -> NormalizedEstimate:
        """
        Parse raw bytes into a NormalizedEstimate.
        """
        ...
