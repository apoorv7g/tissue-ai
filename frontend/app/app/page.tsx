export default function AppHome() {
  return (
    <div className="flex-1 flex items-center justify-center relative overflow-hidden dot-grid">
      {/* Ambient glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[240px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, hsla(38,90%,58%,0.06) 0%, transparent 70%)' }} />
      <div className="relative z-10 text-center select-none">
        <p className="font-display font-black text-[5rem] leading-none tracking-[-0.05em] text-foreground opacity-[0.05] mb-3">
          Tissue
        </p>
        <p className="text-sm text-muted-foreground max-w-[240px] mx-auto leading-relaxed">
          Select a chat or create a new one to get started.
        </p>
      </div>
    </div>
  )
}
