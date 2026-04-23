import type { ReactNode } from 'react'
import ScreenContainer from '../common/ScreenContainer'

type Highlight = {
  title: string
  description: string
}

type AuthScreenShellProps = {
  eyebrow: string
  heroTitle: string
  heroDescription: string
  highlights: Highlight[]
  cardBadge: string
  cardTitle: string
  cardDescription: string
  notice?: ReactNode
  children: ReactNode
  footer?: ReactNode
}

const AuthScreenShell = ({
  eyebrow,
  heroTitle,
  heroDescription,
  highlights,
  cardBadge,
  cardTitle,
  cardDescription,
  notice,
  children,
  footer,
}: AuthScreenShellProps) => {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.18),transparent_32%),linear-gradient(180deg,#f8fafc_0%,#eff6ff_100%)]" />
      <div className="absolute left-[-8rem] top-20 h-56 w-56 rounded-full bg-teal-200/25 blur-3xl" />
      <div className="absolute bottom-10 right-[-5rem] h-64 w-64 rounded-full bg-sky-200/30 blur-3xl" />

      <ScreenContainer className="relative flex min-h-screen items-center justify-center py-10">
        <div className="grid w-full max-w-5xl gap-5 lg:grid-cols-[1.08fr_0.92fr]">
          <section className="relative overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-7 text-white shadow-[0_30px_90px_-40px_rgba(15,23,42,0.85)] sm:px-8 sm:py-9">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(45,212,191,0.22),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(56,189,248,0.22),transparent_35%)]" />
            <div className="relative">
              <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-teal-100 backdrop-blur">
                {eyebrow}
              </span>
              <h1 className="mt-5 max-w-lg text-3xl font-semibold leading-tight sm:text-4xl">{heroTitle}</h1>
              <p className="mt-3 max-w-lg text-sm leading-6 text-slate-300">{heroDescription}</p>

              <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                {highlights.map((item, index) => (
                  <div
                    key={`${item.title}-${index}`}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-sm font-semibold text-white">
                        {String(index + 1).padStart(2, '0')}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white">{item.title}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-300">{item.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="glass-card relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/95 p-6 shadow-[0_30px_90px_-50px_rgba(15,23,42,0.55)] backdrop-blur sm:p-8">
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-teal-100/90 via-sky-50 to-white" />
            <div className="relative">
              <span className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white">
                {cardBadge}
              </span>

              <div className="mt-5 space-y-2 text-left">
                <h2 className="text-3xl font-semibold tracking-tight text-slate-900">{cardTitle}</h2>
                <p className="text-sm leading-6 text-slate-600">{cardDescription}</p>
              </div>

              {notice && <div className="mt-5">{notice}</div>}

              <div className="mt-6">{children}</div>

              {footer && <div className="mt-6 border-t border-slate-200/80 pt-5">{footer}</div>}
            </div>
          </section>
        </div>
      </ScreenContainer>
    </div>
  )
}

export default AuthScreenShell
