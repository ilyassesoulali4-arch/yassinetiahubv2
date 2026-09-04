import type { IdeaStatus } from '../../lib/firestore/types';

const LABELS: Record<IdeaStatus, string> = {
  new: 'جديدة',
  under_review: 'قيد المراجعة',
  planned: 'مخطّط لها',
  in_show: 'قيد التنفيذ',
  done: 'منجَزة',
  declined: 'مرفوضة'
};

const TONE: Record<IdeaStatus, string> = {
  new: 'idea-badge--new',
  under_review: 'idea-badge--review',
  planned: 'idea-badge--planned',
  in_show: 'idea-badge--show',
  done: 'idea-badge--done',
  declined: 'idea-badge--declined'
};

export function IdeaStatusBadge({ status }: { status: IdeaStatus }) {
  return (
    <span className={'idea-badge ' + TONE[status]} aria-label={'حالة الفكرة: ' + LABELS[status]}>
      {LABELS[status]}
    </span>
  );
}
