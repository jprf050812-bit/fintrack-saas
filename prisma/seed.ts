import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const categories = [
    { name: "Alimentação", type: "expense", color: "#f97316", isDefault: true },
    { name: "Transporte", type: "expense", color: "#3b82f6", isDefault: true },
    { name: "Moradia", type: "expense", color: "#8b5cf6", isDefault: true },
    { name: "Lazer", type: "expense", color: "#ef4444", isDefault: true },
    { name: "Saúde", type: "expense", color: "#22c55e", isDefault: true },
    { name: "Educação", type: "expense", color: "#eab308", isDefault: true },
    { name: "Renda", type: "income", color: "#22c55e", isDefault: true },
    { name: "Renda Extra", type: "income", color: "#10b981", isDefault: true },
    { name: "Investimentos", type: "income", color: "#6366f1", isDefault: true },
  ]

  for (const cat of categories) {
    const existing = await prisma.category.findFirst({
      where: { name: cat.name, isDefault: true },
    })
    if (!existing) {
      await prisma.category.create({ data: cat })
    }
  }

  console.log("Categorias padrão criadas (ou já existentes).")

  // Optional demo account so you can log in right after seeding.
  // Email/password can be overridden with env vars if you don't want the default.
  const demoEmail = process.env.SEED_DEMO_EMAIL || "demo@fintrack.com"
  const demoPassword = process.env.SEED_DEMO_PASSWORD || "demo123456"

  const existingUser = await prisma.user.findUnique({ where: { email: demoEmail } })
  if (!existingUser) {
    const hashed = await bcrypt.hash(demoPassword, 10)
    await prisma.user.create({
      data: {
        name: "Usuário Demo",
        email: demoEmail,
        password: hashed,
        wallets: {
          create: { name: "Carteira Principal", type: "checking", balance: 0 },
        },
      },
    })
    console.log(`Usuário demo criado: ${demoEmail} / ${demoPassword}`)
  } else {
    console.log("Usuário demo já existe.")
  }

  console.log("Seed concluído!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
