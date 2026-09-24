import type {
  Activity,
  Database,
  Deal,
  FollowUp,
  Meeting,
  Notification,
  Opportunity,
  Outreach,
  OutreachStatus,
  Prospect,
  Proposal,
  Target,
} from "./types";
import { TARGET_METRICS } from "./types";

/** Deterministic PRNG so the seeded demo dataset is stable between renders. */
function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rnd = mulberry32(20260922);
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length)] as T;
const int = (min: number, max: number) => min + Math.floor(rnd() * (max - min + 1));

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** ISO timestamp for "n days from today" at a given time. */
function at(dayOffset: number, hour = 9, minute = 0) {
  const d = startOfToday();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

const USERS: Database["users"] = [
  {
    id: "usr_vihanga",
    name: "Vihanga Fernando",
    role: "Sales / Business Development",
    email: "vihanga@codemaxed.com",
    initials: "VF",
    active: true,
    targetsSelectedServiceIds: [],
  },
  {
    id: "usr_kasun",
    name: "Kasun Perera",
    role: "Sales / Business Development",
    email: "kasun@codemaxed.com",
    initials: "KP",
    active: true,
    targetsSelectedServiceIds: [],
  },
  {
    id: "usr_daniel",
    name: "Daniel Silva",
    role: "Sales / Business Development",
    email: "daniel@codemaxed.com",
    initials: "DS",
    active: true,
    targetsSelectedServiceIds: [],
  },
  {
    id: "usr_amaya",
    name: "Amaya Fernando",
    role: "Sales / Business Development",
    email: "amaya@codemaxed.com",
    initials: "AF",
    active: true,
    targetsSelectedServiceIds: [],
  },
  {
    id: "usr_admin",
    name: "Operations Admin",
    role: "Admin",
    email: "admin@codemaxed.com",
    initials: "OA",
    active: true,
    targetsSelectedServiceIds: [],
  },
];

const SALES_USER_IDS = ["usr_vihanga", "usr_kasun", "usr_daniel", "usr_amaya"];

const OUTREACH_TYPES: Database["outreachTypes"] = [
  "WhatsApp",
  "LinkedIn",
  "Email",
  "Facebook",
  "Reddit",
  "Instagram",
  "Phone Call",
  "Google Business",
  "Other",
].map((name) => ({ id: `ot_${name.toLowerCase().replace(/\s+/g, "_")}`, name, active: true }));

const SERVICE_TYPES: Database["serviceTypes"] = [
  { name: "Website", ai: false },
  { name: "Custom Software", ai: false },
  { name: "Subscription App", ai: false },
  { name: "PC Build", ai: false },
  { name: "AI Program", ai: true },
  { name: "AI Custom Solutions", ai: true },
].map((s) => ({
  id: `st_${s.name.toLowerCase().replace(/\s+/g, "_")}`,
  name: s.name,
  usesDiscoveryCall: s.ai,
  active: true,
}));

const LEAD_SOURCES: Database["leadSources"] = [
  "LinkedIn",
  "Google",
  "Facebook",
  "Instagram",
  "Website",
  "Referral",
  "Existing Contact",
  "Manual Research",
  "Other",
].map((name) => ({ id: `ls_${name.toLowerCase().replace(/\s+/g, "_")}`, name, active: true }));

const INDUSTRIES = [
  "Hospitality",
  "Retail",
  "Healthcare",
  "Logistics",
  "Education",
  "Manufacturing",
  "Real Estate",
  "Finance",
  "Construction",
  "Travel",
  "Automotive",
  "Professional Services",
];

const LOCATIONS = [
  "Colombo",
  "Kandy",
  "Galle",
  "Negombo",
  "Jaffna",
  "Kurunegala",
  "Matara",
  "Dubai, UAE",
  "Melbourne, AU",
  "London, UK",
];

const COMPANIES: Array<[string, string, string]> = [
  ["ABC Restaurant", "John Perera", "Owner"],
  ["Ceylon Spice Exports", "Nuwan Jayasuriya", "Managing Director"],
  ["Lanka Auto Care", "Rasika Silva", "General Manager"],
  ["Blue Ocean Resorts", "Tharindu Weerasinghe", "Operations Head"],
  ["Sunrise Dental Clinic", "Dr. Nadeesha Kumari", "Founder"],
  ["MetroMart Supermarkets", "Ishara Fernando", "Head of Marketing"],
  ["Skyline Logistics", "Chamith Bandara", "Director"],
  ["GreenLeaf Organics", "Dilani Rathnayake", "Co-Founder"],
  ["Pinnacle Realty", "Suresh Gunasekara", "Sales Director"],
  ["EduSmart Institute", "Malsha Dias", "Academic Director"],
  ["Coastal Tours Lanka", "Ravindu Perera", "Owner"],
  ["Titan Fitness Club", "Ahamed Rizwan", "Manager"],
  ["Silverline Apparels", "Kumari Wickrama", "Production Head"],
  ["NextGen Pharmacy", "Dr. Janith Alwis", "Owner"],
  ["UrbanBrew Coffee", "Senuri Amarasinghe", "Founder"],
  ["Apex Construction", "Mohan Ratnayake", "Project Director"],
  ["Harbour Seafoods", "Nimal Karunaratne", "Managing Partner"],
  ["BrightPath Consulting", "Dinesh Abeywardena", "Principal Consultant"],
  ["Velora Beauty Studio", "Hasini Perera", "Owner"],
  ["CloudNine Travels", "Roshan De Silva", "CEO"],
  ["IronGate Security", "Buddhika Senanayake", "Operations Manager"],
  ["Lotus Event Planners", "Shanika Fonseka", "Creative Director"],
  ["PrimeCare Hospitals", "Dr. Anura Jayawardena", "Head of Digital"],
  ["Elite Motors", "Farhan Nazeer", "Sales Manager"],
  ["Nimbus Software Labs", "Tharaka Ekanayake", "CTO"],
  ["Golden Grain Bakery", "Sithara Herath", "Owner"],
  ["Arcadia Interiors", "Piyumi Wijesinghe", "Design Lead"],
  ["SwiftPay Solutions", "Lahiru Madushanka", "Product Owner"],
  ["Emerald Tea Estates", "Bandula Gunawardena", "Estate Manager"],
  ["Nova Print House", "Kavindu Rajapaksa", "Operations Lead"],
  ["Riverstone Apartments", "Chathuri Liyanage", "Leasing Manager"],
  ["QuickFix IT Services", "Sahan Wijeratne", "Director"],
];

/** Deliberate near-duplicates so duplicate detection can be demonstrated. */
const DUPLICATES: Array<[string, string, string, number]> = [
  ["ABC Restaurant (Pvt) Ltd", "J. Perera", "Director", 0],
  ["Skyline Logistics Lanka", "Chamith B.", "Director", 6],
  ["Elite Motors Colombo", "Farhan N.", "Sales Manager", 23],
];

function slugDomain(company: string) {
  return company
    .toLowerCase()
    .replace(/\(pvt\)|ltd|lanka|colombo/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 16);
}

const STATUS_BY_LEVEL: OutreachStatus[] = [
  "Sent",
  "Replied",
  "Qualified",
  "Meeting Booked",
  "Proposal Sent",
  "Negotiation",
  "Closed",
];

export function buildSeedDatabase(): Database {
  const prospects: Prospect[] = [];
  const opportunities: Opportunity[] = [];
  const outreach: Outreach[] = [];
  const activities: Activity[] = [];
  const followUps: FollowUp[] = [];
  const meetings: Meeting[] = [];
  const proposals: Proposal[] = [];
  const deals: Deal[] = [];
  const notifications: Notification[] = [];

  let n = 0;
  const nid = (p: string) => `${p}_${(++n).toString(36)}${Math.floor(rnd() * 46656).toString(36)}`;

  const entries: Array<{
    company: string;
    contact: string;
    title: string;
    dupeOf?: number;
  }> = COMPANIES.map(([company, contact, title]) => ({ company, contact, title }));
  DUPLICATES.forEach(([company, contact, title, dupeOf]) =>
    entries.push({ company, contact, title, dupeOf }),
  );

  entries.forEach((entry, index) => {
    const base = entry.dupeOf !== undefined ? COMPANIES[entry.dupeOf]![0]! : entry.company;
    const domain = `${slugDomain(base)}.lk`;
    const ownerId = SALES_USER_IDS[index % SALES_USER_IDS.length]!;
    const createdOffset = -int(20, 95);
    const phone = `+94 7${int(1, 7)} ${int(100, 999)} ${int(1000, 9999)}`;
    const prospect: Prospect = {
      id: `pro_${index + 1}`,
      company: entry.company,
      contactPerson: entry.contact,
      jobTitle: entry.title,
      email: `${entry.contact
        .split(" ")[0]!
        .toLowerCase()
        .replace(/[^a-z]/g, "")}@${domain}`,
      phone: entry.dupeOf !== undefined ? prospects[entry.dupeOf]!.phone : phone,
      website: `https://www.${domain}`,
      linkedinUrl: `https://linkedin.com/company/${slugDomain(base)}`,
      facebookUrl: rnd() > 0.4 ? `https://facebook.com/${slugDomain(base)}` : "",
      instagramUrl: rnd() > 0.6 ? `https://instagram.com/${slugDomain(base)}` : "",
      googleBusinessUrl: rnd() > 0.7 ? `https://g.page/${slugDomain(base)}` : "",
      otherUrl: "",
      industry: pick(INDUSTRIES),
      location: pick(LOCATIONS),
      notes:
        entry.dupeOf !== undefined
          ? "Imported from a second research sheet — likely a duplicate entry."
          : "",
      ownerId,
      leadSourceId: pick(LEAD_SOURCES).id,
      createdAt: at(createdOffset, 10, int(0, 59)),
    };
    prospects.push(prospect);

    activities.push({
      id: nid("act"),
      prospectId: prospect.id,
      userId: ownerId,
      type: "prospect_created",
      description: `Prospect ${prospect.company} added to the pipeline`,
      occurredAt: prospect.createdAt,
    });

    const opCount = rnd() > 0.68 ? (rnd() > 0.8 ? 3 : 2) : 1;
    const usedServices = new Set<string>();

    for (let o = 0; o < opCount; o++) {
      let service = pick(SERVICE_TYPES);
      let guard = 0;
      while (usedServices.has(service.id) && guard++ < 10) service = pick(SERVICE_TYPES);
      usedServices.add(service.id);

      // Weighted progression: most prospects sit early in the funnel.
      const roll = rnd();
      let level: number;
      if (roll < 0.3) level = 0;
      else if (roll < 0.52) level = 1;
      else if (roll < 0.64) level = 2;
      else if (roll < 0.78) level = 3;
      else if (roll < 0.88) level = 4;
      else if (roll < 0.94) level = 5;
      else level = 6;

      const lost = level < 4 && rnd() < 0.22;
      const dealValue = int(3, 45) * 25000;
      const opId = `opp_${prospect.id}_${o + 1}`;
      let status: OutreachStatus = STATUS_BY_LEVEL[level]!;
      if (level === 3 && service.usesDiscoveryCall) status = "Discovery Call";
      if (lost) status = rnd() > 0.5 ? "Not Interested" : "No Response";

      const opportunity: Opportunity = {
        id: opId,
        prospectId: prospect.id,
        serviceTypeId: service.id,
        ownerId,
        status,
        dealValue,
        createdAt: prospect.createdAt,
      };
      opportunities.push(opportunity);

      const touches = Math.min(4, 1 + level + (rnd() > 0.6 ? 1 : 0));
      let day = createdOffset + int(0, 3);
      let lastOutreachId = "";
      for (let t = 0; t < touches; t++) {
        const type = pick(OUTREACH_TYPES);
        const hour = int(9, 17);
        const isLast = t === touches - 1;
        const replied = level >= 1 && t >= touches - 2;
        const rec: Outreach = {
          id: nid("out"),
          prospectId: prospect.id,
          opportunityId: opId,
          outreachTypeId: type.id,
          serviceTypeId: service.id,
          ownerId,
          occurredAt: at(day, hour, int(0, 59)),
          repliedAt: replied ? at(Math.min(day + int(0, 2), 0), hour + 1, int(0, 59)) : null,
          message: `${type.name} outreach about ${service.name} for ${prospect.company}.`,
          status: isLast ? status : t === 0 ? "Sent" : "Follow-up Required",
          followUpAt: null,
        };
        outreach.push(rec);
        lastOutreachId = rec.id;
        activities.push({
          id: nid("act"),
          prospectId: prospect.id,
          opportunityId: opId,
          userId: ownerId,
          type: "outreach_sent",
          description: `${type.name} outreach sent regarding ${service.name}`,
          occurredAt: rec.occurredAt,
        });
        if (rec.repliedAt) {
          activities.push({
            id: nid("act"),
            prospectId: prospect.id,
            opportunityId: opId,
            userId: ownerId,
            type: "reply_received",
            description: `Reply received via ${type.name}`,
            occurredAt: rec.repliedAt,
          });
        }
        day = Math.min(day + int(2, 8), -1);
      }

      if (level >= 3 && !lost) {
        const meetingDay = day + int(1, 6);
        const meetingType = service.usesDiscoveryCall
          ? "Discovery Call"
          : pick(["Sales Meeting", "Demo", "Consultation"] as const);
        const upcoming = meetingDay >= 0;
        const meeting: Meeting = {
          id: nid("mtg"),
          prospectId: prospect.id,
          opportunityId: opId,
          ownerId,
          type: meetingType,
          scheduledAt: at(Math.min(meetingDay, 6), int(9, 16), pick([0, 30])),
          status: upcoming
            ? "Scheduled"
            : level > 3
              ? "Completed"
              : pick(["Completed", "Rescheduled", "No Show"] as const),
          notes: `${meetingType} with ${prospect.contactPerson} covering ${service.name} scope.`,
          nextAction: level > 3 ? "Send proposal" : "Confirm requirements",
        };
        meetings.push(meeting);
        activities.push({
          id: nid("act"),
          prospectId: prospect.id,
          opportunityId: opId,
          userId: ownerId,
          type: "meeting_booked",
          description: `${meetingType} scheduled with ${prospect.contactPerson}`,
          occurredAt: meeting.scheduledAt,
        });
      }

      if (level >= 4 && !lost) {
        const propDay = Math.min(day + int(2, 8), -1);
        const proposal: Proposal = {
          id: nid("prp"),
          prospectId: prospect.id,
          opportunityId: opId,
          serviceTypeId: service.id,
          ownerId,
          sentAt: at(propDay, int(10, 17), int(0, 59)),
          amount: dealValue,
          status:
            level === 6
              ? "Accepted"
              : level === 5
                ? "Negotiation"
                : pick(["Sent", "Viewed"] as const),
          followUpAt: level === 6 ? null : at(int(-4, 7), 10, 0),
          notes: `${service.name} proposal for ${prospect.company}.`,
        };
        proposals.push(proposal);
        activities.push({
          id: nid("act"),
          prospectId: prospect.id,
          opportunityId: opId,
          userId: ownerId,
          type: "proposal_sent",
          description: `Proposal sent — LKR ${proposal.amount.toLocaleString()}`,
          occurredAt: proposal.sentAt,
        });
        if (level >= 5) {
          activities.push({
            id: nid("act"),
            prospectId: prospect.id,
            opportunityId: opId,
            userId: ownerId,
            type: "negotiation_started",
            description: "Negotiation started on pricing and timeline",
            occurredAt: at(Math.min(propDay + 3, -1), 11, 0),
          });
        }
      }

      if (level === 6 && !lost) {
        const closedAt = at(Math.min(day + int(5, 12), -1), int(10, 17), int(0, 59));
        deals.push({
          id: nid("del"),
          prospectId: prospect.id,
          opportunityId: opId,
          serviceTypeId: service.id,
          outreachTypeId: outreach[outreach.length - 1]!.outreachTypeId,
          ownerId,
          closedAt,
          value: dealValue,
          notes: `${service.name} project won for ${prospect.company}.`,
        });
        activities.push({
          id: nid("act"),
          prospectId: prospect.id,
          opportunityId: opId,
          userId: ownerId,
          type: "deal_closed",
          description: `Deal closed — LKR ${dealValue.toLocaleString()}`,
          occurredAt: closedAt,
        });
      }

      if (lost) {
        activities.push({
          id: nid("act"),
          prospectId: prospect.id,
          opportunityId: opId,
          userId: ownerId,
          type: "deal_lost",
          description: `Marked as ${status}`,
          occurredAt: at(Math.min(day + 2, -1), 12, 0),
        });
      }

      // Follow-ups spread across overdue / today / tomorrow / this week / later.
      if (!lost && level < 6 && rnd() > 0.25) {
        const bucket = rnd();
        const dueOffset =
          bucket < 0.22
            ? -int(1, 9)
            : bucket < 0.42
              ? 0
              : bucket < 0.58
                ? 1
                : bucket < 0.8
                  ? int(2, 5)
                  : int(6, 20);
        const fu: FollowUp = {
          id: nid("fup"),
          prospectId: prospect.id,
          opportunityId: opId,
          ownerId,
          dueAt: at(dueOffset, int(9, 16), pick([0, 30])),
          notes: `Follow up on ${service.name} conversation.`,
          status: "Pending",
        };
        followUps.push(fu);
        const rec = outreach.find((o2) => o2.id === lastOutreachId);
        if (rec) rec.followUpAt = fu.dueAt;
        activities.push({
          id: nid("act"),
          prospectId: prospect.id,
          opportunityId: opId,
          userId: ownerId,
          type: "followup_scheduled",
          description: "Follow-up scheduled",
          occurredAt: at(Math.min(day, -1), 15, 0),
        });
      }
      if (rnd() > 0.85) {
        followUps.push({
          id: nid("fup"),
          prospectId: prospect.id,
          opportunityId: opId,
          ownerId,
          dueAt: at(-int(10, 30), 10, 0),
          notes: "Initial check-in call.",
          status: "Completed",
          completedAt: at(-int(1, 9), 11, 0),
        });
      }
    }
  });

  const targets: Target[] = [];
  const weeklyAverageByMetric: Record<string, number> = {
    outreach: 110,
    replies: 12,
    meetings: 4,
    discoveryCalls: 2,
    proposals: 2,
    closed: 1,
  };
  SALES_USER_IDS.forEach((userId) => {
    SERVICE_TYPES.forEach((service) => {
      TARGET_METRICS.forEach((metric) => {
        const average = weeklyAverageByMetric[metric]!;
        targets.push({
          id: `tgt_${userId}_${service.id}_${metric}`,
          userId,
          serviceTypeId: service.id,
          metric,
          minimum: Math.round(average * 0.7),
          average,
          stretch: Math.round(average * 1.3),
          effectiveFrom: at(-60),
          updatedAt: at(-60),
        });
      });
    });
  });

  notifications.push(
    {
      id: "ntf_1",
      title: "Overdue follow-ups",
      body: "Several follow-ups have passed their due date.",
      kind: "followup",
      createdAt: at(0, 8, 5),
      read: false,
    },
    {
      id: "ntf_2",
      title: "Meeting tomorrow",
      body: "A discovery call is scheduled for tomorrow morning.",
      kind: "meeting",
      createdAt: at(0, 8, 10),
      read: false,
    },
    {
      id: "ntf_3",
      title: "Proposal needs follow-up",
      body: "A sent proposal has been waiting for a response.",
      kind: "proposal",
      createdAt: at(-1, 16, 40),
      read: false,
    },
    {
      id: "ntf_4",
      title: "New reply recorded",
      body: "A prospect replied to a LinkedIn outreach.",
      kind: "reply",
      createdAt: at(-1, 12, 0),
      read: true,
    },
  );

  // Make sure "today" looks like an active working day.
  const todayPlan = [
    ["usr_vihanga", 6],
    ["usr_kasun", 5],
    ["usr_daniel", 4],
    ["usr_amaya", 5],
  ] as const;
  todayPlan.forEach(([userId, count]) => {
    for (let i = 0; i < count; i++) {
      const opp = opportunities[int(0, opportunities.length - 1)]!;
      const type = pick(OUTREACH_TYPES);
      const rec: Outreach = {
        id: nid("out"),
        prospectId: opp.prospectId,
        opportunityId: opp.id,
        outreachTypeId: type.id,
        serviceTypeId: opp.serviceTypeId,
        ownerId: userId,
        occurredAt: at(0, int(8, 16), int(0, 59)),
        repliedAt: rnd() > 0.7 ? at(0, 17, int(0, 59)) : null,
        message: `${type.name} touch sent this morning.`,
        status: "Sent",
        followUpAt: null,
      };
      outreach.push(rec);
      activities.push({
        id: nid("act"),
        prospectId: opp.prospectId,
        opportunityId: opp.id,
        userId,
        type: "outreach_sent",
        description: `${type.name} outreach sent`,
        occurredAt: rec.occurredAt,
      });
    }
  });

  return {
    version: 1,
    users: USERS,
    outreachTypes: OUTREACH_TYPES,
    serviceTypes: SERVICE_TYPES,
    leadSources: LEAD_SOURCES,
    prospects,
    opportunities,
    outreach,
    activities,
    followUps,
    meetings,
    proposals,
    deals,
    targets,
    notifications,
    currentUserId: "usr_vihanga",
  };
}

export type { Activity, Deal, FollowUp, Meeting, Notification, Opportunity, Outreach, Proposal };
