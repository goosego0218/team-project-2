import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heart, MessageCircle, Shield, Users } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-healing-gradient opacity-90" />
      
      {/* Floating elements for visual depth */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-primary-soft rounded-full blur-xl opacity-30 animate-breathe" />
        <div className="absolute top-40 right-20 w-24 h-24 bg-secondary rounded-full blur-lg opacity-40 animate-breathe" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-32 left-1/4 w-20 h-20 bg-hopeful rounded-full blur-md opacity-50 animate-breathe" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 container mx-auto px-6 text-center">
        <div className="max-w-4xl mx-auto animate-slide-up">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight tracking-tight">
            당신의 마음을 위한
            <span className="block bg-gradient-to-r from-white via-white to-secondary-accent bg-clip-text text-transparent font-extrabold">
              안전한 상담 공간
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-white mb-8 font-medium opacity-95 leading-relaxed">
            AI 기반 감정 분석으로 우울과 불안을 조기에 감지하고, 
            전문적인 상담을 통해 건강한 마음을 되찾아보세요.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Button 
              size="lg" 
              className="bg-white text-primary hover:bg-white/95 font-bold px-8 py-4 text-lg shadow-therapeutic transition-all duration-300 hover:shadow-floating hover:scale-105"
            >
              <MessageCircle className="mr-2 h-5 w-5" />
              상담 시작하기
            </Button>
            <Button 
              size="lg"
              className="bg-white/90 text-primary hover:bg-white font-bold px-8 py-4 text-lg shadow-therapeutic transition-all duration-300 hover:shadow-floating hover:scale-105"
            >
              서비스 둘러보기
            </Button>
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <Card className="bg-white/15 backdrop-blur-md border-white/25 text-white animate-gentle-fade hover:bg-white/20 transition-all duration-300">
              <div className="p-6 text-center">
                <Shield className="h-8 w-8 mx-auto mb-3 text-white" />
                <h3 className="font-bold mb-2 text-lg">안전한 환경</h3>
                <p className="text-sm text-white/90 font-medium">완전한 익명성과 개인정보 보호</p>
              </div>
            </Card>
            
            <Card className="bg-white/15 backdrop-blur-md border-white/25 text-white animate-gentle-fade hover:bg-white/20 transition-all duration-300" style={{ animationDelay: '0.1s' }}>
              <div className="p-6 text-center">
                <Heart className="h-8 w-8 mx-auto mb-3 text-white" />
                <h3 className="font-bold mb-2 text-lg">감정 분석</h3>
                <p className="text-sm text-white/90 font-medium">AI 기반 실시간 감정 상태 분석</p>
              </div>
            </Card>
            
            <Card className="bg-white/15 backdrop-blur-md border-white/25 text-white animate-gentle-fade hover:bg-white/20 transition-all duration-300" style={{ animationDelay: '0.2s' }}>
              <div className="p-6 text-center">
                <Users className="h-8 w-8 mx-auto mb-3 text-white" />
                <h3 className="font-bold mb-2 text-lg">전문가 연결</h3>
                <p className="text-sm text-white/90 font-medium">필요시 전문 상담사와 연결</p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}