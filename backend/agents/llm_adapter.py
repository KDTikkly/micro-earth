"""
LLM Adapter - Micro-Earth v9.0
支持多种免费 LLM 后端，用于给 Agent 节点增加自然语言推理能力

免费方案优先级：
  1. Ollama   - 本地运行，完全免费，离线可用
                模型推荐: llama3.2:3b / qwen2.5:3b（低显存）
  2. Groq     - 云端免费额度（每天约 14,400 token），需要免费注册 API Key
                模型推荐: llama3-8b-8192 / gemma2-9b-it
  3. OpenAI   - 付费，作为兜底
  4. STUB     - 无 LLM 时降级为规则引擎（保持现有行为不变）

使用方法：
  # 在 .env 里配置（任选一种）：
  LLM_BACKEND=ollama          # 本地 Ollama
  LLM_BACKEND=groq            # Groq 免费云端
  LLM_BACKEND=openai          # OpenAI（需付费）
  LLM_BACKEND=stub            # 纯规则模式（默认，无需配置）

  OLLAMA_BASE_URL=http://localhost:11434   # Ollama 默认地址
  OLLAMA_MODEL=llama3.2:3b                 # 推荐：3B 参数，4GB 显存
  GROQ_API_KEY=gsk_xxxxxxxxxxxx            # 免费注册 https://console.groq.com
  GROQ_MODEL=llama3-8b-8192
  OPENAI_API_KEY=sk-xxxxxxxxxxxx
  OPENAI_MODEL=gpt-4o-mini
"""
import os
import os as _os; _os.environ.setdefault("PYTHONIOENCODING", "utf-8"); _os.environ.setdefault("PYTHONUTF8", "1")
import json
from typing import Optional

# -- 读取环境变量（支持 .env 文件） --------------------------------------
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), "../../.env"), override=False)
    load_dotenv(os.path.join(os.path.dirname(__file__), "../.env"), override=False)
    load_dotenv(os.path.join(os.path.dirname(__file__), ".env"), override=False)
except ImportError:
    pass

LLM_BACKEND   = os.getenv("LLM_BACKEND", "stub").lower()          # stub / ollama / groq / openai
OLLAMA_URL    = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL  = os.getenv("OLLAMA_MODEL", "llama3.2:3b")
GROQ_API_KEY  = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL    = os.getenv("GROQ_MODEL", "llama3-8b-8192")
OPENAI_KEY    = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL  = os.getenv("OPENAI_MODEL", "gpt-4o-mini")


# -- Ollama 本地调用（完全免费） ------------------------------------------
async def _call_ollama(prompt: str, system: str = "") -> str:
    import httpx
    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            *([ {"role": "system", "content": system} ] if system else []),
            {"role": "user", "content": prompt},
        ],
        "stream": False,
        "options": {"temperature": 0.3, "num_predict": 512},
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(f"{OLLAMA_URL}/api/chat", json=payload)
        resp.raise_for_status()
        data = resp.json()
        return data["message"]["content"].strip()


# -- Groq 云端免费调用 ---------------------------------------------------
async def _call_groq(prompt: str, system: str = "") -> str:
    import httpx
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": GROQ_MODEL,
        "messages": [
            *([ {"role": "system", "content": system} ] if system else []),
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.3,
        "max_tokens": 512,
    }
    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers=headers, json=payload,
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"].strip()


# -- OpenAI 调用（付费，兜底） --------------------------------------------
async def _call_openai(prompt: str, system: str = "") -> str:
    import httpx
    headers = {
        "Authorization": f"Bearer {OPENAI_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": OPENAI_MODEL,
        "messages": [
            *([ {"role": "system", "content": system} ] if system else []),
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.3,
        "max_tokens": 512,
    }
    async with httpx.AsyncClient(timeout=20.0) as client:
        resp = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers=headers, json=payload,
        )
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"].strip()


# -- 统一调用入口 ---------------------------------------------------------
async def llm_chat(
    prompt: str,
    system: str = "",
    fallback: Optional[str] = None,
) -> str:
    """
    统一 LLM 调用接口。
    根据 LLM_BACKEND 环境变量自动选择后端。
    stub 模式直接返回 fallback（保持规则引擎行为）。
    """
    if LLM_BACKEND == "stub" or not LLM_BACKEND:
        return fallback or ""

    try:
        if LLM_BACKEND == "ollama":
            return await _call_ollama(prompt, system)
        elif LLM_BACKEND == "groq":
            if not GROQ_API_KEY:
                raise ValueError("GROQ_API_KEY 未设置，请在 .env 中填入")
            return await _call_groq(prompt, system)
        elif LLM_BACKEND == "openai":
            if not OPENAI_KEY:
                raise ValueError("OPENAI_API_KEY 未设置")
            return await _call_openai(prompt, system)
        else:
            return fallback or ""
    except Exception as e:
        print(f"[LLM] [WARN] {LLM_BACKEND} 调用失败: {e}，降级为规则模式", flush=True)
        return fallback or ""


# -- Agent 专用：气象事件自然语言分析 -------------------------------------
_WEATHER_SYSTEM = """你是 Micro-Earth 气象分析 AI 助手 Lyria。
根据提供的气象数据，生成简短（3句内）的中文气象预警摘要。
风格：专业但易懂，如有极端天气需特别标注。
仅输出摘要文本，不要 Markdown 格式。"""

async def analyze_weather(weather_summary: dict) -> str:
    """给 DataRetriever 节点增加 LLM 气象分析摘要"""
    prompt = (
        f"城市: {weather_summary.get('region', '未知')}\n"
        f"当前温度: {weather_summary.get('temperature', '--')} degC\n"
        f"降水概率: {weather_summary.get('precipitation', '--')}%\n"
        f"风速: {weather_summary.get('wind_speed', '--')} m/s\n"
        f"风险等级: {weather_summary.get('risk_level', '未知')}\n"
        "请生成气象预警摘要："
    )
    fallback = (
        f"当前{weather_summary.get('region','')}气温"
        f"{weather_summary.get('temperature','--')} degC，"
        f"风险等级 {weather_summary.get('risk_level','未知')}。"
    )
    return await llm_chat(prompt, system=_WEATHER_SYSTEM, fallback=fallback)


# -- Agent 专用：城市查询意图解析 -----------------------------------------
_GEO_SYSTEM = """你是地理信息助手。从用户输入中提取城市名（英文或中文）。
仅返回纯城市名，不含任何其他文字。例如：输入"帮我看看上海的天气" -> 输出"上海"。"""

async def parse_city_intent(user_input: str) -> str:
    """将自然语言查询解析为城市名"""
    return await llm_chat(
        prompt=user_input,
        system=_GEO_SYSTEM,
        fallback=user_input,  # stub 模式直接透传，现有逻辑不变
    )


def get_backend_info() -> dict:
    """返回当前 LLM 后端配置信息（供 /health 接口展示）"""
    if LLM_BACKEND == "stub":
        return {"backend": "stub", "model": "rule-based", "free": True}
    elif LLM_BACKEND == "ollama":
        return {"backend": "ollama", "model": OLLAMA_MODEL, "free": True, "url": OLLAMA_URL}
    elif LLM_BACKEND == "groq":
        return {"backend": "groq", "model": GROQ_MODEL, "free": True, "has_key": bool(GROQ_API_KEY)}
    elif LLM_BACKEND == "openai":
        return {"backend": "openai", "model": OPENAI_MODEL, "free": False}
    return {"backend": "unknown"}


