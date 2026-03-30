import apiClient from "@/api/axiosInstance";

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

interface FreelancerProfileResponseDto {
  basicProfile: {
    avatarUrl: string | null;
    name: string | null;
    email?: string | null;
    phone?: string | null;
    job: string | null;
    introduction: string | null;
    grade: string | null;
    careerYears: number | null;
    wage: number | null;
    skills: string[] | null;
    status: string | null;
    workConditions?: {
      workType?: string | null;
      availableStartDate?: string | null;
      workStyle?: string | null;
      workLocation?: string | null;
    } | null;
    expertise?: {
      programming?: number | null;
      framework?: number | null;
      problemSolving?: number | null;
    } | null;
    collaboration?: {
      communication?: number | null;
      scheduleAdherence?: number | null;
      dispute?: number | null;
    } | null;
    averageRating?: number | null;
    portfolio?: {
      fileUrl?: string | null;
      fileName?: string | null;
      lastUpdated?: string | null;
    } | null;
    crmAlerts?: {
      isOnboardingNeeded?: boolean | null;
      isApplyEncouraged?: boolean | null;
      isPortfolioImproveNeeded?: boolean | null;
      isRateBumpEligible?: boolean | null;
      isBurnoutWarning?: boolean | null;
      isChurnWarning?: boolean | null;
    } | null;
  };
  stats: {
    statContact: number | null;
    statChat: number | null;
    statContract: number | null;
  };
}

export interface FreelancerProfileDashboard {
  name: string;
  grade: string;
  avatar: string | null;
  job: string;
  introduction: string;
  careerYears: number;
  salary: number;
  workConditions: {
    type: string;
    startDate: string;
    workStyle: string;
    location: string;
  };
  skills: string[];
  expertise: {
    programming: number;
    framework: number;
    problemSolving: number;
  };
  collaboration: {
    communication: number;
    scheduleAdherence: number;
    dispute: number;
  };
  averageRating: number;
  statPending: number;
  statContact: number;
  statChat: number;
  statContract: number;
  statInteresting: number;
  statCompleted: number;
  portfolio: {
    fileUrl: string | null;
    fileName: string;
    lastUpdated: string;
  };
  aiSummary?: {
    positivityScore: number;
    grade: string;
    strengths: string[];
    weaknesses: string[];
  };
  reviewSummary?: {
    averageRate: number;
    topPercentile: number;
    expertiseRate: number;
    communicationRate: number;
    scheduleRate: number;
  };
  crmAlerts?: {
    isOnboardingNeeded: boolean;
    isApplyEncouraged: boolean;
    isPortfolioImproveNeeded: boolean;
    isRateBumpEligible: boolean;
    isBurnoutWarning: boolean;
    isChurnWarning: boolean;
  };
  topPercentile?: number;
}

const WORK_TYPE_LABELS: Record<string, string> = {
  PERSONAL: "개인",
  TEAM: "팀",
};

const WORK_STYLE_LABELS: Record<string, string> = {
  REMOTE: "원격",
  ONSITE: "상주",
  HYBRID: "원격+상주 (하이브리드)",
};

const mapWorkTypeToLabel = (value?: string | null): string => {
  if (!value) return "";
  return WORK_TYPE_LABELS[value] ?? value;
};

const mapWorkStyleToLabel = (value?: string | null): string => {
  if (!value) return "";
  return WORK_STYLE_LABELS[value] ?? value;
};

const mapWorkTypeToCode = (value?: string | null): string | null => {
  if (!value) return null;
  const entry = Object.entries(WORK_TYPE_LABELS).find(([, label]) => label === value);
  return entry ? entry[0] : value;
};

const mapWorkStyleToCode = (value?: string | null): string | null => {
  if (!value) return null;
  const entry = Object.entries(WORK_STYLE_LABELS).find(([, label]) => label === value);
  return entry ? entry[0] : value;
};

const GUEST_FREELANCER_PROFILE: FreelancerProfileDashboard = {
  name: "Guest",
  grade: "basic",
  avatar: null,
  job: "Frontend Developer",
  introduction: "Guest profile for preview.",
  careerYears: 0,
  salary: 0,
  workConditions: {
    type: "Guest",
    startDate: "",
    workStyle: "",
    location: "",
  },
  skills: ["React", "Vue"],
  expertise: {
    programming: 0,
    framework: 0,
    problemSolving: 0,
  },
  collaboration: {
    communication: 0,
    scheduleAdherence: 0,
    dispute: 0,
  },
  averageRating: 0,
  statPending: 0,
  statContact: 0,
  statChat: 0,
  statContract: 0,
  statInteresting: 0,
  statCompleted: 0,
  portfolio: {
    fileUrl: null,
    fileName: "",
    lastUpdated: "",
  },
};

export const getFreelancerProfile = async (
  _userId: string,
): Promise<FreelancerProfileDashboard> => {
  if (_userId === "guest") {
    return {
      ...GUEST_FREELANCER_PROFILE,
      workConditions: { ...GUEST_FREELANCER_PROFILE.workConditions },
      skills: [...GUEST_FREELANCER_PROFILE.skills],
      expertise: { ...GUEST_FREELANCER_PROFILE.expertise },
      collaboration: { ...GUEST_FREELANCER_PROFILE.collaboration },
      portfolio: { ...GUEST_FREELANCER_PROFILE.portfolio },
    };
  }
  const response = await apiClient.get<ApiResponse<FreelancerProfileResponseDto>>(
    "/api/freelancer/mypage/profile",
  );
  if (!response.data.success || !response.data.data) {
    const message = response.data.message ?? "Unknown error";
    throw new Error(`getFreelancerProfile failed (/api/freelancer/mypage/profile): ${message}`);
  }
  const dto = response.data.data;
  const basic = dto?.basicProfile ?? {};
  const stats = dto?.stats ?? {};

  return {
    name: basic.name ?? "",
    grade: basic.grade ?? "",
    avatar: basic.avatarUrl ?? null,
    job: basic.job ?? "",
    introduction: basic.introduction ?? "",
    careerYears: basic.careerYears ?? 0,
    salary: basic.wage ?? 0,
    workConditions: {
      type: mapWorkTypeToLabel(basic.workConditions?.workType),
      startDate: basic.workConditions?.availableStartDate ?? "",
      workStyle: mapWorkStyleToLabel(basic.workConditions?.workStyle),
      location: basic.workConditions?.workLocation ?? "",
    },
    skills: basic.skills ?? [],
    expertise: {
      programming: basic.expertise?.programming ?? 0,
      framework: basic.expertise?.framework ?? 0,
      problemSolving: basic.expertise?.problemSolving ?? 0,
    },
    collaboration: {
      communication: basic.collaboration?.communication ?? 0,
      scheduleAdherence: basic.collaboration?.scheduleAdherence ?? 0,
      dispute: basic.collaboration?.dispute ?? 0,
    },
    averageRating: basic.averageRating ?? 0,
    statPending: 0,
    statContact: stats.statContact ?? 0,
    statChat: stats.statChat ?? 0,
    statContract: stats.statContract ?? 0,
    statInteresting: 0,
    statCompleted: 0,
    portfolio: {
      fileUrl: basic.portfolio?.fileUrl ?? null,
      fileName: basic.portfolio?.fileName ?? "",
      lastUpdated: basic.portfolio?.lastUpdated ?? "",
    },
    crmAlerts: {
      isOnboardingNeeded: basic.crmAlerts?.isOnboardingNeeded ?? false,
      isApplyEncouraged: basic.crmAlerts?.isApplyEncouraged ?? false,
      isPortfolioImproveNeeded: basic.crmAlerts?.isPortfolioImproveNeeded ?? false,
      isRateBumpEligible: basic.crmAlerts?.isRateBumpEligible ?? false,
      isBurnoutWarning: basic.crmAlerts?.isBurnoutWarning ?? false,
      isChurnWarning: basic.crmAlerts?.isChurnWarning ?? false,
    },
  };
};

export const updateFreelancerProfile = async (
  _userId: string,
  updatedProfile: Partial<FreelancerProfileDashboard>,
): Promise<FreelancerProfileDashboard> => {
  const payload: Record<string, unknown> = {};

  if (updatedProfile.name !== undefined) payload.name = updatedProfile.name;
  if (updatedProfile.job !== undefined) payload.job = updatedProfile.job;
  if (updatedProfile.introduction !== undefined) payload.introduction = updatedProfile.introduction;
  if (updatedProfile.careerYears !== undefined) payload.careerYears = updatedProfile.careerYears;
  if (updatedProfile.salary !== undefined) payload.wage = updatedProfile.salary;
  if (updatedProfile.skills !== undefined) payload.skills = updatedProfile.skills;
  if (updatedProfile.averageRating !== undefined) {
    payload.averageRating = updatedProfile.averageRating;
  }

  if (updatedProfile.workConditions) {
    if (updatedProfile.workConditions.type !== undefined) {
      const workType = mapWorkTypeToCode(updatedProfile.workConditions.type?.trim()) ?? null;
      payload.workType = workType;
    }
    if (updatedProfile.workConditions.startDate !== undefined) {
      const availableStartDate = updatedProfile.workConditions.startDate?.trim() || null;
      payload.availableStartDate = availableStartDate;
    }
    if (updatedProfile.workConditions.workStyle !== undefined) {
      const workStyle = mapWorkStyleToCode(updatedProfile.workConditions.workStyle?.trim()) ?? null;
      payload.workStyle = workStyle;
    }
    if (updatedProfile.workConditions.location !== undefined) {
      const workLocation = updatedProfile.workConditions.location?.trim() || null;
      payload.workLocation = workLocation;
    }
  }

  if (updatedProfile.expertise) {
    if (updatedProfile.expertise.programming !== undefined) {
      payload.expertiseProgramming = updatedProfile.expertise.programming;
    }
    if (updatedProfile.expertise.framework !== undefined) {
      payload.expertiseFramework = updatedProfile.expertise.framework;
    }
    if (updatedProfile.expertise.problemSolving !== undefined) {
      payload.expertiseProblemSolving = updatedProfile.expertise.problemSolving;
    }
  }

  if (updatedProfile.collaboration) {
    if (updatedProfile.collaboration.communication !== undefined) {
      payload.collaborationCommunication = updatedProfile.collaboration.communication;
    }
    if (updatedProfile.collaboration.scheduleAdherence !== undefined) {
      payload.collaborationScheduleAdherence = updatedProfile.collaboration.scheduleAdherence;
    }
    if (updatedProfile.collaboration.dispute !== undefined) {
      payload.collaborationDispute = updatedProfile.collaboration.dispute;
    }
  }

  const updateResponse = await apiClient.put<ApiResponse<null>>(
    "/api/freelancer/mypage/profile",
    payload,
  );
  if (!updateResponse.data.success) {
    const message = updateResponse.data.message ?? "Unknown error";
    throw new Error(`updateFreelancerProfile failed (/api/freelancer/mypage/profile): ${message}`);
  }

  const refreshed = await getFreelancerProfile("me");
  return {
    ...refreshed,
    avatar: updatedProfile.avatar ?? refreshed.avatar,
    workConditions: updatedProfile.workConditions ?? refreshed.workConditions,
    portfolio: updatedProfile.portfolio ?? refreshed.portfolio,
  };
};

export const uploadFreelancerAvatar = async (file: File): Promise<string> => {
  const form = new FormData();
  form.append("file", file);
  const response = await apiClient.post<ApiResponse<string>>(
    "/api/freelancer/mypage/profile/avatar",
    form,
  );
  if (!response.data.success || !response.data.data) {
    const message = response.data.message ?? "Unknown error";
    throw new Error(`uploadFreelancerAvatar failed (/api/freelancer/mypage/profile/avatar): ${message}`);
  }
  return response.data.data;
};

export const uploadFreelancerPortfolio = async (
  file: File,
): Promise<FreelancerProfileDashboard["portfolio"]> => {
  const form = new FormData();
  form.append("file", file);
  const response = await apiClient.post<
    ApiResponse<{ fileUrl: string | null; fileName: string | null; lastUpdated: string | null }>
  >("/api/freelancer/mypage/portfolio", form);

  if (!response.data.success || !response.data.data) {
    const message = response.data.message ?? "Unknown error";
    throw new Error(`uploadFreelancerPortfolio failed (/api/freelancer/mypage/portfolio): ${message}`);
  }
  const { fileUrl, fileName, lastUpdated } = response.data.data;
  if (!fileUrl || !fileName || !lastUpdated) {
    throw new Error("uploadFreelancerPortfolio failed: missing portfolio fields");
  }
  return {
    fileUrl,
    fileName,
    lastUpdated,
  };
};

export const getFreelancerPortfolioDownloadUrl = async (): Promise<string> => {
  const response = await apiClient.get<ApiResponse<string>>("/api/freelancer/mypage/portfolio/download");
  if (!response.data.success || !response.data.data) {
    const message = response.data.message ?? "Unknown error";
    throw new Error(`getFreelancerPortfolioDownloadUrl failed (/api/freelancer/mypage/portfolio/download): ${message}`);
  }
  return response.data.data;
};

export const deleteFreelancerPortfolio = async (): Promise<void> => {
  const response = await apiClient.delete<ApiResponse<null>>("/api/freelancer/mypage/portfolio");
  if (!response.data.success) {
    const message = response.data.message ?? "Unknown error";
    throw new Error(`deleteFreelancerPortfolio failed (/api/freelancer/mypage/portfolio): ${message}`);
  }
};

export const downloadFreelancerPortfolioTemplate = async (): Promise<{ blob: Blob; fileName: string }> => {
  const response = await apiClient.get("/api/freelancer/mypage/portfolio/template", {
    responseType: "blob",
  });
  const contentDisposition = response.headers["content-disposition"] as string | undefined;
  const contentType = response.headers["content-type"] as string | undefined;
  const utf8Match = contentDisposition?.match(/filename\*=UTF-8''([^;]+)/i);
  const basicMatch = contentDisposition?.match(/filename=\"?([^\";]+)\"?/i);
  const fallbackFileName = contentType?.includes(
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  )
    ? "freelancer-portfolio-template.docx"
    : "freelancer-portfolio-template.pdf";
  const fileName = utf8Match
    ? decodeURIComponent(utf8Match[1])
    : basicMatch?.[1] ?? fallbackFileName;

  return {
    blob: response.data as Blob,
    fileName,
  };
};
