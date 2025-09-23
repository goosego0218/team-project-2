import { useEffect, useState, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Loader2, Activity, AlertTriangle, ClipboardList, RefreshCcw } from "lucide-react";

type HermesStats = {
  crisis_count_7d: number;
  active_sessions_7d: number;
  last_summary?: string;
};

type DashboardApi = {
  hermes?: HermesStats;
};

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:5000";

export function DashboardSection() {
  const [hermes, setHermes] = useState<HermesStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  // 중복 fetch 방지
  const inFlight = useRef<AbortController | null>(null);

  const loadDashboard = useCallback(async (why: string = "manual") => {
    // 기존 요청 있으면 취소
    inFlight.current?.abort();
    const ac = new AbortController();
    inFlight.current = ac;

    setLoading(true);
    setErr(null);

    try {
      console.debug("[Dashboard] fetch start:", why);
      const res = await fetch(`${API_BASE}/api/dashboard?t=${Date.now()}`, {
        cache: "no-store",
        headers: { accept: "application/json" },
        signal: ac.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: DashboardApi = await res.json();
      setHermes(data.hermes ?? { crisis_count_7d: 0, active_sessions_7d: 0 });
      setLastUpdated(Date.now());
      console.debug("[Dashboard] fetch ok:", data);
    } catch (e: any) {
      if (e?.name === "AbortError") {
        console.debug("[Dashboard] aborted");
        return;
      }
      console.error("[Dashboard] fetch error:", e);
      setErr(e?.message ?? "Failed to load dashboard");
    } finally {
      setLoading(false);
      inFlight.current = null;
    }
  }, []);

  // 최초 로드
  useEffect(() => {
    loadDashboard("mount");
  }, [loadDashboard]);

  // 채팅 응답 후 이벤트로 즉시 재요청
  useEffect(() => {
    const onRefresh = () => {
      console.debug("[Dashboard] event: dashboard:refresh");
      // 약간의 지연을 줘서 백엔드 집계가 반영되도록
      setTimeout(() => loadDashboard("event"), 50);
    };
    window.addEventListener("dashboard:refresh", onRefresh);
    document.addEventListener("dashboard:refresh", onRefresh);
    return () => {
      window.removeEventListener("dashboard:refresh", onRefresh);
      document.removeEventListener("dashboard:refresh", onRefresh);
    };
  }, [loadDashboard]);

  // 안전망: 이벤트가 혹시 안 오더라도 15초마다 동기화
  useEffect(() => {
    const id = setInterval(() => loadDashboard("interval"), 15000);
    return () => clearInterval(id);
  }, [loadDashboard]);

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl font-bold mb-1">감정 상태 대시보드</h2>
              <p className="text-muted-foreground">
                HERMES 분석 지표를 기반으로 최근 추세를 확인해보세요
              </p>
            </div>
            <button
              onClick={() => loadDashboard("button")}
              className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-md border hover:bg-muted"
              title="새로고침"
            >
              <RefreshCcw className="h-4 w-4" />
              새로고침
            </button>
          </div>

          {/* 로딩/에러 */}
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              데이터를 불러오는 중…
            </div>
          ) : err ? (
            <Card className="therapy-card p-6">
              <div className="text-red-500 text-sm">대시보드를 불러오지 못했습니다: {err}</div>
            </Card>
          ) : (
            <>
              {/* HERMES 핵심 지표 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <Card className="therapy-card">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                        <AlertTriangle className="h-6 w-6 text-orange-500" />
                      </div>
                    </div>
                    <h3 className="font-semibold text-lg mb-2">최근 7일 위기 발생</h3>
                    <div className="text-2xl font-bold">{hermes?.crisis_count_7d ?? 0}회</div>
                    <p className="text-xs text-muted-foreground mt-2">crisis 감지 세션 수</p>
                  </div>
                </Card>

                <Card className="therapy-card">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                        <Activity className="h-6 w-6 text-blue-500" />
                      </div>
                    </div>
                    <h3 className="font-semibold text-lg mb-2">활성 세션</h3>
                    <div className="text-2xl font-bold">{hermes?.active_sessions_7d ?? 0}개</div>
                    <p className="text-xs text-muted-foreground mt-2">최근 7일 내 상호작용 세션</p>
                  </div>
                </Card>

                <Card className="therapy-card">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                        <ClipboardList className="h-6 w-6 text-emerald-500" />
                      </div>
                    </div>
                    <h3 className="font-semibold text-lg mb-2">최근 요약</h3>
                    {hermes?.last_summary ? (
                      <pre className="text-xs whitespace-pre-wrap leading-5 max-h-40 overflow-auto border rounded-md p-3 bg-muted/30">
                        {hermes.last_summary}
                      </pre>
                    ) : (
                      <p className="text-sm text-muted-foreground">요약이 아직 없습니다.</p>
                    )}
                  </div>
                </Card>
              </div>

              <div className="text-right text-xs text-muted-foreground">
                {lastUpdated ? `업데이트: ${new Date(lastUpdated).toLocaleTimeString()}` : null}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
