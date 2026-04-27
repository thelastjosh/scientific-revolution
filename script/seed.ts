/**
 * Idempotent seed: populates organizations, users, org memberships, tasks, projects, epoch
 * when `network_tasks` is empty. Requires DATABASE_URL and applied migrations.
 *
 * Default password for all seed users: Demo2026!SR
 */
import "dotenv/config";
import { sql } from "drizzle-orm";
import { hashPassword } from "../server/auth";
import { getDb } from "../server/db";
import {
  networkEpochs,
  networkProjects,
  networkTasks,
  organizationMembers,
  organizations,
  users,
} from "../shared/schema";

async function main() {
  const db = getDb();
  if (!db) {
    console.error("DATABASE_URL (or POSTGRES_URL) is not set.");
    process.exit(1);
  }

  const [{ c }] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(networkTasks);
  if (c > 0) {
    console.log("Seed skipped: network_tasks already has rows. Truncate tables to re-seed.");
    return;
  }

  const passwordHash = await hashPassword("Demo2026!SR");

  await db.transaction(async (tx) => {
    await tx.insert(organizations).values([
      {
        id: "public-ai",
        name: "Public AI",
        description:
          "A nonprofit movement to spread the benefits and mitigate the harms of AI through volunteer-driven, public-interest work.",
      },
      {
        id: "unicef",
        name: "UNICEF",
        description:
          "UNICEF works in over 190 countries to save children’s lives, defend their rights, and help them fulfill their potential.",
      },
    ]);

    const userRows = await tx
      .insert(users)
      .values([
        {
          email: "alice@public-ai.test",
          passwordHash,
          firstName: "Alice",
          lastName: "Chen",
          bio: "ML reliability and evaluation; coordinates volunteer cohorts for Public AI.",
          reputation: 98.4,
          motivation: 75,
        },
        {
          email: "marcus@unicef.test",
          passwordHash,
          firstName: "Marcus",
          lastName: "Okonkwo",
          bio: "Field data systems; focuses on child health and education programs in East Africa.",
          reputation: 91.0,
          motivation: 82,
        },
        {
          email: "sarah@scientific-revolution.test",
          passwordHash,
          firstName: "Sarah",
          lastName: "Iyer",
          bio: "Research synthesis and product strategy for volunteer coordination platforms.",
          reputation: 88.0,
          motivation: 70,
        },
        {
          email: "demo@scientific-revolution.test",
          passwordHash,
          firstName: "Demo",
          lastName: "User",
          bio: "Seeded account for product demos. Affiliated with both Public AI and UNICEF in this test graph.",
          reputation: 72.5,
          motivation: 64,
        },
        {
          email: "jordan@developer-dao.test",
          passwordHash,
          firstName: "Jordan",
          lastName: "Reyes",
          bio: "Security reviews and open-source release automation.",
          reputation: 85.0,
          motivation: 58,
        },
      ])
      .returning({ id: users.id, email: users.email });

    const byEmail = Object.fromEntries(
      userRows.map((u) => [u.email, u.id]),
    ) as Record<string, string>;

    await tx.insert(organizationMembers).values([
      {
        organizationId: "public-ai",
        userId: byEmail["alice@public-ai.test"]!,
        role: "coordinator",
      },
      {
        organizationId: "public-ai",
        userId: byEmail["demo@scientific-revolution.test"]!,
        role: "member",
      },
      {
        organizationId: "unicef",
        userId: byEmail["marcus@unicef.test"]!,
        role: "field",
      },
      {
        organizationId: "unicef",
        userId: byEmail["demo@scientific-revolution.test"]!,
        role: "volunteer",
      },
    ]);

    await tx.insert(networkTasks).values([
      {
        id: "T-2025",
        organizationId: "public-ai",
        shortWhy: "Improve search latency",
        title: "Optimize Vector Search Query Performance",
        description:
          "The current HNSW implementation has O(log n) degradation on large datasets. Profile the search query and implement the proposed graph-pruning optimization.",
        rationale:
          "Search latency has exceeded the 200ms SLA for Sector 4 datasets.",
        evaluationLoop:
          "Benchmark against a 10M vector dataset. Must achieve p99 latency < 200ms without dropping recall below 0.95.",
        motivationScore: 25,
        timeEstimate: "1h 30m",
        status: "available",
        community: "public-ai",
        githubLink: "https://github.com/scientific-revolution/vector-db/issues/102",
        workspaceType: "github-import",
        history: [],
      },
      {
        id: "T-9902",
        organizationId: "unicef",
        shortWhy: "Monitor food security",
        title: "Analyze Sentinel-2 Satellite Imagery for Crop Health",
        description:
          "Process the provided GeoTIFF files for the Horn of Africa region. Calculate NDVI indices and flag areas showing >20% vegetation stress compared to the previous month.",
        rationale:
          "Early warning system for drought conditions affecting food security in the region.",
        evaluationLoop:
          "Automated script compares output coordinates against known ground-truth sensors. Peer review by GIS specialist.",
        motivationScore: 40,
        timeEstimate: "45m",
        status: "available",
        community: "unicef",
        history: [],
      },
      {
        id: "T-9903",
        organizationId: "unicef",
        shortWhy: "Help kids globally",
        title: "Refactor Child Vaccination Tracking Service",
        description:
          "The legacy tracking service has hardcoded region logic. Refactor the `RegionSelector` component to use the new dynamic config provider.",
        rationale:
          "Scalability blocker for deploying to 3 new countries next quarter.",
        evaluationLoop:
          "Unit tests for the component and manual QA in staging with simulated region configs.",
        motivationScore: 5,
        timeEstimate: "1h 15m",
        status: "available",
        community: "unicef",
        githubLink: "https://github.com/scientific-revolution/unicef-tracker/pull/42",
        workspaceType: "github-import",
        history: [],
      },
      {
        id: "T-8821",
        organizationId: "public-ai",
        shortWhy: "Ensure safe AI models",
        title: "Verify dataset integrity for Sector 7",
        description:
          "Review the provided dataset columns for null values and report any inconsistencies in the schema alignment. Download the CSV, check rows 100-500, and confirm value ranges.",
        rationale:
          "Data corruption has been detected in Sector 7 inputs. Manual verification is required to train the next model iteration safely.",
        evaluationLoop:
          "Cross-reference manual report with automated sanity checker output. Consensus required by 2 separate reviewers.",
        motivationScore: -20,
        timeEstimate: "10m",
        status: "available",
        community: "public-ai",
        history: [
          {
            id: "T-8820",
            shortWhy: "Verify data quality",
            title: "Collect raw data from Sector 7 sensors",
            result: "Data collected, but 12% null values detected in primary stream.",
            date: "2023-10-24 09:42:00",
            contributorId: "U-11203",
          },
        ],
      },
      {
        id: "T-2024",
        organizationId: null,
        shortWhy: "Secure user sessions",
        title: "Refactor Auth Middleware for Race Condition",
        description:
          "A race condition has been identified in the JWT refresh token rotation. Investigate the `auth-middleware.ts` file and implement a mutex lock or atomic update pattern.",
        rationale:
          "Security vulnerability (CVE-2024-9981) allows potential session hijacking under high load.",
        evaluationLoop:
          "Automated CI/CD runs concurrency tests. Reviewer will verify mutex implementation and load test with k6.",
        motivationScore: -10,
        timeEstimate: "45m",
        status: "available",
        community: "developer-dao",
        githubLink: "https://github.com/scientific-revolution/core-auth/pull/24",
        workspaceType: "github-import",
        history: [],
      },
      {
        id: "EVT-001",
        organizationId: "public-ai",
        shortWhy: "Align AI development",
        title: "Weekly Sync: AI Alignment Council",
        description:
          "Join the synchronous call to discuss the latest proposals for Sector 7 deployment and ethical alignment protocols. Attendance grants units.",
        rationale:
          "High bandwidth synchronization required to resolve blocking issues in the current epoch.",
        evaluationLoop: "Attendance logged automatically. Active participation required.",
        motivationScore: 60,
        timeEstimate: "1h",
        status: "available",
        community: "public-ai",
        taskKind: "event",
        workspaceType: "event",
        eventDate: new Date("2026-03-05T18:00:00Z"),
        history: [],
      },
    ]);

    await tx.insert(networkProjects).values([
      {
        id: "CMD-001",
        organizationId: "public-ai",
        shortWhy: "Process new sensor data",
        title: "Architect Sector 7 Data Pipeline",
        description:
          "Design the complete ingestion and validation flow for the new sensor array. Requires deep knowledge of stream processing protocols.",
        motivationScore: 80,
        deadline: "72h",
        status: "open",
      },
      {
        id: "CMD-002",
        organizationId: "unicef",
        shortWhy: "Improve inference efficiency",
        title: "Optimize Core Algorithm v0.9",
        description:
          "Reduce computational overhead of the main inference engine by 15% without loss of accuracy.",
        motivationScore: 65,
        deadline: "48h",
        status: "claimed",
        claimedBy: "Sarah Iyer",
      },
    ]);

    await tx.insert(networkEpochs).values({
      id: "OP-7721",
      name: "Sector 7 Integrity",
      description:
        "Restore data fidelity across all primary sensor arrays in the industrial district.",
      progress: 68,
      target: 50000,
      current: 34210,
      deadline: "48h Remaining",
      status: "nominal",
    });
  });

  console.log("Seed complete. Login examples (password Demo2026!SR):");
  console.log("  - demo@scientific-revolution.test");
  console.log("  - alice@public-ai.test");
  console.log("  - marcus@unicef.test");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
