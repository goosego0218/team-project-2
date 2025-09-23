# app.py
import os
import json
import uuid
from datetime import datetime, timedelta, timezone
from typing import TypedDict, Annotated, Optional, List, Dict, Any, NotRequired

from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# LangChain & LangGraph
from pydantic import BaseModel, Field
from langchain_core.messages import SystemMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnableConfig
from langgraph.graph.message import add_messages
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver

# OpenAI LLMs (LangChain OpenAI wrapper)
from langchain_openai import ChatOpenAI

# Tavily (검색)
try:
    from langchain_teddynote.tools.tavily import TavilySearch
except Exception:
    from langchain_community.tools.tavily_search import TavilySearchResults as TavilySearch

# -----------------------------------------------------------------------------
# 환경
# -----------------------------------------------------------------------------
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")  # 없으면 검색 노드는 동작 안 할 수 있음

if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY is required in backend/.env")

# -----------------------------------------------------------------------------
# 상태 정의
# -----------------------------------------------------------------------------
class State(TypedDict):
    messages: Annotated[list, add_messages]   # 대화 기록
    thread_id: str                            # 세션 식별번호
    crisis: bool                              # 위험 상태
    end_session: bool                         # 최종 요약
    need_summary: bool                        # 중간 요약
    summary: NotRequired[str]                 # 대화 내용 요약본
    search_result: Optional[List[Dict[str, str]]]  # 검색 결과

def build_initial_state(thread_id: str) -> State:
    return {
        "messages": [],
        "thread_id": thread_id,
        "crisis": False,
        "end_session": False,
        "need_summary": False,
    }

# -----------------------------------------------------------------------------
# LLM & 도구
# -----------------------------------------------------------------------------
tool_a = TavilySearch(max_results=4)
tools = [tool_a]

COUNSELOR_MODEL = os.getenv("COUNSELOR_MODEL", "gpt-4.1")
EVALUATOR_MODEL = os.getenv("EVALUATOR_MODEL", "gpt-4.1-mini")
RESEARCH_MODEL  = os.getenv("RESEARCH_MODEL",  "gpt-5")

llm_counselor = ChatOpenAI(model=COUNSELOR_MODEL, temperature=0.5, max_tokens=525)
llm_evaluator = ChatOpenAI(model=EVALUATOR_MODEL, temperature=0.3, max_tokens=800)
llm_research  = ChatOpenAI(model=RESEARCH_MODEL,  temperature=0.3, max_tokens=400)

try:
    llm_research.bind_tools(tools=tools)
except Exception:
    pass

# -----------------------------------------------------------------------------
# 라우팅 & 노드
# -----------------------------------------------------------------------------
def route_after_evaluator(state: State):
    if state.get("search_result") is not None:
        return "to_finish"
    if state.get("crisis"):
        return "to_search"
    if state.get("end_session"):
        return "to_finish"
    return "to_counselor"

# 0~100(%) 스케일
class EvalDecision(BaseModel):
    crisis: bool = Field(False)
    end_session: bool = Field(False)
    need_summary: bool = Field(False)
    anxiety: float = Field(0.0, ge=0.0, le=100.0)
    depression: float = Field(0.0, ge=0.0, le=100.0)
    stress: float = Field(0.0, ge=0.0, le=100.0)

def evaluator_node(state: State) -> State:
    sys = SystemMessage(content=(
        "너는 평가자야. 지금까지의 내담자-상담사 대화를 보고 다음을 판단해.\n"
        "- crisis : 즉시 전문기관 도움이 필요하면 True\n"
        "- end_session : 대화가 마무리되면 True\n"
        "- need_summary : 중간 요약이 필요하면 True(대략 6턴마다 권장)\n"
        "또한 감정 강도를 0~100(퍼센트)로 산출해:\n"
        "- anxiety, depression, stress ∈ [0,100]\n"
        "출력은 위 필드만 포함한 JSON 객체로 반환해. 추가 텍스트 금지."
    ))
    decide = llm_evaluator.with_structured_output(EvalDecision)
    d: EvalDecision = decide.invoke([sys] + state["messages"])
    return {
        **state,
        "crisis": bool(d.crisis),
        "end_session": bool(d.end_session),
        "need_summary": bool(d.need_summary),
        "anxiety": float(d.anxiety),
        "depression": float(d.depression),
        "stress": float(d.stress),
    }


def counselor_node(state: State) -> State:
    sys = SystemMessage(content=(
        "너는 내담자와 상담을 진행하는 모델이야. 무분별한 공감/위로는 자제하고, "
        "내담자가 스스로 고민을 털어놓고 객관화하도록 돕는 조언을 제공해. "
        "답변은 최대 500자. 필요 시 제공되는 search_result를 바탕으로 기관을 추천해."
    ))
    out = llm_counselor.invoke([sys] + state["messages"])
    return {**state, "messages": state["messages"] + [out]}

def summary_node(state: State) -> State:
    sys = SystemMessage(content=(
        "너는 평가자야. 대화를 아래 서식으로 간결히 요약해. 부연설명 금지.\n"
        "주요 증상: ...\n\n위험 요인: ...\n\n개선 요인: ...\n\n상담사의 개입 요인: ..."
    ))
    out = llm_evaluator.invoke([sys] + state["messages"])
    summary_text = (out.content or "").strip()
    return {"summary": summary_text, "need_summary": False}

search_prompt = ChatPromptTemplate.from_messages([
    ("system",
     "너는 정신건강 상담기관 검색 보조 에이전트야. TavilySearch 도구로 기관 정보를 찾아. "
     "JSON 배열만 출력하고 추가 설명은 금지. 각 항목은 기관명/주소/연락처/source_url/source_title 포함."),
    ("human", "도움이 필요해요. 정신건강 관련 전문 상담기관을 알려주세요.")
])
llm_research_node = search_prompt | llm_research

def _normalize_search_result(obj):
    """LLM/도구 응답을 직렬화 가능한 리스트[dict]로 정규화."""
    if obj is None:
        return []

    content = getattr(obj, "content", None)
    if isinstance(content, str):
        try:
            data = json.loads(content)
        except Exception:
            return [] 
        if isinstance(data, list):
            out = []
            for item in data:
                if isinstance(item, dict):
                    out.append({k: (v if isinstance(v, (str, int, float, bool)) else str(v))
                                for k, v in item.items()})
            return out

    if isinstance(obj, list):
        out = []
        for item in obj:
            if isinstance(item, dict):
                out.append({k: (v if isinstance(v, (str, int, float, bool)) else str(v))
                            for k, v in item.items()})
        return out

    if isinstance(obj, dict):
        return [{k: (v if isinstance(v, (str, int, float, bool)) else str(v))
                 for k, v in obj.items()}]

    if isinstance(obj, str):
        try:
            data = json.loads(obj)
        except Exception:
            return [] 
        if isinstance(data, list):
            out = []
            for item in data:
                if isinstance(item, dict):
                    out.append({k: (v if isinstance(v, (str, int, float, bool)) else str(v))
                                for k, v in item.items()})
            return out

    return []  


def search_node(state: State) -> State:
    try:
        raw = llm_research_node.invoke({})
        result = _normalize_search_result(raw)
    except Exception:
        result = []  
    return {**state, "search_result": result}


# -----------------------------------------------------------------------------
# 그래프 컴파일
# -----------------------------------------------------------------------------
memory = MemorySaver()
GB = StateGraph(State)
GB.add_node("counselor", counselor_node)
GB.add_node("evaluator", evaluator_node)
GB.add_node("summarize", summary_node)
GB.add_node("tools", search_node)

GB.add_edge(START, "counselor")
GB.add_edge("counselor", "evaluator")
GB.add_conditional_edges("evaluator", route_after_evaluator, {
    "to_search": "tools",
    "to_finish": "summarize",
    "to_counselor": END
})
GB.add_edge("tools", "counselor")
GB.add_edge("summarize", END)

graph = GB.compile(checkpointer=memory)

# -----------------------------------------------------------------------------
# Flask
# -----------------------------------------------------------------------------
app = Flask(__name__)
CORS(app)

# 세션 통계 저장소
# {
#   thread_id: {
#     "crisis_cnt": int,
#     "last_summary": str,
#     "updated": datetime,
#     "hist": [{"ts": dt, "anxiety": 0~100, "depression": 0~100, "stress": 0~100}, ...]
#   }
# }
session_stats: Dict[str, Dict[str, Any]] = {}

def _invoke_hermes(user_text: str, thread_id: str) -> Dict[str, Any]:
    input_state = State(messages=[("user", user_text)], thread_id=thread_id,
                        crisis=False, end_session=False, need_summary=False)
    config = RunnableConfig(recursion_limit=20, configurable={"thread_id": thread_id})
    final = graph.invoke(input=input_state, config=config)

    # 마지막 모델 응답 텍스트
    try:
        reply_text = final["messages"][-1].content
    except Exception:
        reply_text = "죄송합니다. 일시적 오류가 발생했어요."

    # 대시보드 집계
    st = session_stats.setdefault(thread_id, {
        "crisis_cnt": 0, "last_summary": "", "updated": None, "hist": []
    })
    if final.get("crisis"):
        st["crisis_cnt"] += 1
    if final.get("summary"):
        st["last_summary"] = str(final["summary"])

    # 0~100 값 기록
    anx = float(final.get("anxiety", 0.0) or 0.0)
    dep = float(final.get("depression", 0.0) or 0.0)
    strr = float(final.get("stress", 0.0) or 0.0)
    st["hist"].append({
        "ts": datetime.now(timezone.utc),
        "anxiety": max(0.0, min(100.0, anx)),
        "depression": max(0.0, min(100.0, dep)),
        "stress": max(0.0, min(100.0, strr)),
    })
    st["updated"] = datetime.now(timezone.utc)

    # 검색 결과 정규화(직렬화 안전화)
    safe_search = _normalize_search_result(final.get("search_result"))

    return {
        "reply": reply_text,
        "meta": {
            "crisis": bool(final.get("crisis", False)),
            "end_session": bool(final.get("end_session", False)),
            "need_summary": bool(final.get("need_summary", False)),
        },
        "search_result": safe_search,
    }

@app.post("/api/chat")
def api_chat():
    data = request.get_json(silent=True) or {}
    message = (data.get("message") or "").strip()
    thread_id = (data.get("thread_id") or str(uuid.uuid4())).strip()

    if not message:
        return jsonify({"error": "message is required"}), 400

    result = _invoke_hermes(message, thread_id)
    result["thread_id"] = thread_id
    return jsonify(result)

@app.get("/api/dashboard")
def api_dashboard():
    """
    최근 7일 평균/주간 트렌드(모두 0~100 스케일) + HERMES 지표.
    """
    now = datetime.now(timezone.utc)
    seven_days_ago = now - timedelta(days=7)

    # 모든 세션 히스토리 합산
    all_hist: List[Dict[str, Any]] = []
    for st in session_stats.values():
        for h in st.get("hist", []):
            ts = h.get("ts")
            if ts and ts >= seven_days_ago:
                all_hist.append(h)

    def avg(key: str) -> float:
        items = [h[key] for h in all_hist]
        return (sum(items) / len(items)) if items else 0.0

    avg_anx = avg("anxiety")      # 0~100
    avg_dep = avg("depression")   # 0~100
    avg_str = avg("stress")       # 0~100
    wellbeing = max(0.0, min(100.0, 100.0 - (avg_anx + avg_dep + avg_str) / 3.0))

    # 주간 트렌드(오래된 날 → 오늘, 요일 한글)
    days_kr = ["월", "화", "수", "목", "금", "토", "일"]
    weekly = []
    for offset in range(6, -1, -1):
        day_dt = (now - timedelta(days=offset)).date()
        day_hist = [h for h in all_hist if h["ts"].date() == day_dt]
        if day_hist:
            d_anx = sum(h["anxiety"] for h in day_hist) / len(day_hist)
            d_dep = sum(h["depression"] for h in day_hist) / len(day_hist)
        else:
            d_anx = d_dep = 0.0
        weekly.append({
            "day": days_kr[day_dt.weekday()],
            "anxiety": d_anx,
            "depression": d_dep
        })

    # HERMES 지표
    crisis_count = sum(
        1 for st in session_stats.values()
        if st.get("updated") and st["updated"] >= seven_days_ago and st.get("crisis_cnt", 0) > 0
    )
    active_sessions = sum(
        1 for st in session_stats.values()
        if st.get("updated") and st["updated"] >= seven_days_ago
    )
    last_summary = ""
    if session_stats:
        last = max(session_stats.values(),
                   key=lambda v: v.get("updated") or datetime.fromtimestamp(0, tz=timezone.utc))
        last_summary = last.get("last_summary", "")

    return jsonify({
        "averages": {
            "anxiety": avg_anx,        # 0~100
            "depression": avg_dep,     # 0~100
            "stress": avg_str,         # 0~100
            "wellbeing": wellbeing     # 0~100
        },
        "weekly": weekly,              # 각 값 0~100
        "hermes": {
            "crisis_count_7d": crisis_count,
            "active_sessions_7d": active_sessions,
            "last_summary": last_summary
        }
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")), debug=True)
