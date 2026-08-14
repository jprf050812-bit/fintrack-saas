import { PrismaClient } from "@prisma/client"

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
    await prisma.category.create({ data: cat })
  }

  console.log("Seed completed! Categorias padrão criadas.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
