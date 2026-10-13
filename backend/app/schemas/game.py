from pydantic import BaseModel


class GameRead(BaseModel):
    id: str
    title: str
    subtitle: str
    category: str
    category_label: str
    icon: str
    color_accent: str
    is_active: bool

