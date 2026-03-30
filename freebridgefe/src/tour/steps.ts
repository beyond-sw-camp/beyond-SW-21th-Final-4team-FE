import type { UserRole } from '@/types';

export type TourPlacement = 'top' | 'bottom' | 'left' | 'right' | 'center';

export type TourStep = {
  id: string;
  title: string;
  description: string;
  route: string;
  selector: string;
  placement?: TourPlacement;
  padding?: number;
};

// 고용주 페이지별 튜토리얼
export const employerTourSteps: TourStep[] = [
  {
    id: 'employer.jobs',
    title: '내 공고',
    description: '새로운 프로젝트 공고를 등록하고 관리할 수 있습니다. 공고 상태 확인, 수정, 마감 등 모든 공고 관련 작업을 이곳에서 처리하세요.',
    route: '/employer/jobs',
    selector: '[data-tour="employer.jobs"]',
    placement: 'center',
  },
  {
    id: 'employer.applications',
    title: '지원/제안',
    description: '내 공고로 들어온 지원서와 내가 보낸 제안을 함께 확인할 수 있습니다. 수락/거절 처리와 제안 상태를 한눈에 관리하세요.',
    route: '/employer/applications',
    selector: '[data-tour="employer.applications"]',
    placement: 'center',
  },
  {
    id: 'employer.recommended',
    title: '추천 프리랜서',
    description: 'AI가 프로젝트에 적합한 프리랜서를 추천해드립니다. 기술 스택, 경력, 평점 등을 기반으로 최적의 인재를 찾아보세요.',
    route: '/employer/recommended',
    selector: '[data-tour="employer.recommended"]',
    placement: 'center',
  },
  {
    id: 'employer.contracts',
    title: '계약서',
    description: '프리랜서와의 계약을 체결하고 관리합니다. 전자서명, 계약 조건 협의, 계약서 다운로드 등을 처리할 수 있습니다.',
    route: '/employer/contracts',
    selector: '[data-tour="employer.contracts"]',
    placement: 'center',
  },
  {
    id: 'employer.mypage',
    title: '마이페이지',
    description: '기업 프로필 정보를 관리하고 계정 설정을 변경할 수 있습니다. 기업 소개, 로고, 연락처 정보 등을 최신 상태로 유지하세요.',
    route: '/employer/mypage',
    selector: '[data-tour="employer.mypage"]',
    placement: 'center',
  },
];

// 프리랜서 페이지별 튜토리얼
export const freelancerTourSteps: TourStep[] = [
  {
    id: 'freelancer.jobs',
    title: '공고 찾기',
    description: '등록된 프로젝트 공고를 검색하고 지원할 수 있습니다. 기술 스택, 예산, 기간 등을 확인하고 나에게 맞는 프로젝트를 찾아보세요.',
    route: '/freelancer/jobs',
    selector: '[data-tour="freelancer.jobs"]',
    placement: 'center',
  },
  {
    id: 'freelancer.applications',
    title: '내 지원/제안',
    description: '내가 보낸 지원서와 기업이 보낸 제안을 함께 확인할 수 있습니다. 대기, 수락, 거절 상태를 한눈에 파악하세요.',
    route: '/freelancer/applications',
    selector: '[data-tour="freelancer.applications"]',
    placement: 'center',
  },
  {
    id: 'freelancer.recommended',
    title: '추천 공고',
    description: '나의 기술 스택과 경력을 분석하여 AI가 맞춤 프로젝트를 추천해드립니다. 놓치지 말고 확인해보세요!',
    route: '/freelancer/jobs',
    selector: '[data-tour="freelancer.recommended"]',
    placement: 'center',
  },
  {
    id: 'freelancer.contracts',
    title: '계약서',
    description: '진행 중인 계약과 완료된 계약을 관리합니다. 계약 조건 확인, 전자서명, 마일스톤 진행 상황 등을 확인할 수 있습니다.',
    route: '/freelancer/contracts',
    selector: '[data-tour="freelancer.contracts"]',
    placement: 'center',
  },
  {
    id: 'freelancer.settlement',
    title: '정산',
    description: '프로젝트 수익금을 정산받을 수 있습니다. 정산 요청, 지급 내역 확인, 세금 관련 정보 등을 관리하세요.',
    route: '/freelancer/settlement',
    selector: '[data-tour="freelancer.settlement"]',
    placement: 'center',
  },
  {
    id: 'freelancer.mypage',
    title: '마이페이지',
    description: '프로필, 포트폴리오, 기술 스택 등 개인 정보를 관리합니다. 완성도 높은 프로필은 더 많은 프로젝트 기회로 이어집니다!',
    route: '/freelancer/mypage',
    selector: '[data-tour="freelancer.mypage"]',
    placement: 'center',
  },
];

export const getTourSteps = (role: UserRole) =>
  role === 'EMPLOYER' ? employerTourSteps : freelancerTourSteps;

export const getFirstTourRoute = (role: UserRole) =>
  getTourSteps(role)[0]?.route || (role === 'EMPLOYER' ? '/employer/jobs' : '/freelancer/jobs');
