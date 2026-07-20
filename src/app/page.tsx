import Link from "next/link";

const features = [
  {
    icon: "📅",
    title: "Agendamento inteligente",
    description: "Programe posts para múltiplas redes de uma só vez. Defina o melhor horário e deixe o SocialPost publicar.",
  },
  {
    icon: "📊",
    title: "Analytics unificado",
    description: "Todas as métricas de todas as plataformas em um único painel. Entenda o que funciona.",
  },
  {
    icon: "💬",
    title: "Inbox centralizado",
    description: "Comentários, menções e DMs de todas as redes em um só lugar. Responda mais rápido.",
  },
  {
    icon: "👥",
    title: "Equipes e workspaces",
    description: "Colabore com sua equipe com papéis e permissões. Ideal para agências.",
  },
  {
    icon: "🤖",
    title: "IA integrada",
    description: "Gere variações de conteúdo adaptadas a cada plataforma com um clique.",
  },
  {
    icon: "🔗",
    title: "10+ plataformas",
    description: "Instagram, X, Facebook, LinkedIn, TikTok, YouTube, Threads, Pinterest, Reddit e Bluesky.",
  },
];

const plans = [
  {
    name: "Grátis",
    price: "R$ 0",
    period: "/mês",
    description: "Para criadores individuais começando agora.",
    highlighted: false,
    features: ["3 contas sociais", "30 posts por mês", "1 workspace", "Analytics básico"],
    cta: "Começar grátis",
    href: "/register",
  },
  {
    name: "Pro",
    price: "R$ 49",
    period: "/mês",
    description: "Para criadores e freelancers que querem crescer.",
    highlighted: true,
    features: ["10 contas sociais", "Posts ilimitados", "5 workspaces", "Analytics avançado", "IA integrada", "Suporte por e-mail"],
    cta: "Testar 7 dias grátis",
    href: "/register?plan=pro",
  },
  {
    name: "Agency",
    price: "R$ 149",
    period: "/mês",
    description: "Para agências com múltiplos clientes.",
    highlighted: false,
    features: ["Contas ilimitadas", "Workspaces ilimitados", "Membros ilimitados", "API access", "Suporte prioritário", "Relatórios white-label"],
    cta: "Falar com vendas",
    href: "/register?plan=agency",
  },
];

const testimonials = [
  {
    quote: "Economizamos 12 horas por semana com o SocialPost. A equipe toda usa e o resultado foi imediato.",
    name: "Mariana Costa",
    role: "Social Media Manager · Agência Plural",
    initials: "MC",
    color: "bg-violet-500",
  },
  {
    quote: "Finalmente consigo ver o desempenho de todas as redes em um só lugar. Os analytics mudaram minha estratégia.",
    name: "Rafael Souza",
    role: "Creator · 280k seguidores",
    initials: "RS",
    color: "bg-sky-500",
  },
  {
    quote: "Gerencio 23 clientes com uma equipe de 4 pessoas. Antes disso era impossível.",
    name: "Juliana Melo",
    role: "CEO · JM Social",
    initials: "JM",
    color: "bg-emerald-500",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-white" style={{ colorScheme: "dark" }}>
      <style>{`
        .gradient-text {
          background: linear-gradient(135deg, #a78bfa 0%, #818cf8 50%, #38bdf8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .card-dark {
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.02);
          transition: border-color 0.2s, background 0.2s;
        }
        .card-dark:hover {
          border-color: rgba(167,139,250,0.25);
          background: rgba(167,139,250,0.04);
        }
        .plan-hot {
          border: 1px solid rgba(139,92,246,0.5);
          background: rgba(139,92,246,0.07);
          box-shadow: 0 0 40px rgba(139,92,246,0.1), inset 0 1px 0 rgba(255,255,255,0.07);
        }
      `}</style>

      {/* Nav */}
      <nav style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 50, backgroundColor: "rgba(9,9,11,0.85)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", height: 64, alignItems: "center", justifyContent: "space-between", padding: "0 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, background: "#7c3aed", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 20px rgba(124,58,237,0.4)" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.3px" }}>SocialPost</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Link href="/login" style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", textDecoration: "none", padding: "6px 12px" }}>Entrar</Link>
            <Link href="/register" style={{ fontSize: 13, fontWeight: 600, background: "#7c3aed", color: "white", textDecoration: "none", padding: "7px 16px", borderRadius: 8, boxShadow: "0 4px 20px rgba(124,58,237,0.3)" }}>
              Começar grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ position: "relative", overflow: "hidden", textAlign: "center", padding: "96px 24px 80px" }}>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 80, pointerEvents: "none" }}>
          <div style={{ width: 700, height: 400, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(124,58,237,0.15) 0%, transparent 70%)", filter: "blur(40px)" }} />
        </div>

        <div style={{ position: "relative" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 99, border: "1px solid rgba(167,139,250,0.3)", background: "rgba(124,58,237,0.1)", padding: "6px 14px", marginBottom: 28 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#a78bfa", boxShadow: "0 0 8px rgba(167,139,250,0.8)" }} />
            <span style={{ fontSize: 12, fontWeight: 500, color: "#c4b5fd" }}>Nova versão com IA integrada</span>
          </div>

          <h1 style={{ fontSize: "clamp(40px, 7vw, 72px)", fontWeight: 900, lineHeight: 1.08, letterSpacing: "-2px", margin: "0 0 20px" }}>
            Todas as suas redes<br />
            <span className="gradient-text">em um só lugar</span>
          </h1>

          <p style={{ fontSize: 18, color: "rgba(255,255,255,0.45)", maxWidth: 480, margin: "0 auto 36px", lineHeight: 1.6 }}>
            Agende posts, responda mensagens e analise resultados para todas as suas plataformas — sem trocar de aba.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", marginBottom: 12 }}>
            <Link href="/register" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#7c3aed", color: "white", textDecoration: "none", padding: "13px 28px", borderRadius: 12, fontWeight: 600, fontSize: 14, boxShadow: "0 8px 30px rgba(124,58,237,0.35)" }}>
              Começar grátis — 7 dias
              <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </Link>
            <a href="#pricing" style={{ display: "inline-flex", alignItems: "center", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.65)", textDecoration: "none", padding: "13px 28px", borderRadius: 12, fontWeight: 500, fontSize: 14 }}>
              Ver preços
            </a>
          </div>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", margin: 0 }}>Sem cartão de crédito • Cancele quando quiser</p>

          {/* Platforms */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", marginTop: 52, maxWidth: 380, margin: "52px auto 0" }}>
            {["𝕏", "📸", "f", "in", "♪", "▶", "🦋", "@", "P", "🤖"].map((icon, i) => (
              <div key={i} style={{ width: 44, height: 44, borderRadius: 14, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                {icon}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mock dashboard */}
      <div style={{ maxWidth: 1000, margin: "0 auto 96px", padding: "0 24px" }}>
        <div style={{ borderRadius: 20, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)", padding: 4, boxShadow: "0 0 60px rgba(124,58,237,0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(239,68,68,0.5)" }} />
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(234,179,8,0.5)" }} />
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(34,197,94,0.5)" }} />
            <span style={{ marginLeft: 8, fontSize: 11, color: "rgba(255,255,255,0.2)" }}>app.socialpost.com/dashboard</span>
          </div>
          <div style={{ borderRadius: 16, background: "linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(9,9,11,1) 60%, rgba(14,116,144,0.06) 100%)", padding: "32px 24px", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
            {[
              { label: "Posts agendados", value: "48", color: "#a78bfa" },
              { label: "Engajamento médio", value: "6.2%", color: "#38bdf8" },
              { label: "Alcance total", value: "124K", color: "#34d399" },
            ].map((stat) => (
              <div key={stat.label} className="card-dark" style={{ borderRadius: 14, padding: 16 }}>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 6 }}>{stat.label}</p>
                <p style={{ fontSize: 26, fontWeight: 800, color: stat.color, margin: 0 }}>{stat.value}</p>
              </div>
            ))}
            <div className="card-dark" style={{ gridColumn: "1/-1", borderRadius: 14, padding: 16 }}>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 12 }}>Posts recentes</p>
              {[
                { text: "Novo produto lançado! 🚀 Conheça nossa linha completa...", platforms: "Instagram · X · LinkedIn", status: "Publicado", dot: "#34d399" },
                { text: "5 dicas para aumentar seu engajamento orgânico em 2026", platforms: "X · LinkedIn", status: "Agendado para 14h", dot: "#a78bfa" },
              ].map((post) => (
                <div key={post.text} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "10px 14px", marginBottom: 8 }}>
                  <div style={{ overflow: "hidden" }}>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", margin: "0 0 2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 400 }}>{post.text}</p>
                    <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", margin: 0 }}>{post.platforms}</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: post.dot }} />
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{post.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <section id="features" style={{ maxWidth: 1280, margin: "0 auto 96px", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "#a78bfa", marginBottom: 12 }}>Funcionalidades</p>
          <h2 style={{ fontSize: "clamp(30px, 5vw, 48px)", fontWeight: 900, letterSpacing: "-1.5px", lineHeight: 1.1, margin: 0 }}>
            Tudo para dominar<br />
            <span className="gradient-text">as redes sociais</span>
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
          {features.map((f) => (
            <div key={f.title} className="card-dark" style={{ borderRadius: 18, padding: 24 }}>
              <div style={{ fontSize: 28, marginBottom: 14 }}>{f.icon}</div>
              <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 8px" }}>{f.title}</h3>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.6, margin: 0 }}>{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" style={{ maxWidth: 1280, margin: "0 auto 96px", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "#a78bfa", marginBottom: 12 }}>Depoimentos</p>
          <h2 style={{ fontSize: "clamp(30px, 5vw, 48px)", fontWeight: 900, letterSpacing: "-1.5px", margin: 0 }}>
            Quem usa, <span className="gradient-text">recomenda</span>
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
          {testimonials.map((t) => (
            <div key={t.name} className="card-dark" style={{ borderRadius: 18, padding: 24 }}>
              <div style={{ display: "flex", marginBottom: 14 }}>
                {[1,2,3,4,5].map(i => (
                  <svg key={i} width="14" height="14" fill="#fbbf24" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.65, marginBottom: 20 }}>"{t.quote}"</p>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "white", flexShrink: 0 }} className={t.color}>
                  {t.initials}
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, margin: "0 0 2px" }}>{t.name}</p>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", margin: 0 }}>{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ maxWidth: 1280, margin: "0 auto 96px", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: "#a78bfa", marginBottom: 12 }}>Preços</p>
          <h2 style={{ fontSize: "clamp(30px, 5vw, 48px)", fontWeight: 900, letterSpacing: "-1.5px", margin: "0 0 12px" }}>
            Simples, <span className="gradient-text">sem surpresas</span>
          </h2>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>7 dias grátis em qualquer plano pago • Cancele a qualquer momento</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, maxWidth: 900, margin: "0 auto" }}>
          {plans.map((plan) => (
            <div key={plan.name} className={plan.highlighted ? "plan-hot" : "card-dark"} style={{ borderRadius: 20, padding: 28 }}>
              {plan.highlighted && (
                <div style={{ display: "inline-block", marginBottom: 14, borderRadius: 99, border: "1px solid rgba(167,139,250,0.3)", background: "rgba(124,58,237,0.2)", padding: "4px 12px", fontSize: 11, fontWeight: 600, color: "#c4b5fd" }}>
                  Mais popular
                </div>
              )}
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 10px" }}>{plan.name}</h3>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 8 }}>
                <span style={{ fontSize: 40, fontWeight: 900, letterSpacing: "-1px" }}>{plan.price}</span>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>{plan.period}</span>
              </div>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 20, margin: "0 0 20px" }}>{plan.description}</p>
              <Link href={plan.href} style={{ display: "block", textAlign: "center", padding: "10px", borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: "none", marginBottom: 20, ...(plan.highlighted ? { background: "#7c3aed", color: "white", boxShadow: "0 4px 20px rgba(124,58,237,0.3)" } : { border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }) }}>
                {plan.cta}
              </Link>
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {plan.features.map((feat) => (
                  <li key={feat} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "rgba(255,255,255,0.55)", marginBottom: 10 }}>
                    <svg width="14" height="14" fill="none" stroke="#a78bfa" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    {feat}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ maxWidth: 1280, margin: "0 auto 80px", padding: "0 24px" }}>
        <div style={{ borderRadius: 28, border: "1px solid rgba(124,58,237,0.25)", background: "linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(9,9,11,0.8) 50%, rgba(14,116,144,0.06) 100%)", padding: "80px 32px", textAlign: "center", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
            <div style={{ width: 500, height: 300, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(124,58,237,0.12) 0%, transparent 70%)", filter: "blur(40px)" }} />
          </div>
          <div style={{ position: "relative" }}>
            <h2 style={{ fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 900, letterSpacing: "-1.5px", margin: "0 0 14px" }}>
              Pronto para crescer?
            </h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.45)", maxWidth: 420, margin: "0 auto 36px" }}>
              Junte-se a milhares de criadores e agências que dominam as redes com o SocialPost.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
              <Link href="/register" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "white", color: "#111", textDecoration: "none", padding: "13px 28px", borderRadius: 12, fontWeight: 700, fontSize: 14, boxShadow: "0 8px 30px rgba(0,0,0,0.3)" }}>
                Começar grátis agora
                <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </Link>
              <Link href="/login" style={{ display: "inline-flex", alignItems: "center", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.65)", textDecoration: "none", padding: "13px 28px", borderRadius: 12, fontWeight: 500, fontSize: 14 }}>
                Já tenho conta
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "32px 24px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 26, height: 26, background: "#7c3aed", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>SocialPost</span>
          </div>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", margin: 0 }}>© 2026 SocialPost. Todos os direitos reservados.</p>
          <div style={{ display: "flex", gap: 20 }}>
            {["Privacidade", "Termos", "Contato"].map((l) => (
              <a key={l} href="#" style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", textDecoration: "none" }}>{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
