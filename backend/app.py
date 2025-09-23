"""
Flask-based backend server for the mental health support application.

Exposes:
- POST /api/chat      -> { reply: str, scores: { anxiety, depression, stress } }  # 0~1
- GET  /api/dashboard -> { averages: {...}, weekly: [{day, anxiety, depression}] } # 0~1
"""

import json
import os
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Any

from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv

from openai import OpenAI
from openai._exceptions import OpenAIError  

load_dotenv()

app = Flask(__name__)
CORS(app)

# ----- OpenAI 설정 -----
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise RuntimeError("Missing OPENAI_API_KEY. Set it in backend/.env")

client = OpenAI(api_key=OPENAI_API_KEY)
MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")  

EmotionEntry = Dict[str, Any]
emotion_history: List[EmotionEntry] = []


def analyze_message_with_openai(message: str) -> Dict[str, Any]:
    """
    OpenAI에 메시지를 보내 공감 응답과 0~1 감정 스코어를 생성.
    JSON 모드로 강제하여 파싱 안정성 확보.
    """
    system_prompt = (
        "You are a compassionate Korean mental health assistant. You will be given a "
        "message from a user. Respond empathetically in Korean and assess the user's "
        "levels of anxiety, depression and stress on a 0–100 scale. "
        "Return only a JSON object with the keys: "
        "response (string), anxiety (number), depression (number), stress (number). "
        "Do not include any additional fields or explanations."
    )
    user_prompt = (
        f"User message: {message}\n\n"
        "Remember: respond as a JSON object with keys response, anxiety, depression, stress."
    )

    try:
        completion = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.7,
            response_format={"type": "json_object"},
        )
        raw_content = completion.choices[0].message.content or "{}"
        data = json.loads(raw_content)

        for key in ["response", "anxiety", "depression", "stress"]:
            if key not in data:
                raise ValueError(f"Missing key in response: {key}")

        def norm01(x) -> float:
            try:
                return max(0.0, min(1.0, float(x) / 100.0))
            except Exception:
                return 0.0

        return {
            "reply": data["response"],
            "scores": {
                "anxiety": norm01(data["anxiety"]),
                "depression": norm01(data["depression"]),
                "stress": norm01(data["stress"]),
            },
        }
    except (OpenAIError, ValueError, json.JSONDecodeError, Exception):
        return {
            "reply": "죄송합니다. 현재 AI 응답 생성에 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
            "scores": {"anxiety": 0.0, "depression": 0.0, "stress": 0.0},
        }


@app.route("/api/chat", methods=["POST"])
def chat_endpoint():
    """
    요청: { "message": "..." }
    응답: { "reply": "...", "scores": {anxiety, depression, stress} } (0~1)
    """
    data = request.get_json(silent=True) or {}
    user_message: str = (data.get("message") or "").strip()
    if not user_message:
        return jsonify({"error": "No message provided."}), 400

    result = analyze_message_with_openai(user_message)

    # 0~1 스코어를 그대로 저장 (UTC, tz-aware)
    emotion_history.append(
        {
            "timestamp": datetime.now(timezone.utc),
            "scores": {
                "anxiety": float(result["scores"]["anxiety"]),
                "depression": float(result["scores"]["depression"]),
                "stress": float(result["scores"]["stress"]),
            },
        }
    )
    return jsonify(result)


@app.route("/api/dashboard", methods=["GET"])
def dashboard_endpoint():
    """
    최근 7일 평균과 일자별(과거→오늘) 추세를 반환.
    응답: {
      averages: { anxiety, depression, stress, wellbeing },  # 0~1
      weekly:   [{ day, anxiety, depression }, ...]          # 0~1
    }
    """
    now = datetime.now(timezone.utc)
    seven_days_ago = now - timedelta(days=7)
    recent_entries = [e for e in emotion_history if e["timestamp"] >= seven_days_ago]

    if recent_entries:
        n = len(recent_entries)
        avg_anxiety = sum(e["scores"]["anxiety"] for e in recent_entries) / n
        avg_depression = sum(e["scores"]["depression"] for e in recent_entries) / n
        avg_stress = sum(e["scores"]["stress"] for e in recent_entries) / n
    else:
        avg_anxiety = avg_depression = avg_stress = 0.0

    wellbeing = max(0.0, min(1.0, 1.0 - ((avg_anxiety + avg_depression + avg_stress) / 3.0)))

    korean_days = ["월", "화", "수", "목", "금", "토", "일"]
    trend = []
    for day_offset in range(7):
        day_date = now - timedelta(days=(6 - day_offset))
        day_entries = [e for e in emotion_history if e["timestamp"].date() == day_date.date()]
        if day_entries:
            d_anxiety = sum(e["scores"]["anxiety"] for e in day_entries) / len(day_entries)
            d_depression = sum(e["scores"]["depression"] for e in day_entries) / len(day_entries)
        else:
            d_anxiety = d_depression = 0.0
        day_name = korean_days[day_date.weekday()]
        trend.append({"day": day_name, "anxiety": d_anxiety, "depression": d_depression})

    return jsonify(
        {
            "averages": {
                "anxiety": avg_anxiety,
                "depression": avg_depression,
                "stress": avg_stress,
                "wellbeing": wellbeing,
            },
            "weekly": trend,
        }
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
