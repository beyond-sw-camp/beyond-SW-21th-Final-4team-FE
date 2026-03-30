export type UserRole = "EMPLOYER" | "FREELANCER";

export type JobStatus = "OPEN" | "IN_PROGRESS" | "CONTRACTED" | "CLOSED";

export type ApplicationStatus = "PENDING" | "ACCEPTED" | "REJECTED";

import type { EmployerProfile, FreelancerProfile } from "./onboarding";

export interface User {
  id: string | number;
  role: UserRole;
  name: string;
  email: string;
  password?: string;
  avatar?: string;
  createdAt?: string | Date;
  agreedToTermsAt?: string | Date;
  isEmailVerified?: boolean;
  phone?: string;
  termsAgreed?: boolean;
  privacyAgreed?: boolean;

  // Profiles (Additive for Onboarding)
  employerProfile?: EmployerProfile;
  freelancerProfile?: FreelancerProfile;

  // Legacy/Existing fields (Keep for compatibility)
  // Freelancer specific
  skills?: string[];
  monthlySalary?: number;
  experience?: number; // years
  portfolio?: string;
  bio?: string;
  // Employer specific
  companyName?: string;
  companySize?: string;
  companyAddress?: string;
  representativeName?: string;
  portfolioItems?: PortfolioItem[];
  employerReputationAi?: {
    aiSummary: string;
    positiveKeywords: string[];
    negativeKeywords: string[];
  };
}

export interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  projectUrl?: string;
  skills: string[];
  createdAt: Date;
}

export interface JobPosting {
  id: string;
  employerId: string;
  employerName: string;
  title: string;
  description: string;
  techStack: string[];
  budget: number;
  duration: number; // months
  status: JobStatus;
  createdAt: Date;
  updatedAt: Date;
  headcount?: number;
  matchedHeadcount?: number;
  favorite?: boolean;
}

export interface Application {
  id: string;
  jobId: string;
  freelancerId: string;
  freelancerName: string;
  message: string;
  portfolioUrl?: string;
  resumeUrl?: string;
  status: ApplicationStatus;
  rejectionReason?: string;
  createdAt: Date;
}

export interface Proposal {
  id: string;
  employerId: string;
  employerName: string;
  freelancerId: string;
  freelancerName: string;
  jobId?: string;
  message: string;
  status: ApplicationStatus;
  rejectionReason?: string;
  createdAt: Date;
}

export interface RejectionReason {
  type: "SKILL_MISMATCH" | "LACK_EXPERIENCE" | "SCHEDULE_MISMATCH" | "OTHER";
  customReason?: string;
}

export type MessageType =
  | "TEXT"
  | "IMAGE"
  | "FILE"
  | "SYSTEM"
  | "CONTRACT_ALERT";

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string; // 'SYSTEM' or userId
  content: string;
  type: MessageType;
  metadata?: any; // e.g., { contractId: 1001, status: 'SIGNED' }
  createdAt: Date;
  readBy: string[];
}

export interface ChatRoom {
  id: string;
  participants: string[]; // [EmployerId, FreelancerId] e.g. ['e1', 'f1']
  participantNames: { [userId: string]: string }; // Cached names
  lastMessage?: ChatMessage;
  unreadCount: { [userId: string]: number };
  participantPresence?: { [userId: string]: boolean };
  relatedJobId?: string;
  relatedApplicationId?: string;
  relatedProposalId?: string;
  contractId?: number; // Linked contract ID if exists
  leftBy?: string[]; // Users who left the room
  createdAt: Date;
  updatedAt: Date;
}
