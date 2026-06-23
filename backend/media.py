import os
import json
import time
import asyncio
import logging

import cloudinary
import cloudinary.utils
from pywebpush import webpush, WebPushException

from db import db

logger = logging.getLogger(__name__)

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True,
)


def generate_cloudinary_signature(folder: str = "efootball"):
    timestamp = int(time.time())
    params = {"timestamp": timestamp, "folder": folder}
    signature = cloudinary.utils.api_sign_request(params, os.getenv("CLOUDINARY_API_SECRET"))
    return {
        "signature": signature,
        "timestamp": timestamp,
        "cloud_name": os.getenv("CLOUDINARY_CLOUD_NAME"),
        "api_key": os.getenv("CLOUDINARY_API_KEY"),
        "folder": folder,
    }


def _send_one(subscription: dict, payload: dict):
    try:
        webpush(
            subscription_info=subscription,
            data=json.dumps(payload),
            vapid_private_key=os.getenv("VAPID_PRIVATE_KEY"),
            vapid_claims={"sub": os.getenv("VAPID_SUBJECT", "mailto:admin@app.com")},
        )
        return True
    except WebPushException as exc:
        status_code = getattr(exc.response, "status_code", None)
        if status_code in (404, 410):
            return "gone"
        logger.warning("Push gönderim hatası: %s", exc)
        return False
    except Exception as exc:
        logger.warning("Push beklenmeyen hata: %s", exc)
        return False


async def broadcast_push(title: str, body: str, url: str = "/"):
    """Send a push notification to all stored subscriptions."""
    payload = {"title": title, "body": body, "url": url}
    subs = await db.push_subscriptions.find({}, {"_id": 0}).to_list(2000)
    stale = []
    for sub in subs:
        info = {"endpoint": sub["endpoint"], "keys": sub["keys"]}
        result = await asyncio.to_thread(_send_one, info, payload)
        if result == "gone":
            stale.append(sub["endpoint"])
    for endpoint in stale:
        await db.push_subscriptions.delete_one({"endpoint": endpoint})
