export interface HistoryItem {
  id: string;
  shortWhy: string;
  title: string;
  result: string;
  date: string;
  contributorId?: string;
}

export interface Task {
  id: string;
  shortWhy: string;
  title: string;
  description: string;
  rationale: string;
  evaluationLoop: string;
  motivationScore: number; // Positive means adding motivation, negative means reducing motivation
  timeEstimate: string;
  status: 'available' | 'in-progress' | 'completed';
  history: HistoryItem[];
  community: 'public-ai' | 'unicef' | 'general' | 'developer-dao';
  githubLink?: string;
  workspaceType?: 'default' | 'github-import' | 'event' | 'advisory';
  type?: 'standard' | 'event';
  eventDate?: string;
}

export const MOCK_TASKS: Task[] = [
  {
    id: 'T-2024',
    shortWhy: 'Secure user sessions',
    title: 'Refactor Auth Middleware for Race Condition',
    description: 'A race condition has been identified in the JWT refresh token rotation. Investigate the `auth-middleware.ts` file and implement a mutex lock or atomic update pattern.',
    rationale: 'Security vulnerability (CVE-2024-9981) allows potential session hijacking under high load.',
    evaluationLoop: 'Automated CI/CD pipeline runs concurrency tests. Reviewer will verify mutex implementation and perform load testing using k6.',
    motivationScore: -10, // tedious refactor
    timeEstimate: '45m',
    status: 'available',
    community: 'developer-dao',
    githubLink: 'https://github.com/scientific-revolution/core-auth/pull/24',
    workspaceType: 'github-import',
    history: []
  },
  {
    id: 'T-2025',
    shortWhy: 'Improve search latency',
    title: 'Optimize Vector Search Query Performance',
    description: 'The current HNSW implementation has O(log n) degradation on large datasets. Profile the search query and implement the proposed graph-pruning optimization.',
    rationale: 'Search latency has exceeded the 200ms SLA for Sector 4 datasets.',
    evaluationLoop: 'Benchmark against a 10M vector dataset. Must achieve p99 latency < 200ms without dropping recall below 0.95.',
    motivationScore: 25, // challenging and interesting
    timeEstimate: '1h 30m',
    status: 'available',
    community: 'public-ai',
    githubLink: 'https://github.com/scientific-revolution/vector-db/issues/102',
    workspaceType: 'github-import',
    history: []
  },
  {
    id: 'T-9902',
    shortWhy: 'Monitor food security',
    title: 'Analyze Sentinel-2 Satellite Imagery for Crop Health',
    description: 'Process the provided GeoTIFF files for the Horn of Africa region. Calculate NDVI indices and flag areas showing >20% vegetation stress compared to the previous month.',
    rationale: 'Early warning system for drought conditions affecting food security in the region.',
    evaluationLoop: 'Automated script compares output coordinates against known ground-truth sensors. Peer review by GIS specialist.',
    motivationScore: 40, // high impact
    timeEstimate: '45m',
    status: 'available',
    community: 'unicef',
    history: []
  },
  {
    id: 'T-9903',
    shortWhy: 'Help kids globally',
    title: 'Refactor Child Vaccination Tracking Service',
    description: 'The legacy tracking service has hardcoded region logic. Refactor the `RegionSelector` component to use the new dynamic config provider.',
    rationale: 'Scalability blocker for deploying to 3 new countries next quarter.',
    evaluationLoop: 'Unit tests for the component and manual QA in staging environment with simulated region configs.',
    motivationScore: 5,
    timeEstimate: '1h 15m',
    status: 'available',
    community: 'unicef',
    githubLink: 'https://github.com/scientific-revolution/unicef-tracker/pull/42',
    workspaceType: 'github-import',
    history: []
  },
  {
    id: 'T-8821',
    shortWhy: 'Ensure safe AI models',
    title: 'Verify dataset integrity for Sector 7',
    description: 'Review the provided dataset columns for null values and report any inconsistencies in the schema alignment. Download the CSV, check rows 100-500, and confirm value ranges.',
    rationale: 'Data corruption has been detected in Sector 7 inputs. Manual verification is required to train the next model iteration safely.',
    evaluationLoop: 'Cross-reference manual report with automated sanity checker output. Consensus required by 2 separate reviewers.',
    motivationScore: -20, // very tedious manual data validation
    timeEstimate: '10m',
    status: 'available',
    community: 'public-ai',
    history: [
      {
        id: 'T-8820',
        shortWhy: 'Verify data quality',
        title: 'Collect raw data from Sector 7 sensors',
        result: 'Data collected, but 12% null values detected in primary stream.',
        date: '2023-10-24 09:42:00',
        contributorId: 'U-11203'
      },
      {
        id: 'T-8819',
        shortWhy: 'Deploy new hardware',
        title: 'Install sensors in Sector 7',
        result: 'Installation complete. Signal strength nominal.',
        date: '2023-10-22 14:15:00',
        contributorId: 'U-88291'
      }
    ]
  },
  {
    id: 'T-ADV-01',
    shortWhy: 'Provide Guidance',
    title: 'Advisory: Architecture Review with Sarah',
    description: 'Provide strategic guidance on the proposed microservices architecture for the new data pipeline. Review the diagrams and give feedback on fault tolerance.',
    rationale: 'Sarah is proposing a new architecture and needs expert validation before implementation.',
    evaluationLoop: 'Qualitative self-reporting by the advisee on actions taken after the session.',
    motivationScore: 15,
    timeEstimate: '30m',
    status: 'available',
    community: 'general',
    workspaceType: 'advisory',
    history: []
  },
  {
    id: 'T-9901',
    shortWhy: 'Preserve historical records',
    title: 'Transcribe audio segment: "Council Meeting 44"',
    description: 'Listen to the audio clip (04:12 - 06:45) and provide a verbatim transcript. Mark unclear segments with [unintelligible].',
    rationale: 'Historical archiving project requires accurate text records for search indexing.',
    evaluationLoop: 'Transcript diffed against overlapping submissions. Minimum 95% word match required for payout.',
    motivationScore: -15, // rote transcription
    timeEstimate: '25m',
    status: 'available',
    community: 'unicef',
    history: [
      {
        id: 'T-9900',
        shortWhy: 'Prepare audio for parsing',
        title: 'Digitize analog tape #44',
        result: 'Digitization successful. Audio quality degraded at 05:00 mark.',
        date: '2023-10-25 11:30:00',
        contributorId: 'U-33201'
      }
    ]
  },
  {
    id: 'T-7723',
    shortWhy: 'Train urban planning AI',
    title: 'Image classification: Urban decay patterns',
    description: 'Classify the following set of 50 images based on the level of structural decay visible. Scale of 1-5.',
    rationale: 'Urban planning algorithm needs ground-truth data for decay recognition.',
    evaluationLoop: 'Consensus voting. Your classifications must align with the majority on at least 45/50 images.',
    motivationScore: -5,
    timeEstimate: '5m',
    status: 'available',
    community: 'public-ai',
    history: [
      {
        id: 'T-7722',
        shortWhy: 'Gather visual data',
        title: 'Drone Survey Flight 12',
        result: '500 images captured. Sector 4 covered.',
        date: '2023-10-26 08:00:00',
        contributorId: 'U-44120'
      },
      {
        id: 'T-7721',
        shortWhy: 'Optimize data collection',
        title: 'Flight Path Planning',
        result: 'Path optimized for maximum coverage of industrial zones.',
        date: '2023-10-25 16:20:00',
        contributorId: 'U-99281'
      }
    ]
  },
  {
    id: 'T-1102',
    shortWhy: 'Stress-test policies',
    title: 'Generate counter-arguments for Proposal B',
    description: 'Read Proposal B (attached). Write three distinct logical counter-arguments focusing on economic sustainability.',
    rationale: 'Stress-testing policy proposals before public release.',
    evaluationLoop: 'Peer review by policy board members for logic and coherence.',
    motivationScore: 20, // intellectual exercise
    timeEstimate: '30m',
    status: 'available',
    community: 'general',
    history: [
      {
        id: 'T-1101',
        shortWhy: 'Propose universal compute',
        title: 'Draft Proposal B',
        result: 'Draft completed. Focus: Universal Basic Compute.',
        date: '2023-10-26 13:45:00',
        contributorId: 'U-77219'
      },
      {
        id: 'T-1100',
        shortWhy: 'Understand user needs',
        title: 'Community Survey Analysis',
        result: '80% of respondents favor compute subsidies.',
        date: '2023-10-24 10:00:00',
        contributorId: 'U-33210'
      }
    ]
  },
  {
    id: 'EVT-001',
    shortWhy: 'Align AI development',
    title: 'Weekly Sync: AI Alignment Council',
    description: 'Join the synchronous call to discuss the latest proposals for Sector 7 deployment and ethical alignment protocols. Attendance grants units.',
    rationale: 'High bandwidth synchronization required to resolve blocking issues in the current epoch.',
    evaluationLoop: 'Attendance logged automatically. Active participation required.',
    motivationScore: 60, // social/high value
    timeEstimate: '1h',
    status: 'available',
    community: 'public-ai',
    history: [],
    workspaceType: 'event',
    type: 'event',
    eventDate: '2026-03-05T18:00:00Z'
  },
  {
    id: 'EVT-002',
    shortWhy: 'Fix bug securely',
    title: 'Pair Programming: Core Auth Refactor',
    description: 'Live pair programming session to resolve CVE-2024-9981. We need one senior security engineer to assist the current assignee.',
    rationale: 'Pairing significantly reduces the risk of introducing further regressions in the authentication flow.',
    evaluationLoop: 'Successful PR merge resolving CVE-2024-9981.',
    motivationScore: 45, // social/collab
    timeEstimate: '2h',
    status: 'available',
    community: 'developer-dao',
    history: [],
    workspaceType: 'event',
    type: 'event',
    eventDate: '2026-03-04T14:00:00Z'
  }
];

export const MOCK_USER = {
  id: 'U-99281',
  reputation: 98.4,
  motivation: 75 // Starting motivation score
};

export interface Epoch {
  id: string;
  name: string;
  description: string;
  progress: number; // 0-100
  target: number; // total units needed
  current: number; // current units
  deadline: string;
  status: 'nominal' | 'degraded' | 'critical';
}

export const MOCK_EPOCH: Epoch = {
  id: 'OP-7721',
  name: 'Sector 7 Integrity',
  description: 'Restore data fidelity across all primary sensor arrays in the industrial district.',
  progress: 68,
  target: 50000,
  current: 34210,
  deadline: '48h Remaining',
  status: 'nominal'
};

export interface Project {
  id: string;
  shortWhy: string;
  title: string;
  description: string;
  motivationScore: number;
  deadline: string;
  status: 'open' | 'claimed';
  claimedBy?: string;
}

export const MOCK_PROJECTS: Project[] = [
  {
    id: 'CMD-001',
    shortWhy: 'Process new sensor data',
    title: 'Architect Sector 7 Data Pipeline',
    description: 'Design the complete ingestion and validation flow for the new sensor array. Requires deep knowledge of stream processing protocols.',
    motivationScore: 80,
    deadline: '72h',
    status: 'open'
  },
  {
    id: 'CMD-002',
    shortWhy: 'Improve inference efficiency',
    title: 'Optimize Core Algorithm v0.9',
    description: 'Reduce computational overhead of the main inference engine by 15% without loss of accuracy.',
    motivationScore: 65,
    deadline: '48h',
    status: 'claimed',
    claimedBy: 'Sarah'
  }
];
