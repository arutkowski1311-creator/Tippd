import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Create default team
  const team = await prisma.team.upsert({
    where: { id: "default-team" },
    update: { slug: "thunder" },
    create: {
      id: "default-team",
      name: "My Team",
      slug: "my-team",
      sport: "softball",
    },
  });

  console.log("Created team:", team.name);

  // Create coach account
  const hashedPassword = await bcrypt.hash("password123", 10);
  const user = await prisma.user.upsert({
    where: { email: "coach@thunder.com" },
    update: {},
    create: {
      id: "demo-coach",
      email: "coach@thunder.com",
      name: "Coach",
      password: hashedPassword,
    },
  });

  // Create team membership
  await prisma.teamMembership.upsert({
    where: { id: "demo-membership" },
    update: {},
    create: {
      id: "demo-membership",
      teamId: team.id,
      userId: user.id,
      role: "head_coach",
      status: "active",
    },
  });

  console.log("Created coach account: coach@thunder.com / password123");
  console.log("Seed complete! Add your roster at /roster");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
