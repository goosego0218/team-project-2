// src/components/ui/chat-interface.tsx
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User } from "lucide-react";

interface Message {
  id: string;
  text: string;
  sender: "user" | "ai";
  timestamp: Date;
  meta?: { crisis: boolean; end_session: boolean; need_summary: boolean };
  searchResult?: any; // 검색 결과 JSON 배열
}

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:5000";

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "안녕하세요! 저는 당신의 마음 건강을 돌보는 AI 상담사입니다. 오늘 기분은 어떠신가요?",
      sender: "ai",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [threadId, setThreadId] = useState<string | undefined>();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    try {
      const body: any = { message: userMessage.text };
      if (threadId) body.thread_id = threadId;

      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // HERMES 백엔드 응답
      const data = await res.json();
      if (data.thread_id) setThreadId(data.thread_id);

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: data.reply ?? "응답 생성에 문제가 발생했습니다.",
        sender: "ai",
        timestamp: new Date(),
        meta: data.meta,
        searchResult: data.search_result,
      };

      setMessages((prev) => [...prev, aiResponse]);

      // ✅ 여기서 대시보드 새로고침 (백엔드 통계가 갱신된 후)
      window.dispatchEvent(new CustomEvent("dashboard:refresh"));
    } catch (err) {
      console.error(err);
      const failMsg: Message = {
        id: (Date.now() + 2).toString(),
        text: "죄송합니다. 서버와 통신 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.",
        sender: "ai",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, failMsg]);
      // 실패 시에는 대시보드 갱신 불필요
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">AI 상담 서비스</h2>
            <p className="text-muted-foreground">안전한 환경에서 마음 편히 대화해보세요</p>
          </div>

          <Card className="therapy-card bg-white shadow-floating">
            {/* Chat header */}
            <div className="p-6 border-b bg-primary-gradient text-white rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Bot className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold">AI 상담사</h3>
                  <p className="text-sm text-white/80">감정 분석 전문</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm">온라인</span>
                </div>
              </div>
            </div>

            {/* Chat messages */}
            <ScrollArea className="h-96 p-6">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 animate-gentle-fade ${
                      message.sender === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {message.sender === "ai" && (
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                    )}

                    <div
                      className={`chat-bubble ${
                        message.sender === "user" ? "chat-bubble-user" : "chat-bubble-ai"
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{message.text}</p>
                      <div className="text-xs opacity-70 mt-2">
                        {message.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>

                      {/* HERMES search result display */}
                      {message.searchResult && Array.isArray(message.searchResult) && (
                        <div className="mt-3 p-2 bg-background/50 rounded-lg text-xs space-y-2">
                          {message.searchResult.map((item: any, idx: number) => (
                            <div key={idx} className="border p-2 rounded">
                              <div>기관명: {item.기관명}</div>
                              <div>주소: {item.주소}</div>
                              {item.연락처 && <div>연락처: {item.연락처}</div>}
                              {item.source_url && (
                                <a
                                  href={item.source_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-500 underline"
                                >
                                  상세보기
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {message.sender === "user" && (
                      <div className="w-8 h-8 bg-secondary-accent rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                ))}

                {/* Typing indicator */}
                {isTyping && (
                  <div className="flex gap-3 animate-gentle-fade">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div className="chat-bubble chat-bubble-ai">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: "0.2s" }}></div>
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: "0.4s" }}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div ref={messagesEndRef} />
            </ScrollArea>

            {/* Chat input */}
            <div className="p-6 border-t">
              <div className="flex gap-3">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="마음 편히 이야기해 주세요..."
                  className="flex-1 border-border/50 focus:border-primary transition-colors"
                  disabled={isTyping}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isTyping}
                  className="bg-primary hover:bg-primary/90 shadow-sm"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                이 대화는 완전히 비공개이며 안전하게 보호됩니다
              </p>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
