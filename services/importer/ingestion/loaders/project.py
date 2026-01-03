
from typing import Optional
from datetime import datetime
import uuid

from infrastructure.dto import Project
from domain import NormalizedEstimate

class ProjectLoader:
    @staticmethod
    def create(estimate: NormalizedEstimate, project_id: Optional[str] = None) -> Project:
        proj_id = project_id or str(uuid.uuid4())
        
        # Determine Project Name
        p_name = estimate.project_name or "Imported Project"
        
        return Project(
            _id=proj_id,
            code="IMP-" + datetime.utcnow().strftime("%Y%m%d-%H%M"), # Fallback code
            name=p_name,
            status="active"
        )
