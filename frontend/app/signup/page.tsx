'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signup } from '@/lib/api'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signup(email, password)
      router.push('/app')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not create account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen grid grid-cols-[42%_58%] bg-background overflow-hidden">
      <div className="relative bg-card border-r border-border flex flex-col justify-between p-12 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: `linear-gradient(hsl(220 20% 22% / .4) 1px,transparent 1px),linear-gradient(90deg,hsl(220 20% 22% / .4) 1px,transparent 1px)`, backgroundSize: '44px 44px' }} />
        <div className="absolute pointer-events-none" style={{ width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(circle,hsla(38,90%,58%,0.10) 0%,transparent 65%)', bottom: -120, right: -120, animation: 'float 10s ease-in-out infinite' }} />
        <style>{`@keyframes float{0%,100%{transform:translate(0,0)}50%{transform:translate(-28px,-18px)}}`}</style>

        <div className="relative z-10 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded bg-[var(--primary-dim)] border border-[var(--primary-ring)] flex items-center justify-center font-display font-black text-primary text-sm">T</div>
          <span className="font-display font-bold text-lg tracking-tight text-foreground">Tissue</span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground bg-muted border border-border rounded-full px-1.5 py-0.5">AI</span>
        </div>

        <div className="relative z-10">
          <h2 className="font-display font-bold text-[2rem] leading-tight tracking-tight text-foreground mb-4">
            Diagrams from <em className="not-italic text-primary">description</em> — in seconds.
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-8 max-w-xs">Join Tissue AI and transform how you communicate complex ideas. No design skills required.</p>
          <div className="flex flex-col gap-3">
            {['Free to start — no credit card needed', '6 diagram types: flowcharts, mindmaps, trees & more', 'Edit node labels directly on the canvas', 'Export-ready SVG, PNG, and PDF output'].map(f => (
              <div key={f} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" style={{ boxShadow: '0 0 6px hsl(var(--primary))' }} />
                {f}
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 font-mono text-[11px] text-muted-foreground/40">tissue-ai · v2</div>
      </div>

      <div className="flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-sm animate-fade-up">
          <div className="bg-card border border-border rounded-[var(--radius-lg)] p-8">
            <h1 className="font-display font-bold text-2xl tracking-tight text-foreground mb-1">Create account</h1>
            <p className="text-sm text-muted-foreground mb-6">Start generating diagrams in seconds.</p>

            {error && (
              <div className="mb-4 px-3 py-2.5 rounded bg-destructive/10 border border-destructive/25 text-red-400 text-sm">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-[13px] font-medium text-foreground mb-1.5">Email address</label>
                <input type="email" required autoComplete="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} className="w-full h-10 px-3 bg-background border border-border rounded text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all focus:border-[var(--primary-ring)] focus:shadow-[var(--primary-glow)]" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-foreground mb-1.5">Password</label>
                <input type="password" required autoComplete="new-password" placeholder="Choose a password" value={password} onChange={e => setPassword(e.target.value)} className="w-full h-10 px-3 bg-background border border-border rounded text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all focus:border-[var(--primary-ring)] focus:shadow-[var(--primary-glow)]" />
              </div>
              <button type="submit" disabled={loading} className="w-full h-10 rounded bg-primary text-primary-foreground font-semibold text-sm transition-all active:scale-[0.97] hover:opacity-88 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2">
                {loading && <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full" style={{ animation: 'spin 0.65s linear infinite' }} />}
                {loading ? 'Creating account…' : 'Create account'}
              </button>
            </form>

            <Link href="/login" className="block mt-4 text-[13px] text-primary hover:opacity-70 transition-opacity">
              Already have an account? Log in →
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
