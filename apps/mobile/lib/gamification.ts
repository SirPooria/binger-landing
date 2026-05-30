import { apiPost } from './api';
import type { XpAction } from '@binger/shared';

export async function awardXp(_userId: string, action: XpAction, reference?: string) {
  return apiPost<{ new_xp: number; new_level: number; leveled_up: boolean } | null>('/xp/award', {
    action,
    reference_id: reference,
  });
}
