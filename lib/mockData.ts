// ─── Types ───────────────────────────────────────────────────────────────────

export type EmotionalState = "calm" | "focused" | "anxious" | "overwhelmed"

export interface RecoveryDataPoint {
  month: string
  successRate: number // 0–100
}

export interface Doctor {
  id: string
  name: string
  specialty: string
  experienceYears: number
  matchScore: number // 0–100
  hospital: string
  location: string
  languages: string[]
  aiSummary: string
  recoveryData: RecoveryDataPoint[]
  patientCount: number
  acceptingNew: boolean
}

export interface Milestone {
  id: string
  title: string
  description: string
  completedAt: string | null // ISO date or null if pending
  daysFromDiagnosis: number
}

export interface CircleMember {
  id: string
  initials: string
  name: string
  condition: string
  stage: string
  joinedDaysAgo: number
  milestones: Milestone[]
}

export interface ChatMessage {
  id: string
  authorId: string // "me" | CircleMember.id | "system"
  authorName: string
  text: string
  timestamp: string
  isGuardrail?: boolean
}

// ─── Mock Doctors ─────────────────────────────────────────────────────────────

export const MOCK_DOCTORS: Doctor[] = [
  {
    id: "dr-sarah-patel",
    name: "Dr. Sarah Patel",
    specialty: "Cardiology",
    experienceYears: 12,
    matchScore: 92,
    hospital: "Stanford Medical Center",
    location: "Palo Alto, CA",
    languages: ["English", "Hindi"],
    aiSummary:
      "Dr. Patel specializes in interventional cardiology with a focus on complex coronary artery disease. Her patient cohort shows a 92% similarity match to your condition profile, with outcomes clustering strongly in Stage 2–3 recovery milestones. Patients with similar LDL profiles and family history have reported 40% faster milestone achievement under her care. She is currently conducting research on stress-induced cardiac events, making her particularly relevant to your case.",
    recoveryData: [
      { month: "Sep", successRate: 72 },
      { month: "Oct", successRate: 78 },
      { month: "Nov", successRate: 81 },
      { month: "Dec", successRate: 85 },
      { month: "Jan", successRate: 89 },
      { month: "Feb", successRate: 92 },
    ],
    patientCount: 847,
    acceptingNew: true,
  },
  {
    id: "dr-michael-chen",
    name: "Dr. Michael Chen",
    specialty: "Cardiology",
    experienceYears: 15,
    matchScore: 88,
    hospital: "UCSF Health",
    location: "San Francisco, CA",
    languages: ["English", "Mandarin"],
    aiSummary:
      "Dr. Chen brings 15 years of expertise in preventive cardiology and heart failure management. His evidence-based approach draws from a database of over 1,200 similar patient outcomes, showing strong alignment with your recovery trajectory. Patients in comparable stages report high satisfaction with his structured milestone framework and proactive follow-up cadence. His practice integrates wearable data into treatment planning, which aligns well with your monitoring needs.",
    recoveryData: [
      { month: "Sep", successRate: 68 },
      { month: "Oct", successRate: 74 },
      { month: "Nov", successRate: 79 },
      { month: "Dec", successRate: 83 },
      { month: "Jan", successRate: 86 },
      { month: "Feb", successRate: 88 },
    ],
    patientCount: 1203,
    acceptingNew: true,
  },
  {
    id: "dr-aisha-okonkwo",
    name: "Dr. Aisha Okonkwo",
    specialty: "Internal Medicine",
    experienceYears: 9,
    matchScore: 81,
    hospital: "Kaiser Permanente",
    location: "Oakland, CA",
    languages: ["English", "Yoruba", "French"],
    aiSummary:
      "Dr. Okonkwo's practice focuses on chronic disease management with a whole-patient approach. Her outcomes data shows particularly strong results for patients managing comorbid conditions alongside cardiac concerns. Culturally sensitive and multilingual, she has a notable track record with patients who have expressed preference for integrative care models. Her 81% match reflects high alignment in lifestyle factors and treatment philosophy.",
    recoveryData: [
      { month: "Sep", successRate: 65 },
      { month: "Oct", successRate: 70 },
      { month: "Nov", successRate: 74 },
      { month: "Dec", successRate: 77 },
      { month: "Jan", successRate: 79 },
      { month: "Feb", successRate: 81 },
    ],
    patientCount: 612,
    acceptingNew: false,
  },
  {
    id: "dr-james-rivera",
    name: "Dr. James Rivera",
    specialty: "Cardiac Rehabilitation",
    experienceYears: 18,
    matchScore: 76,
    hospital: "Cedars-Sinai Medical Center",
    location: "Los Angeles, CA",
    languages: ["English", "Spanish"],
    aiSummary:
      "Dr. Rivera leads one of the most comprehensive cardiac rehabilitation programs on the West Coast. With 18 years specializing in post-event recovery, his structured 12-week programs have demonstrated measurable improvements in VO2 max and quality-of-life scores for patients at your recovery stage. His 76% match score reflects strong alignment in rehab-phase needs, though specialty divergence from acute care reduces perfect overlap.",
    recoveryData: [
      { month: "Sep", successRate: 60 },
      { month: "Oct", successRate: 65 },
      { month: "Nov", successRate: 69 },
      { month: "Dec", successRate: 72 },
      { month: "Jan", successRate: 74 },
      { month: "Feb", successRate: 76 },
    ],
    patientCount: 2100,
    acceptingNew: true,
  },
]

// ─── Mock Circle Members ──────────────────────────────────────────────────────

export const MOCK_CIRCLE_MEMBERS: CircleMember[] = [
  {
    id: "member-1",
    initials: "JM",
    name: "Jamie M.",
    condition: "Coronary Artery Disease",
    stage: "Stage 2 Recovery",
    joinedDaysAgo: 45,
    milestones: [
      {
        id: "m1-1",
        title: "Initial Diagnosis",
        description: "Received confirmed CAD diagnosis from cardiologist.",
        completedAt: "2025-09-15T10:00:00Z",
        daysFromDiagnosis: 0,
      },
      {
        id: "m1-2",
        title: "Started Medication",
        description: "Began statin and beta-blocker regimen.",
        completedAt: "2025-09-22T10:00:00Z",
        daysFromDiagnosis: 7,
      },
      {
        id: "m1-3",
        title: "Cardiac Rehab Enrolled",
        description: "Joined 12-week supervised cardiac rehabilitation program.",
        completedAt: "2025-10-01T10:00:00Z",
        daysFromDiagnosis: 16,
      },
      {
        id: "m1-4",
        title: "First Follow-up Clear",
        description: "6-week stress test returned within normal ranges.",
        completedAt: null,
        daysFromDiagnosis: 42,
      },
    ],
  },
  {
    id: "member-2",
    initials: "PR",
    name: "Priya R.",
    condition: "Heart Failure (HFpEF)",
    stage: "Stage 2 Recovery",
    joinedDaysAgo: 30,
    milestones: [
      {
        id: "m2-1",
        title: "Diagnosis Confirmed",
        description: "HFpEF confirmed via echocardiogram.",
        completedAt: "2025-10-05T10:00:00Z",
        daysFromDiagnosis: 0,
      },
      {
        id: "m2-2",
        title: "Diet Protocol Started",
        description: "Low-sodium diet and fluid restriction begun.",
        completedAt: "2025-10-12T10:00:00Z",
        daysFromDiagnosis: 7,
      },
      {
        id: "m2-3",
        title: "Weight Monitoring Daily",
        description: "Daily weight log tracking initiated.",
        completedAt: null,
        daysFromDiagnosis: 14,
      },
    ],
  },
  {
    id: "member-3",
    initials: "TK",
    name: "Thomas K.",
    condition: "Post-MI Recovery",
    stage: "Stage 3 Recovery",
    joinedDaysAgo: 62,
    milestones: [
      {
        id: "m3-1",
        title: "MI Event",
        description: "STEMI event, treated with PCI.",
        completedAt: "2025-08-20T10:00:00Z",
        daysFromDiagnosis: 0,
      },
      {
        id: "m3-2",
        title: "Hospital Discharge",
        description: "Discharged after 5-day inpatient stay.",
        completedAt: "2025-08-25T10:00:00Z",
        daysFromDiagnosis: 5,
      },
      {
        id: "m3-3",
        title: "30-Day Cardiology Follow-up",
        description: "Confirmed stable EF and medication tolerance.",
        completedAt: "2025-09-20T10:00:00Z",
        daysFromDiagnosis: 31,
      },
      {
        id: "m3-4",
        title: "Return to Light Activity",
        description: "Cleared for 20-minute daily walks.",
        completedAt: "2025-10-01T10:00:00Z",
        daysFromDiagnosis: 42,
      },
      {
        id: "m3-5",
        title: "90-Day Echo Review",
        description: "Echocardiogram to assess EF recovery.",
        completedAt: null,
        daysFromDiagnosis: 90,
      },
    ],
  },
  {
    id: "member-4",
    initials: "SL",
    name: "Sofia L.",
    condition: "Atrial Fibrillation",
    stage: "Stage 1 Management",
    joinedDaysAgo: 18,
    milestones: [
      {
        id: "m4-1",
        title: "AFib Diagnosis",
        description: "Persistent AFib confirmed on Holter monitor.",
        completedAt: "2025-11-01T10:00:00Z",
        daysFromDiagnosis: 0,
      },
      {
        id: "m4-2",
        title: "Anticoagulation Started",
        description: "Initiated rivaroxaban for stroke prevention.",
        completedAt: "2025-11-05T10:00:00Z",
        daysFromDiagnosis: 4,
      },
    ],
  },
  {
    id: "member-5",
    initials: "DB",
    name: "David B.",
    condition: "Coronary Artery Disease",
    stage: "Stage 2 Recovery",
    joinedDaysAgo: 55,
    milestones: [
      {
        id: "m5-1",
        title: "Angioplasty Completed",
        description: "Successful stent placement in LAD artery.",
        completedAt: "2025-09-10T10:00:00Z",
        daysFromDiagnosis: 0,
      },
      {
        id: "m5-2",
        title: "Dual Antiplatelet Therapy",
        description: "Started aspirin + clopidogrel regimen.",
        completedAt: "2025-09-11T10:00:00Z",
        daysFromDiagnosis: 1,
      },
    ],
  },
  {
    id: "member-6",
    initials: "MN",
    name: "Maya N.",
    condition: "Hypertensive Heart Disease",
    stage: "Stage 1 Management",
    joinedDaysAgo: 10,
    milestones: [
      {
        id: "m6-1",
        title: "Hypertension Diagnosis",
        description: "Stage 2 hypertension with LVH confirmed.",
        completedAt: "2025-11-15T10:00:00Z",
        daysFromDiagnosis: 0,
      },
    ],
  },
]

// ─── Mock Chat Messages ───────────────────────────────────────────────────────

export const MOCK_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: "msg-1",
    authorId: "member-3",
    authorName: "Thomas K.",
    text: "Hey everyone — just hit my 90-day mark post-MI. Feeling a lot more energy lately.",
    timestamp: "2026-02-27T09:00:00Z",
  },
  {
    id: "msg-2",
    authorId: "member-1",
    authorName: "Jamie M.",
    text: "That's huge, Thomas! How are your stress test results looking?",
    timestamp: "2026-02-27T09:03:00Z",
  },
  {
    id: "msg-3",
    authorId: "member-3",
    authorName: "Thomas K.",
    text: "Still waiting on results but my doctor seemed optimistic. What medications is everyone on? I started metoprolol.",
    timestamp: "2026-02-27T09:05:00Z",
  },
  {
    id: "msg-4",
    authorId: "system",
    authorName: "LINK-CARE Bot",
    text: "LINK-CARE cannot provide medical advice. Medication questions should be directed to your licensed healthcare provider.",
    timestamp: "2026-02-27T09:05:30Z",
    isGuardrail: true,
  },
  {
    id: "msg-5",
    authorId: "member-2",
    authorName: "Priya R.",
    text: "Totally agree with the reminder. I've been using the app to track my symptoms which helps me give my doctor better info at appointments.",
    timestamp: "2026-02-27T09:08:00Z",
  },
  {
    id: "msg-6",
    authorId: "member-1",
    authorName: "Jamie M.",
    text: "Same here. The milestone tracking feature has been really helpful for staying motivated.",
    timestamp: "2026-02-27T09:11:00Z",
  },
  {
    id: "msg-7",
    authorId: "member-4",
    authorName: "Sofia L.",
    text: "Just joined this circle last week — so glad there's a community like this. AFib is really isolating.",
    timestamp: "2026-02-27T09:14:00Z",
  },
  {
    id: "msg-8",
    authorId: "member-3",
    authorName: "Thomas K.",
    text: "Welcome Sofia! You're not alone here. We all get it.",
    timestamp: "2026-02-27T09:16:00Z",
  },
]
