import type { TicketStatus, UrgencyLevel } from '@residenceconnect/shared';
import {
  TICKET_STATUS_LABELS,
  URGENCY_LEVEL_LABELS,
} from '@residenceconnect/shared';

const STATUS_CLASSES: Record<TicketStatus, string> = {
  pending: 'bg-slate-100 text-slate-700 ring-slate-200',
  in_progress: 'bg-blue-100 text-blue-700 ring-blue-200',
  resolved: 'bg-green-100 text-green-700 ring-green-200',
};

const URGENCY_CLASSES: Record<UrgencyLevel, string> = {
  low: 'bg-green-100 text-green-700 ring-green-200',
  medium: 'bg-amber-100 text-amber-700 ring-amber-200',
  high: 'bg-orange-100 text-orange-700 ring-orange-200',
  critical: 'bg-red-100 text-red-700 ring-red-200',
};

const base =
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset';

export function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span className={`${base} ${STATUS_CLASSES[status]}`}>
      {TICKET_STATUS_LABELS[status]}
    </span>
  );
}

export function UrgencyBadge({ level }: { level: UrgencyLevel }) {
  return (
    <span className={`${base} ${URGENCY_CLASSES[level]}`}>
      {URGENCY_LEVEL_LABELS[level]}
    </span>
  );
}
