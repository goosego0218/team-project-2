import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingDown, TrendingUp, Activity, Calendar, Brain, Smile } from "lucide-react";

type DashboardResp = {
  // 백엔드 권장 스펙:
  // { averages: { anxiety:0~1, depression:0~1, stress:0~1, wellbeing:0~1 },
  //   weekly: [{ day:string, anxiety:number(0~1), depression:number(0~1) }, ...] }
  averages?: {
    anxiety?: number;
    depression?: number;
    stress?: number;
    wellbeing?: number;
  };
  weekly?: { day: string; anxiety?: number; depression?: number }[];
};

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:5000";

function pct(x?: number): number {
  if (typeof x !== "number" || Number.isNaN(x)) return 0;
  // 백엔드가 0~1 스케일이면 %로 변환, 이미 %면 100 초과 방지
  return Math.max(0, Math.min(100, x <= 1 ? x * 100 : x));
}

export function DashboardSection() {
  const [data, setData] = useState<DashboardResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const res = await fetch(`${API_BASE}/api/dashboard`, { method: "GET" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: DashboardResp = await res.json();
        if (alive) setData(json);
      } catch (e: any) {
        if (alive) setErr(e?.message ?? "데이터 로드 실패");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // 안전한 파싱 및 기본값
  const emotionData = useMemo(() => {
    const a = data?.averages;
    return {
      anxiety: pct(a?.anxiety),
      depression: pct(a?.depression),
      stress: pct(a?.stress),
      wellbeing: pct(a?.wellbeing),
    };
  }, [data]);

  const weeklyTrend = useMemo(() => {
    const w = data?.weekly ?? [];
    // day가 비어오면 월~일 순으로 대체
    const defaultDays = ["월", "화", "수", "목", "금", "토", "일"];
    return (w.length ? w : defaultDays.map(d => ({ day: d }))).map((d, i) => ({
      day: d.day || defaultDays[i % defaultDays.length],
      anxiety: pct(d.anxiety),
      depression: pct(d.depression),
    }));
  }, [data]);

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">감정 상태 대시보드</h2>
            <p className="text-muted-foreground">
              AI가 분석한 당신의 감정 상태와 개선 추세를 확인해보세요
            </p>
          </div>

          {/* 상태 표시 */}
          {loading && (
            <Card className="therapy-card mb-8">
              <div className="p-6 text-sm text-muted-foreground">데이터를 불러오는 중입니다…</div>
            </Card>
          )}
          {err && (
            <Card className="therapy-card mb-8">
              <div className="p-6 text-sm text-red-600">대시보드 로드 오류: {err}</div>
            </Card>
          )}

          {/* Main metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <Card className="therapy-card">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-anxious/10 rounded-xl flex items-center justify-center">
                    <Brain className="h-6 w-6 text-anxious" />
                  </div>
                  <TrendingDown className="h-4 w-4 text-green-500" />
                </div>
                <h3 className="font-semibold text-lg mb-2">불안 지수</h3>
                <div className="flex items-end gap-2 mb-3">
                  <span className="text-2xl font-bold">{Math.round(emotionData.anxiety)}%</span>
                  <span className="text-sm text-green-500 font-medium">-5%</span>
                </div>
                <Progress value={emotionData.anxiety} className="h-2" />
                <p className="text-xs text-muted-foreground mt-2">지난주 대비 개선</p>
              </div>
            </Card>

            <Card className="therapy-card">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-sad/10 rounded-xl flex items-center justify-center">
                    <Activity className="h-6 w-6 text-sad" />
                  </div>
                  <TrendingDown className="h-4 w-4 text-green-500" />
                </div>
                <h3 className="font-semibold text-lg mb-2">우울 지수</h3>
                <div className="flex items-end gap-2 mb-3">
                  <span className="text-2xl font-bold">{Math.round(emotionData.depression)}%</span>
                  <span className="text-sm text-green-500 font-medium">-8%</span>
                </div>
                <Progress value={emotionData.depression} className="h-2" />
                <p className="text-xs text-muted-foreground mt-2">지난주 대비 개선</p>
              </div>
            </Card>

            <Card className="therapy-card">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-orange-500" />
                  </div>
                  <TrendingUp className="h-4 w-4 text-orange-500" />
                </div>
                <h3 className="font-semibold text-lg mb-2">스트레스</h3>
                <div className="flex items-end gap-2 mb-3">
                  <span className="text-2xl font-bold">{Math.round(emotionData.stress)}%</span>
                  <span className="text-sm text-orange-500 font-medium">+3%</span>
                </div>
                <Progress value={emotionData.stress} className="h-2" />
                <p className="text-xs text-muted-foreground mt-2">업무 스트레스 증가</p>
              </div>
            </Card>

            <Card className="therapy-card">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-hopeful/10 rounded-xl flex items-center justify-center">
                    <Smile className="h-6 w-6 text-hopeful" />
                  </div>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
                <h3 className="font-semibold text-lg mb-2">웰빙 지수</h3>
                <div className="flex items-end gap-2 mb-3">
                  <span className="text-2xl font-bold">{Math.round(emotionData.wellbeing)}%</span>
                  <span className="text-sm text-green-500 font-medium">+12%</span>
                </div>
                <Progress value={emotionData.wellbeing} className="h-2" />
                <p className="text-xs text-muted-foreground mt-2">전반적 개선</p>
              </div>
            </Card>
          </div>

          {/* Weekly trend chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="therapy-card">
              <div className="p-6">
                <h3 className="font-semibold text-lg mb-6">주간 감정 변화</h3>
                <div className="space-y-4">
                  {weeklyTrend.map((day, index) => (
                    <div key={`${day.day}-${index}`} className="animate-gentle-fade" style={{ animationDelay: `${index * 0.1}s` }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{day.day}요일</span>
                        <div className="flex gap-4 text-xs">
                          <span className="text-anxious">불안 {Math.round(day.anxiety)}%</span>
                          <span className="text-sad">우울 {Math.round(day.depression)}%</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Progress value={day.anxiety} className="h-2" />
                        </div>
                        <div className="flex-1">
                          <Progress value={day.depression} className="h-2" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Card className="therapy-card">
              <div className="p-6">
                <h3 className="font-semibold text-lg mb-6">AI 분석 인사이트</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-calm/10 rounded-xl animate-gentle-fade">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-calm rounded-full flex items-center justify-center mt-1">
                        <Brain className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <h4 className="font-medium text-sm mb-1">긍정적 변화 감지</h4>
                        <p className="text-xs text-muted-foreground">
                          최근 7일간 전반적인 감정 상태가 개선되고 있습니다. 규칙적인 상담이 도움이 되고 있어요.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-hopeful/10 rounded-xl animate-gentle-fade" style={{ animationDelay: "0.1s" }}>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-hopeful rounded-full flex items-center justify-center mt-1">
                        <Activity className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <h4 className="font-medium text-sm mb-1">스트레스 관리 권장</h4>
                        <p className="text-xs text-muted-foreground">
                          업무 관련 스트레스가 증가했습니다. 휴식과 마음챙김 연습을 추천드려요.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-secondary/50 rounded-xl animate-gentle-fade" style={{ animationDelay: "0.2s" }}>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-secondary-accent rounded-full flex items-center justify-center mt-1">
                        <Smile className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <h4 className="font-medium text-sm mb-1">지속적 관리</h4>
                        <p className="text-xs text-muted-foreground">
                          현재 추세를 유지하면 더 큰 개선을 기대할 수 있습니다. 꾸준한 상담을 계속해보세요.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
