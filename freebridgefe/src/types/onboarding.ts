// Enum Definitions
export type WorkType = 'PERSONAL' | 'TEAM';
export type WorkStyle = 'REMOTE' | 'ONSITE' | 'HYBRID'; // Added HYBRID as common option
export type EmployerSize =
    | 'S1_4'
    | 'S5_9'
    | 'S10_29'
    | 'S30_99'
    | 'S100_299'
    | 'S300_999'
    | 'S1000_PLUS';

export interface FreelancerProfile {
    // Step 1: Basic Info
    name: string;
    avatar_url?: string;
    introduction: string; // Bio
    job: string;
    career_years: number;
    hope_salary: number; // Monthly

    // Step 2: Work Conditions & Skills
    work_type: WorkType;
    start_date: Date | string;
    work_style: WorkStyle;
    location: string;
    freelancer_skills: string[]; // Skill names
}

export interface EmployerProfile {
    // Step 1: Basic Info
    company_name: string;
    email: string;
    phone: string;
    logo_url?: string;
    logo_file?: File | null;
    description: string;

    // Step 2: Details
    industry: string;
    size: EmployerSize;
    location: string;
    website?: string;
}
