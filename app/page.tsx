import Link from "next/link"
import { Button } from "@/components/ui/button"
import { TrendingUp, Zap, Heart, MessageCircle, BarChart3 } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2 font-bold text-xl">
            <TrendingUp className="h-6 w-6 text-primary" />
            FinTrack
          </div>
          <Link href="/dashboard">
            <Button>Ver Demo</Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl font-bold tracking-tight mb-6">
          Controle Financeiro <span className="text-primary">Inteligente</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
          Gerencie suas finanças pessoais, investimentos, metas e compartilhe contas com seu parceiro em uma única plataforma.
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/dashboard">
            <Button size="lg">Acessar Dashboard</Button>
          </Link>
        </div>

        <div className="grid md:grid-cols-4 gap-6 mt-20">
          {[
            { icon: Zap, title: "Controle Total", desc: "Transações, orçamentos e metas em um só lugar" },
            { icon: BarChart3, title: "Investimentos", desc: "Acompanhe sua carteira e simule juros compostos" },
            { icon: Heart, title: "Modo Casal", desc: "Compartilhe contas e controle gastos juntos" },
            { icon: MessageCircle, title: "IA Financeira", desc: "Tire dúvidas e receba insights com nosso chatbot" },
          ].map((f) => (
            <div key={f.title} className="rounded-lg border p-6 hover:shadow-lg transition-shadow">
              <f.icon className="h-10 w-10 text-primary mx-auto mb-4" />
              <h3 className="font-bold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
