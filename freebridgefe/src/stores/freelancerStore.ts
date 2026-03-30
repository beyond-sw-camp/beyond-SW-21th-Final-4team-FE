import { defineStore } from "pinia";
import { ref } from "vue";
import {
  getFreelancerRecommendations,
  type AiRecommendationResponseDTO,
} from "@/api/recommendationApi";
import {
  acceptFreelancerProposal,
  createEmployerProposal,
  getEmployerProposals,
  getFreelancerProposals,
  rejectFreelancerProposal,
  type ProposalResponseDto,
} from "@/api/proposalApi";
import { getUserById } from "@/api/authApi";
import type { User, Proposal } from "@/types";
import { useAuthStore } from "@/stores/authStore";
import { useChatStore } from "@/stores/chatStore";
import { useJobStore } from "@/stores/jobStore";

const toNumericId = (value: string | number, label: string): number => {
  const raw = String(value);
  if (!/^\d+$/.test(raw)) {
    throw new Error(`${label} ID가 올바르지 않습니다.`);
  }
  return Number(raw);
};

const getProposalErrorMessage = (error: unknown): string => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const err = error as any;
    if (typeof err.response?.data?.error?.message === "string") {
      return err.response.data.error.message;
    }
    if (typeof err.response?.data?.message === "string") {
      return err.response.data.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "제안 정보를 처리하지 못했습니다.";
};

const isCanceledRecommendationError = (error: unknown): boolean => {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const maybeError = error as { name?: string; code?: string };
  return (
    maybeError.name === "CanceledError" ||
    maybeError.name === "AbortError" ||
    maybeError.code === "ERR_CANCELED"
  );
};

export type RecommendedFreelancer = User & {
  matchScore?: number;
  jobTitle?: string;
};

export const useFreelancerStore = defineStore("freelancer", () => {
  const freelancers = ref<RecommendedFreelancer[]>([]);
  const authStore = useAuthStore();
  const recommendedFetchError = ref<string | null>(null);
  const isFetchingRecommended = ref(false);
  const proposals = ref<Proposal[]>([]);
  const isFetchingProposals = ref(false);
  const proposalFetchError = ref<string | null>(null);
  const userNameCache: Record<string, string> = {};

  async function fetchRecommendedFreelancers(
    jobId: number | string,
    signal?: AbortSignal,
  ) {
    isFetchingRecommended.value = true;
    recommendedFetchError.value = null;
    console.info("[employer-reco] request", {
      jobId: String(jobId),
    });

    try {
      const recommendations = await getFreelancerRecommendations(jobId, signal);
      console.info("[employer-reco] response", {
        jobId: String(jobId),
        count: recommendations.length,
        ids: recommendations.map((rec) => rec.id),
      });
      freelancers.value = recommendations.map(
        (rec: AiRecommendationResponseDTO) => ({
          id: String(rec.id),
          role: "FREELANCER",
          name: rec.nameOrTitle?.trim() || `프리랜서 #${rec.id}`,
          email: "hidden@example.com",
          matchScore: rec.matchScore,
          skills: rec.skills?.filter(Boolean) ?? [],
          bio: rec.description?.trim() || undefined,
        }),
      ) as RecommendedFreelancer[];
    } catch (error: any) {
      if (isCanceledRecommendationError(error)) {
        console.debug("[employer-reco] canceled", {
          jobId: String(jobId),
        });
        return;
      }

      console.error("Failed to fetch recommended freelancers:", error);
      console.error("[employer-reco] failed", {
        jobId: String(jobId),
        message: error?.message,
      });
      freelancers.value = [];
      recommendedFetchError.value =
        error.message || "프리랜서 추천 목록을 불러오는데 실패했습니다.";
    } finally {
      isFetchingRecommended.value = false;
    }
  }

  const getCurrentEmployerName = () =>
    authStore.user?.companyName || authStore.user?.name || "고용주";

  const getCurrentFreelancerName = () => authStore.user?.name || "프리랜서";

  async function resolveUserNames(userIds: string[]): Promise<Record<string, string>> {
    const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
    const missingIds = uniqueIds.filter((id) => !userNameCache[id]);

    await Promise.all(
      missingIds.map(async (id) => {
        try {
          const user = await getUserById(Number(id));
          userNameCache[id] = user?.name || "";
        } catch {
          userNameCache[id] = "";
        }
      }),
    );

    return uniqueIds.reduce<Record<string, string>>((acc, id) => {
      if (userNameCache[id]) {
        acc[id] = userNameCache[id];
      }
      return acc;
    }, {});
  }

  function mapProposal(dto: ProposalResponseDto, names: Record<string, string>): Proposal {
    const jobStore = useJobStore();
    const jobId = dto.jobPostingId === null ? undefined : String(dto.jobPostingId);
    const job = jobId ? jobStore.getJobById(jobId) : undefined;
    const currentUserId = String(authStore.user?.id ?? "");

    const employerName =
      String(dto.employerId) === currentUserId && authStore.user?.role === "EMPLOYER"
        ? getCurrentEmployerName()
        : job?.employerName || names[String(dto.employerId)] || `고용주 #${dto.employerId}`;

    const freelancerName =
      String(dto.freelancerId) === currentUserId && authStore.user?.role === "FREELANCER"
        ? getCurrentFreelancerName()
        : names[String(dto.freelancerId)] || `프리랜서 #${dto.freelancerId}`;

    return {
      id: String(dto.proposalId),
      employerId: String(dto.employerId),
      employerName,
      freelancerId: String(dto.freelancerId),
      freelancerName,
      jobId,
      message: dto.message,
      status: dto.status,
      createdAt: new Date(dto.createdAt),
    };
  }

  async function hydrateProposals(items: ProposalResponseDto[]): Promise<Proposal[]> {
    const ids = items.flatMap((item) => [
      String(item.employerId),
      String(item.freelancerId),
    ]);
    const names = await resolveUserNames(ids);
    return items.map((item) => mapProposal(item, names));
  }

  async function fetchEmployerProposalList(page = 0, size = 100) {
    if (!authStore.user || authStore.user.role !== "EMPLOYER") {
      proposals.value = [];
      return;
    }

    isFetchingProposals.value = true;
    proposalFetchError.value = null;

    try {
      const response = await getEmployerProposals(page, size);
      proposals.value = await hydrateProposals(response.content ?? []);
      return response;
    } catch (error) {
      proposals.value = [];
      proposalFetchError.value = getProposalErrorMessage(error);
      throw error;
    } finally {
      isFetchingProposals.value = false;
    }
  }

  async function fetchFreelancerProposalList(page = 0, size = 100) {
    if (!authStore.user || authStore.user.role !== "FREELANCER") {
      proposals.value = [];
      return;
    }

    isFetchingProposals.value = true;
    proposalFetchError.value = null;

    try {
      const response = await getFreelancerProposals(page, size);
      proposals.value = await hydrateProposals(response.content ?? []);
      return response;
    } catch (error) {
      proposals.value = [];
      proposalFetchError.value = getProposalErrorMessage(error);
      throw error;
    } finally {
      isFetchingProposals.value = false;
    }
  }

  async function addProposal(
    proposal: Omit<Proposal, "id" | "createdAt">,
  ): Promise<Proposal> {
    if (!authStore.user || authStore.user.role !== "EMPLOYER") {
      throw new Error("고용주만 제안을 보낼 수 있습니다.");
    }

    const result = await createEmployerProposal({
      jobPostingId: toNumericId(proposal.jobId || "", "공고"),
      freelancerId: toNumericId(proposal.freelancerId, "프리랜서"),
      message: proposal.message,
    });

    const newProposal: Proposal = {
      ...proposal,
      id: String(result.proposalId),
      createdAt: new Date(),
    };

    proposals.value = [
      newProposal,
      ...proposals.value.filter((item) => item.id !== newProposal.id),
    ];

    return newProposal;
  }

  function getProposalsByFreelancer(freelancerId: string) {
    return proposals.value.filter(
      (p: Proposal) => p.freelancerId === freelancerId,
    );
  }

  async function updateProposalStatus(
    proposalId: string,
    status: Proposal["status"],
    rejectionReason?: string,
  ): Promise<string | boolean | null> {
    const index = proposals.value.findIndex(
      (p: Proposal) => p.id === proposalId,
    );
    if (index === -1) return null;

    if (status === "ACCEPTED") {
      await acceptFreelancerProposal(toNumericId(proposalId, "제안"));
    } else if (status === "REJECTED") {
      await rejectFreelancerProposal(toNumericId(proposalId, "제안"));
    }

    const proposal = proposals.value[index];

    proposals.value[index] = {
      ...proposal,
      status,
      rejectionReason: status === "REJECTED" ? rejectionReason : undefined,
    };

    if (status === "ACCEPTED") {
      const chatStore = useChatStore();
      const rawEmployerId = String(proposals.value[index].employerId);
      const rawFreelancerId = String(proposals.value[index].freelancerId);
      const employerId = rawEmployerId.startsWith("e") ? rawEmployerId : `e${rawEmployerId}`;
      const freelancerId = rawFreelancerId.startsWith("f") ? rawFreelancerId : `f${rawFreelancerId}`;
      const jobId = proposals.value[index].jobId; // Capture possibly undefined jobId

      const context: any = {
        relatedProposalId: proposalId,
      };
      if (jobId) {
        context.relatedJobId = jobId;
      }

      const roomId = await chatStore
        .createRoom(
          [employerId, freelancerId],
          {
            [employerId]: proposals.value[index].employerName || "Employer",
            [freelancerId]: proposals.value[index].freelancerName || "Freelancer",
          },
          context,
        )
        .catch((e) => {
          console.error("Failed to create room:", e);
          return null;
        });

      if (roomId) {
        chatStore.selectRoom(roomId);
        return roomId;
      }
      return null;
    }

    return true;
  }

  return {
    freelancers,
    recommendedFetchError,
    isFetchingRecommended,
    fetchRecommendedFreelancers,
    isFetchingProposals,
    proposalFetchError,
    proposals,
    fetchEmployerProposals: fetchEmployerProposalList,
    fetchFreelancerProposals: fetchFreelancerProposalList,
    addProposal,
    getProposalsByFreelancer,
    updateProposalStatus,
  };
});
