import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, Music } from "lucide-react";

const NotFound = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white relative overflow-hidden font-['Outfit']">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-yellow-900/20 via-slate-950 to-slate-950 pointer-events-none" />
      <div className="absolute top-0 w-full h-px bg-gradient-to-r from-transparent via-yellow-500/20 to-transparent" />
      <div className="absolute bottom-0 w-full h-px bg-gradient-to-r from-transparent via-yellow-500/20 to-transparent" />

      <div className="relative z-10 text-center space-y-8 p-4 max-w-lg mx-auto">

        {/* Animated Icon */}
        <div className="relative inline-block mb-4">
          <div className="absolute inset-0 bg-yellow-500/20 blur-xl rounded-full animate-pulse" />
          <div className="relative bg-slate-900/50 p-6 rounded-full border border-yellow-500/20 backdrop-blur-xl">
            <Music className="h-16 w-16 text-yellow-500 animate-bounce" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-8xl md:text-9xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/10 select-none">
            404
          </h1>
          <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Lost the <span className="text-yellow-500">Rhythm?</span>
          </h2>
          <p className="text-white/40 max-w-md mx-auto leading-relaxed">
            The page you're looking for seems to have missed its cue.
            Let's get you back to the main stage.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-8">
          <Button
            asChild
            variant="default"
            className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-8 h-12 rounded-xl transition-all hover:scale-105 active:scale-95"
          >
            <Link to="/dashboard" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              back to Dashboard
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="bg-transparent border-white/10 hover:bg-white/5 text-white h-12 rounded-xl px-8"
          >
            <Link to="/" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </Link>
          </Button>
        </div>
      </div>

      {/* Footer Text */}
      <div className="absolute bottom-8 left-0 right-0 text-center space-y-2">
        <div className="text-white/20 text-xs uppercase tracking-[0.2em]">
          AAROH 2026 • Decarto
        </div>
        <div className="text-white/10 text-[10px] uppercase tracking-[0.3em] font-mono">
          Developed by Elevates
        </div>
      </div>
    </div>
  );
};

export default NotFound;
