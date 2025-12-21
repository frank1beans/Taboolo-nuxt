"""
Process File Use Case - Main entry point for file processing.

This module orchestrates file parsing using the appropriate parser.
"""

from typing import Optional
from registry import get_parser
from domain import NormalizedEstimate


def process_file_content(
    file_content: bytes, 
    format_hint: str, 
    filename: Optional[str] = None
) -> NormalizedEstimate:
    """
    Main entry point to process a file buffer.
    
    Args:
        file_content: Raw bytes of the file.
        format_hint: 'six', 'excel', etc.
        filename: Optional filename for logging/debug.
        
    Returns:
        NormalizedEstimate with relational data.
    """
    parser = get_parser(format_hint)
    estimate = parser.parse(file_content, filename=filename)
    return estimate


def process_file_path(file_path: str, format_hint: str) -> NormalizedEstimate:
    """
    Helper to process a file by path.
    """
    with open(file_path, "rb") as f:
        content = f.read()
    return process_file_content(content, format_hint, filename=file_path)
