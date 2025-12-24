
import { Sparkles } from 'lucide-react';

export default function OgImage() {
    return (
        <div className="w-[1200px] h-[630px] bg-[#000000] flex relative overflow-hidden font-sans">
            {/* Background Elements */}
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[150px] -translate-y-1/2 translate-x-1/2 opacity-60"></div>
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[120px] translate-y-1/3 -translate-x-1/3 opacity-40"></div>

            {/* Grid Pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>

            {/* Content Container */}
            <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-20 text-center">

                {/* Logo Icon */}
                <div className="w-32 h-32 bg-gray-900 rounded-3xl border border-white/10 flex items-center justify-center mb-8 shadow-2xl relative group">
                    <div className="absolute inset-0 bg-primary/20 blur-xl rounded-3xl opacity-50"></div>
                    <div className="relative z-10 flex flex-col items-center leading-none">
                        <span className="text-xl font-black text-[#facc15] tracking-tighter">AAROH</span>
                        <span className="text-5xl font-black text-white -mt-2">26</span>
                    </div>
                </div>

                {/* Main Title */}
                <h1 className="text-7xl font-black text-white tracking-tight mb-4 flex items-center gap-4">
                    AAROH 26 - <span className="text-[#facc15]">DECARTO</span>
                </h1>

                {/* Subtitle */}
                <p className="text-2xl font-medium text-white/60 tracking-widest uppercase mb-12">
                    Management Console
                </p>

                {/* Footer / Badge */}
                <div className="absolute bottom-12 flex items-center gap-2 px-6 py-3 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
                    <Sparkles className="w-5 h-5 text-[#facc15]" />
                    <span className="text-sm font-bold text-white/80">POWERED BY ELEVATES</span>
                </div>

            </div>
        </div>
    );
}
