import asyncio
from datetime import datetime
from typing import Any, Dict

from fastapi import HTTPException


class BotService:
    def __init__(self):
        self.is_running = False
        self.bot_task = None
        self.config = {
            "interval_minutes": 60,
            "max_bewerbungen_per_day": 50,
            "platforms": ["immobilienscout24", "immowelt", "ebay-kleinanzeigen"],
        }

    async def start_bot(self, user_id: int) -> Dict[str, Any]:
        if self.is_running:
            raise HTTPException(status_code=400, detail="Bot is already running")

        self.is_running = True
        self.bot_task = asyncio.create_task(self._run_bot_loop(user_id))

        return {
            "message": "Bot started successfully",
            "started_at": datetime.now().isoformat(),
            "config": self.config,
        }

    async def stop_bot(self) -> Dict[str, Any]:
        if not self.is_running:
            raise HTTPException(status_code=400, detail="Bot is not running")

        self.is_running = False
        if self.bot_task:
            self.bot_task.cancel()
            try:
                await self.bot_task
            except asyncio.CancelledError:
                pass

        return {
            "message": "Bot stopped successfully",
            "stopped_at": datetime.now().isoformat(),
        }

    def get_bot_status(self) -> Dict[str, Any]:
        return {
            "is_running": self.is_running,
            "config": self.config,
            "status_check_time": datetime.now().isoformat(),
        }

    async def update_bot_config(self, new_config: Dict[str, Any]) -> Dict[str, Any]:
        self.config.update(new_config)
        return {"message": "Bot configuration updated", "new_config": self.config}

    async def _run_bot_loop(self, user_id: int):
        while self.is_running:
            try:
                await self._process_bewerbungen(user_id)
                await asyncio.sleep(self.config["interval_minutes"] * 60)
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"Error in bot loop: {e}")
                await asyncio.sleep(30)

    async def _process_bewerbungen(self, user_id: int):
        print(f"Processing bewerbungen for user {user_id}")


bot_service = BotService()
