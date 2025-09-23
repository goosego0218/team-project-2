import { Navigation } from "@/components/ui/navigation";
import { HeroSection } from "@/components/ui/hero-section";
import { ChatInterface } from "@/components/ui/chat-interface";
import { DashboardSection } from "@/components/ui/dashboard-section";
import { Footer } from "@/components/ui/footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background font-inter">
      <Navigation />
      <main>
        <HeroSection />
        <div id="chat">
          <ChatInterface />
        </div>
        <div id="dashboard">
          <DashboardSection />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
