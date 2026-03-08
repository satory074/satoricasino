from __future__ import annotations

import asyncio
import json
from dataclasses import dataclass, field

from fastapi import WebSocket


@dataclass
class ConnectionInfo:
    websocket: WebSocket
    user_id: str
    display_name: str


class WebSocketManager:
    def __init__(self):
        self.tables: dict[str, dict[str, ConnectionInfo]] = {}

    async def connect(self, table_id: str, user_id: str, display_name: str, websocket: WebSocket) -> None:
        await websocket.accept()
        if table_id not in self.tables:
            self.tables[table_id] = {}
        self.tables[table_id][user_id] = ConnectionInfo(
            websocket=websocket, user_id=user_id, display_name=display_name
        )

    def disconnect(self, table_id: str, user_id: str) -> None:
        if table_id in self.tables:
            self.tables[table_id].pop(user_id, None)
            if not self.tables[table_id]:
                del self.tables[table_id]

    async def broadcast(self, table_id: str, message: dict) -> None:
        if table_id not in self.tables:
            return
        data = json.dumps(message)
        disconnected = []
        for user_id, conn in self.tables[table_id].items():
            try:
                await conn.websocket.send_text(data)
            except Exception:
                disconnected.append(user_id)
        for uid in disconnected:
            self.disconnect(table_id, uid)

    async def send_to(self, table_id: str, user_id: str, message: dict) -> None:
        if table_id in self.tables and user_id in self.tables[table_id]:
            try:
                await self.tables[table_id][user_id].websocket.send_text(
                    json.dumps(message)
                )
            except Exception:
                self.disconnect(table_id, user_id)

    def get_connections(self, table_id: str) -> dict[str, ConnectionInfo]:
        return self.tables.get(table_id, {})


manager = WebSocketManager()
