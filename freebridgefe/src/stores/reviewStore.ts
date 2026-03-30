import { defineStore } from 'pinia';
import { ref } from 'vue';
import { getUserById } from '@/api/authApi';
import { getContract, listContracts, type ContractSummaryDto } from '@/api/contractApi';
import { getEmployerProjects as getEmployerMypageProjects } from '@/api/MyPage/projectApi';
import {
  createEmployerReview,
  createFreelancerReview,
  deleteEmployerReview,
  deleteFreelancerReview,
  getEmployerReceivedReviews,
  getEmployerReviewProjects,
  getEmployerWrittenReviews,
  getFreelancerMypageProjects,
  getFreelancerReceivedReviews,
  getFreelancerWrittenReviews,
  updateEmployerReview,
  updateFreelancerReview,
  type EmployerProjectReviewDto,
  type EmployerReviewCreatePayload,
  type EmployerReviewResponseDto,
  type EmployerReviewUpdatePayload,
  type FreelancerReviewCreatePayload,
  type FreelancerReviewResponseDto,
  type FreelancerReviewUpdatePayload,
} from '@/api/reviewApi';
import { useAuthStore } from '@/stores/authStore';

export interface FreelancerToEmployerReview {
  id: string;
  projectId?: string | number;
  freelancerId?: string | number;
  employerId?: string | number;
  freelancerName: string;
  companyName: string;
  projectName: string;
  atmosphere: number;
  requirementDetail: number;
  schedule: number;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface EmployerToFreelancerReview {
  id: string;
  projectId?: string | number;
  employerId?: string | number;
  employerName: string;
  freelancerId?: string | number;
  freelancerName: string;
  projectName: string;
  language: number;
  framework: number;
  debugging: number;
  communication: number;
  schedule: number;
  dispute: number;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface ReviewWriteTarget {
  key: string;
  projectId: string;
  counterpartyId: string;
  projectName: string;
  counterpartyName: string;
}

const EMPTY_CONTRACT_LIST = {
  items: [] as ContractSummaryDto[],
  pagination: {
    page: 1,
    limit: 100,
    total: 0,
    totalPages: 0,
  },
};

const average = (scores: number[]) => {
  const validScores = scores.filter((score) => Number.isFinite(score));
  if (validScores.length === 0) {
    return 0;
  }

  const sum = validScores.reduce((acc, value) => acc + value, 0);
  return Number((sum / validScores.length).toFixed(1));
};

const toStringId = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value);
};

const toNumericId = (value: string | number, label: string) => {
  const raw = String(value);
  if (!/^\d+$/.test(raw)) {
    throw new Error(`${label} ID가 올바르지 않습니다.`);
  }

  return Number(raw);
};

const getProjectFallbackLabel = (projectId: string | number | null | undefined) =>
  projectId === null || projectId === undefined || projectId === ''
    ? '프로젝트 정보 없음'
    : `프로젝트 #${projectId}`;

const getReviewErrorMessage = (error: unknown, fallback: string) => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as any).response?.data?.message === 'string'
  ) {
    return (error as any).response.data.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

const buildLookup = <T>(
  items: T[],
  getKey: (item: T) => string | number | null | undefined,
  getValue: (item: T) => string | null | undefined,
) =>
  items.reduce<Record<string, string>>((acc, item) => {
    const key = getKey(item);
    const value = getValue(item);

    if (key !== null && key !== undefined && value) {
      acc[String(key)] = value;
    }

    return acc;
  }, {});

const resolveProjectName = (
  projectId: string | number | null | undefined,
  ...maps: Array<Record<string, string>>
) => {
  const key = toStringId(projectId);

  for (const map of maps) {
    if (key && map[key]) {
      return map[key];
    }
  }

  return getProjectFallbackLabel(projectId);
};

export const useReviewStore = defineStore('review', () => {
  const authStore = useAuthStore();

  const freelancerToEmployerReviews = ref<FreelancerToEmployerReview[]>([]);
  const employerToFreelancerReviews = ref<EmployerToFreelancerReview[]>([]);
  const employerReviewTargets = ref<ReviewWriteTarget[]>([]);
  const freelancerReviewTargets = ref<ReviewWriteTarget[]>([]);

  const isFetchingReviews = ref(false);
  const reviewFetchError = ref<string | null>(null);
  const isFetchingReviewTargets = ref(false);
  const reviewTargetFetchError = ref<string | null>(null);
  const isSubmittingReview = ref(false);

  const userDisplayNameCache: Record<string, string> = {};

  const getCurrentEmployerName = () =>
    authStore.user?.companyName || authStore.user?.name || '고용주';

  const getCurrentFreelancerName = () => authStore.user?.name || '프리랜서';

  const getUserDisplayName = (user: any) => user?.companyName || user?.name || '';

  async function resolveUserDisplayNames(
    userIds: Array<string | number | null | undefined>,
  ): Promise<Record<string, string>> {
    const uniqueIds = Array.from(
      new Set(
        userIds
          .map((value) => toStringId(value))
          .filter((value) => value.length > 0),
      ),
    );

    const missingIds = uniqueIds.filter((id) => !userDisplayNameCache[id]);

    await Promise.all(
      missingIds.map(async (id) => {
        try {
          const user = await getUserById(Number(id));
          userDisplayNameCache[id] = getUserDisplayName(user) || '';
        } catch {
          userDisplayNameCache[id] = '';
        }
      }),
    );

    return uniqueIds.reduce<Record<string, string>>((acc, id) => {
      if (userDisplayNameCache[id]) {
        acc[id] = userDisplayNameCache[id];
      }
      return acc;
    }, {});
  }

  async function safeListContracts(status?: string[]) {
    try {
      return await listContracts({ status, page: 1, limit: 100 });
    } catch {
      return EMPTY_CONTRACT_LIST;
    }
  }

  async function safeEmployerMypageProjects() {
    try {
      return await getEmployerMypageProjects();
    } catch {
      return [];
    }
  }

  async function safeFreelancerMypageProjects() {
    try {
      return await getFreelancerMypageProjects();
    } catch {
      return [];
    }
  }

  async function safeEmployerProjectSearches() {
    try {
      return await getEmployerReviewProjects(0, 100);
    } catch {
      return {
        content: [] as EmployerProjectReviewDto[],
        page: 0,
        size: 100,
        totalElements: 0,
        totalPages: 0,
      };
    }
  }

  function mapEmployerReview(
    review: EmployerReviewResponseDto,
    employerNames: Record<string, string>,
    freelancerNames: Record<string, string>,
    projectNames: Record<string, string>,
  ): EmployerToFreelancerReview {
    return {
      id: String(review.id),
      projectId: String(review.projectId),
      employerId: String(review.employerId),
      employerName:
        authStore.user?.role === 'EMPLOYER' &&
        String(review.employerId) === toStringId(authStore.user?.id)
          ? getCurrentEmployerName()
          : employerNames[String(review.employerId)] || `기업 #${review.employerId}`,
      freelancerId: String(review.freelancerId),
      freelancerName:
        freelancerNames[String(review.freelancerId)] || `프리랜서 #${review.freelancerId}`,
      projectName: resolveProjectName(review.projectId, projectNames),
      language: review.language ?? 0,
      framework: review.framework ?? 0,
      debugging: review.debugging ?? 0,
      communication: review.communication ?? 0,
      schedule: review.schedule ?? 0,
      dispute: review.dispute ?? 0,
      rating: average([
        review.language ?? 0,
        review.framework ?? 0,
        review.debugging ?? 0,
        review.communication ?? 0,
        review.schedule ?? 0,
        review.dispute ?? 0,
      ]),
      comment: review.description ?? '',
      createdAt: review.createdAt,
    };
  }

  function mapFreelancerReview(
    review: FreelancerReviewResponseDto,
    freelancerNames: Record<string, string>,
    employerNames: Record<string, string>,
    projectNames: Record<string, string>,
  ): FreelancerToEmployerReview {
    return {
      id: String(review.id),
      projectId: String(review.projectId),
      freelancerId: String(review.freelancerId),
      employerId: String(review.employerId),
      freelancerName:
        String(review.freelancerId) === toStringId(authStore.user?.id)
          ? getCurrentFreelancerName()
          : freelancerNames[String(review.freelancerId)] || `프리랜서 #${review.freelancerId}`,
      companyName:
        String(review.employerId) === toStringId(authStore.user?.id)
          ? getCurrentEmployerName()
          : employerNames[String(review.employerId)] || `기업 #${review.employerId}`,
      projectName: resolveProjectName(review.projectId, projectNames),
      atmosphere: review.atmosphere ?? 0,
      requirementDetail: review.requirementDetail ?? 0,
      schedule: review.schedule ?? 0,
      rating: average([
        review.atmosphere ?? 0,
        review.requirementDetail ?? 0,
        review.schedule ?? 0,
      ]),
      comment: review.description ?? '',
      createdAt: review.createdAt,
    };
  }

  async function fetchEmployerReviews(page = 0, size = 100) {
    if (!authStore.user || authStore.user.role !== 'EMPLOYER') {
      employerToFreelancerReviews.value = [];
      freelancerToEmployerReviews.value = [];
      return;
    }

    isFetchingReviews.value = true;
    reviewFetchError.value = null;

    try {
      const [writtenResponse, receivedResponse, actualProjects, jobPostingProjects, contracts] =
        await Promise.all([
          getEmployerWrittenReviews(page, size),
          getEmployerReceivedReviews(page, size),
          safeEmployerProjectSearches(),
          safeEmployerMypageProjects(),
          safeListContracts(['IN_PROGRESS', 'COMPLETED']),
        ]);

      const freelancerNames = await resolveUserDisplayNames([
        ...writtenResponse.content.map((review) => review.freelancerId),
        ...receivedResponse.content.map((review) => review.freelancerId),
      ]);

      const actualProjectNames = buildLookup(
        actualProjects.content ?? [],
        (item) => item.projectId,
        (item) => item.projectName,
      );
      const jobPostingProjectNames = buildLookup(
        jobPostingProjects,
        (item) => item.projectId,
        (item) => item.title,
      );
      const contractProjectNames = buildLookup(
        contracts.items ?? [],
        (item) => item.id,
        (item) => item.projectName,
      );

      employerToFreelancerReviews.value = (writtenResponse.content ?? []).map((review) =>
        mapEmployerReview(
          review,
          {
            [toStringId(authStore.user?.id)]: getCurrentEmployerName(),
          },
          freelancerNames,
          {
          ...contractProjectNames,
          ...actualProjectNames,
          },
        ),
      );

      freelancerToEmployerReviews.value = (receivedResponse.content ?? []).map((review) =>
        mapFreelancerReview(
          review,
          freelancerNames,
          {
            [toStringId(authStore.user?.id)]: getCurrentEmployerName(),
          },
          {
            ...jobPostingProjectNames,
            ...contractProjectNames,
            ...actualProjectNames,
          },
        ),
      );

      return {
        written: employerToFreelancerReviews.value,
        received: freelancerToEmployerReviews.value,
      };
    } catch (error) {
      employerToFreelancerReviews.value = [];
      freelancerToEmployerReviews.value = [];
      reviewFetchError.value = getReviewErrorMessage(error, '후기 목록을 불러오지 못했습니다.');
      throw error;
    } finally {
      isFetchingReviews.value = false;
    }
  }

  async function fetchFreelancerReviews(page = 0, size = 100) {
    if (!authStore.user || authStore.user.role !== 'FREELANCER') {
      employerToFreelancerReviews.value = [];
      freelancerToEmployerReviews.value = [];
      return;
    }

    isFetchingReviews.value = true;
    reviewFetchError.value = null;

    try {
      const [writtenResponse, receivedResponse, mypageProjects, contracts] = await Promise.all([
        getFreelancerWrittenReviews(page, size),
        getFreelancerReceivedReviews(page, size),
        safeFreelancerMypageProjects(),
        safeListContracts(['IN_PROGRESS', 'COMPLETED']),
      ]);

      const employerNames = await resolveUserDisplayNames([
        ...writtenResponse.content.map((review) => review.employerId),
        ...receivedResponse.content.map((review) => review.employerId),
      ]);

      const contractProjectNames = buildLookup(
        contracts.items ?? [],
        (item) => item.id,
        (item) => item.projectName,
      );
      const mypageProjectNames = buildLookup(
        mypageProjects,
        (item) => item.projectId,
        (item) => item.title,
      );

      freelancerToEmployerReviews.value = (writtenResponse.content ?? []).map((review) =>
        mapFreelancerReview(
          review,
          {
            [toStringId(authStore.user?.id)]: getCurrentFreelancerName(),
          },
          employerNames,
          {
            ...contractProjectNames,
            ...mypageProjectNames,
          },
        ),
      );

      employerToFreelancerReviews.value = (receivedResponse.content ?? []).map((review) =>
        mapEmployerReview(
          review,
          employerNames,
          {
          [toStringId(authStore.user?.id)]: getCurrentFreelancerName(),
          },
          {
          ...contractProjectNames,
          ...mypageProjectNames,
          },
        ),
      );

      return {
        written: freelancerToEmployerReviews.value,
        received: employerToFreelancerReviews.value,
      };
    } catch (error) {
      employerToFreelancerReviews.value = [];
      freelancerToEmployerReviews.value = [];
      reviewFetchError.value = getReviewErrorMessage(error, '후기 목록을 불러오지 못했습니다.');
      throw error;
    } finally {
      isFetchingReviews.value = false;
    }
  }

  async function fetchEmployerReviewTargets() {
    if (!authStore.user || authStore.user.role !== 'EMPLOYER') {
      employerReviewTargets.value = [];
      return [];
    }

    isFetchingReviewTargets.value = true;
    reviewTargetFetchError.value = null;

    try {
      const [projectsResponse, writtenResponse] = await Promise.all([
        getEmployerReviewProjects(0, 100),
        getEmployerWrittenReviews(0, 100),
      ]);

      const reviewableProjects = (projectsResponse.content ?? []).filter(
        (item) => item.status === 'IN_PROGRESS',
      );
      const freelancerNames = await resolveUserDisplayNames(
        reviewableProjects.map((item) => item.freelancerId),
      );
      const writtenKeys = new Set(
        (writtenResponse.content ?? []).map(
          (item) => `${String(item.projectId)}:${String(item.freelancerId)}`,
        ),
      );

      employerReviewTargets.value = reviewableProjects
        .filter((item) => !writtenKeys.has(`${String(item.projectId)}:${String(item.freelancerId)}`))
        .map((item) => ({
          key: `${String(item.projectId)}:${String(item.freelancerId)}`,
          projectId: String(item.projectId),
          counterpartyId: String(item.freelancerId),
          projectName: item.projectName || getProjectFallbackLabel(item.projectId),
          counterpartyName:
            freelancerNames[String(item.freelancerId)] || `프리랜서 #${item.freelancerId}`,
        }));

      return employerReviewTargets.value;
    } catch (error) {
      employerReviewTargets.value = [];
      reviewTargetFetchError.value = getReviewErrorMessage(
        error,
        '후기 작성 대상을 불러오지 못했습니다.',
      );
      throw error;
    } finally {
      isFetchingReviewTargets.value = false;
    }
  }

  async function fetchFreelancerReviewTargets() {
    if (!authStore.user || authStore.user.role !== 'FREELANCER') {
      freelancerReviewTargets.value = [];
      return [];
    }

    isFetchingReviewTargets.value = true;
    reviewTargetFetchError.value = null;

    try {
      const [contracts, writtenResponse] = await Promise.all([
        listContracts({ status: ['IN_PROGRESS', 'COMPLETED'], page: 1, limit: 100 }),
        getFreelancerWrittenReviews(0, 100),
      ]);
      const contractDetails = await Promise.allSettled(
        (contracts.items ?? []).map(async (item) => {
          const detail = await getContract(item.contractId || item.id);
          return [String(item.id), detail.employerBusinessName || detail.employerName || ''] as const;
        }),
      );
      const employerNames = await resolveUserDisplayNames(
        (contracts.items ?? []).map((item) => item.employerId),
      );
      const employerBusinessNames = contractDetails.reduce<Record<string, string>>((acc, result) => {
        if (result.status === 'fulfilled') {
          const [projectId, employerBusinessName] = result.value;
          if (employerBusinessName) {
            acc[projectId] = employerBusinessName;
          }
        }
        return acc;
      }, {});

      const writtenKeys = new Set(
        (writtenResponse.content ?? []).map(
          (item) => `${String(item.projectId)}:${String(item.employerId)}`,
        ),
      );

      freelancerReviewTargets.value = (contracts.items ?? [])
        .filter((item) => ['IN_PROGRESS', 'COMPLETED'].includes(item.status))
        .filter((item) => !writtenKeys.has(`${String(item.id)}:${String(item.employerId)}`))
        .map((item) => ({
          key: `${String(item.id)}:${String(item.employerId)}`,
          projectId: String(item.id),
          counterpartyId: String(item.employerId),
          projectName: item.projectName || getProjectFallbackLabel(item.id),
          counterpartyName:
            employerBusinessNames[String(item.id)] ||
            item.employerName ||
            employerNames[String(item.employerId)] ||
            `기업 #${item.employerId}`,
        }));

      return freelancerReviewTargets.value;
    } catch (error) {
      freelancerReviewTargets.value = [];
      reviewTargetFetchError.value = getReviewErrorMessage(
        error,
        '후기 작성 대상을 불러오지 못했습니다.',
      );
      throw error;
    } finally {
      isFetchingReviewTargets.value = false;
    }
  }

  async function addEmployerToFreelancerReview(
    payload: Omit<
      EmployerToFreelancerReview,
      'id' | 'createdAt' | 'rating' | 'employerName'
    > & { projectId: string | number; freelancerId: string | number },
  ) {
    isSubmittingReview.value = true;

    try {
      const request: EmployerReviewCreatePayload = {
        freelancerId: toNumericId(payload.freelancerId, '프리랜서'),
        language: payload.language,
        framework: payload.framework,
        debugging: payload.debugging,
        communication: payload.communication,
        schedule: payload.schedule,
        dispute: payload.dispute,
        description: payload.comment.trim(),
      };

      await createEmployerReview(toNumericId(payload.projectId, '프로젝트'), request);
      await Promise.all([fetchEmployerReviews(), fetchEmployerReviewTargets()]);
    } finally {
      isSubmittingReview.value = false;
    }
  }

  async function addFreelancerToEmployerReview(
    payload: Omit<
      FreelancerToEmployerReview,
      'id' | 'createdAt' | 'rating' | 'freelancerName'
    > & { projectId: string | number; employerId: string | number },
  ) {
    isSubmittingReview.value = true;

    try {
      const request: FreelancerReviewCreatePayload = {
        employerId: toNumericId(payload.employerId, '기업'),
        atmosphere: payload.atmosphere,
        requirementDetail: payload.requirementDetail,
        schedule: payload.schedule,
        description: payload.comment.trim(),
      };

      await createFreelancerReview(toNumericId(payload.projectId, '프로젝트'), request);
      await Promise.all([fetchFreelancerReviews(), fetchFreelancerReviewTargets()]);
    } finally {
      isSubmittingReview.value = false;
    }
  }

  async function updateFreelancerToEmployerReview(
    id: string,
    updates: Partial<FreelancerToEmployerReview>,
  ) {
    const currentReview = freelancerToEmployerReviews.value.find((review) => review.id === id);
    if (!currentReview) {
      return;
    }

    isSubmittingReview.value = true;

    try {
      const request: FreelancerReviewUpdatePayload = {
        atmosphere: updates.atmosphere ?? currentReview.atmosphere,
        requirementDetail: updates.requirementDetail ?? currentReview.requirementDetail,
        schedule: updates.schedule ?? currentReview.schedule,
        description: (updates.comment ?? currentReview.comment).trim(),
      };

      await updateFreelancerReview(toNumericId(id, '후기'), request);

      if (authStore.user?.role === 'FREELANCER') {
        await fetchFreelancerReviews();
      } else {
        await fetchEmployerReviews();
      }
    } finally {
      isSubmittingReview.value = false;
    }
  }

  async function updateEmployerToFreelancerReview(
    id: string,
    updates: Partial<EmployerToFreelancerReview>,
  ) {
    const currentReview = employerToFreelancerReviews.value.find((review) => review.id === id);
    if (!currentReview) {
      return;
    }

    isSubmittingReview.value = true;

    try {
      const request: EmployerReviewUpdatePayload = {
        language: updates.language ?? currentReview.language,
        framework: updates.framework ?? currentReview.framework,
        debugging: updates.debugging ?? currentReview.debugging,
        communication: updates.communication ?? currentReview.communication,
        schedule: updates.schedule ?? currentReview.schedule,
        dispute: updates.dispute ?? currentReview.dispute,
        description: (updates.comment ?? currentReview.comment).trim(),
      };

      await updateEmployerReview(toNumericId(id, '후기'), request);

      if (authStore.user?.role === 'EMPLOYER') {
        await fetchEmployerReviews();
      } else {
        await fetchFreelancerReviews();
      }
    } finally {
      isSubmittingReview.value = false;
    }
  }

  async function deleteFreelancerToEmployerReview(id: string) {
    isSubmittingReview.value = true;

    try {
      await deleteFreelancerReview(toNumericId(id, '후기'));

      if (authStore.user?.role === 'FREELANCER') {
        await Promise.all([fetchFreelancerReviews(), fetchFreelancerReviewTargets()]);
      } else {
        await fetchEmployerReviews();
      }
    } finally {
      isSubmittingReview.value = false;
    }
  }

  async function deleteEmployerToFreelancerReview(id: string) {
    isSubmittingReview.value = true;

    try {
      await deleteEmployerReview(toNumericId(id, '후기'));

      if (authStore.user?.role === 'EMPLOYER') {
        await Promise.all([fetchEmployerReviews(), fetchEmployerReviewTargets()]);
      } else {
        await fetchFreelancerReviews();
      }
    } finally {
      isSubmittingReview.value = false;
    }
  }

  return {
    freelancerToEmployerReviews,
    employerToFreelancerReviews,
    employerReviewTargets,
    freelancerReviewTargets,
    isFetchingReviews,
    reviewFetchError,
    isFetchingReviewTargets,
    reviewTargetFetchError,
    isSubmittingReview,
    fetchEmployerReviews,
    fetchFreelancerReviews,
    fetchEmployerReviewTargets,
    fetchFreelancerReviewTargets,
    addFreelancerToEmployerReview,
    addEmployerToFreelancerReview,
    updateFreelancerToEmployerReview,
    updateEmployerToFreelancerReview,
    deleteFreelancerToEmployerReview,
    deleteEmployerToFreelancerReview,
  };
});
