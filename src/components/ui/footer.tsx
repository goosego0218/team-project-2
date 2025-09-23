import { Heart, Mail, Phone, MapPin, Facebook, Twitter, Instagram } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-foreground text-background py-16">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary-gradient rounded-lg flex items-center justify-center">
                <Heart className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-xl">MindCare</span>
            </div>
            <p className="text-background/80 mb-6 max-w-md">
              AI 기반 감정 분석과 전문적인 상담을 통해 
              건강한 마음을 되찾을 수 있도록 도와드립니다.
            </p>
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-background/10 rounded-full flex items-center justify-center hover:bg-background/20 transition-colors cursor-pointer">
                <Facebook className="h-4 w-4" />
              </div>
              <div className="w-8 h-8 bg-background/10 rounded-full flex items-center justify-center hover:bg-background/20 transition-colors cursor-pointer">
                <Twitter className="h-4 w-4" />
              </div>
              <div className="w-8 h-8 bg-background/10 rounded-full flex items-center justify-center hover:bg-background/20 transition-colors cursor-pointer">
                <Instagram className="h-4 w-4" />
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4">서비스</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-background/80 hover:text-background transition-colors">AI 감정 분석</a></li>
              <li><a href="#" className="text-background/80 hover:text-background transition-colors">온라인 상담</a></li>
              <li><a href="#" className="text-background/80 hover:text-background transition-colors">전문가 연결</a></li>
              <li><a href="#" className="text-background/80 hover:text-background transition-colors">그룹 상담</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold mb-4">연락처</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-background/80">
                <Phone className="h-4 w-4" />
                <span className="text-sm">1588-1234</span>
              </div>
              <div className="flex items-center gap-2 text-background/80">
                <Mail className="h-4 w-4" />
                <span className="text-sm">help@mindcare.kr</span>
              </div>
              <div className="flex items-center gap-2 text-background/80">
                <MapPin className="h-4 w-4" />
                <span className="text-sm">서울시 강남구</span>
              </div>
            </div>
          </div>
        </div>

        {/* Emergency Notice */}
        <div className="border-t border-background/20 pt-8 mb-8">
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
            <h4 className="font-semibold text-destructive mb-2">긴급 상황 시</h4>
            <p className="text-sm text-background/90">
              자해나 자살 충동이 있으시면 즉시 <strong>109 (생명의전화)</strong> 또는 
              <strong> 1393 (청소년전화)</strong>로 연락하시거나 가까운 응급실을 방문해 주세요.
            </p>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-background/20 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-background/60 text-sm">
            © 2024 MindCare. All rights reserved.
          </p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <a href="#" className="text-background/60 hover:text-background text-sm transition-colors">
              개인정보처리방침
            </a>
            <a href="#" className="text-background/60 hover:text-background text-sm transition-colors">
              이용약관
            </a>
            <a href="#" className="text-background/60 hover:text-background text-sm transition-colors">
              의료진 정보
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}