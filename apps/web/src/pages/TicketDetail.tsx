import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  TICKET_STATUS_LABELS,
  TICKET_CATEGORY_LABELS,
  type TicketStatus,
} from '@residenceconnect/shared';
import { useTickets } from '../hooks/useTickets';
import { formatDateTime } from '../lib/format';
import { StatusBadge, UrgencyBadge } from '../components/Badges';

const STATUS_ORDER: TicketStatus[] = ['pending', 'in_progress', 'resolved'];

/** Détail d'un ticket avec changement de statut. */
export function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const { tickets, loading, error, updateStatus } = useTickets();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const ticket = useMemo(
    () => tickets.find((t) => t.id === id) ?? null,
    [tickets, id]
  );

  const handleStatusChange = async (status: TicketStatus) => {
    if (!ticket) return;
    setSaving(true);
    setSaveError(null);
    const { error: updateError } = await updateStatus(ticket.id, status);
    setSaving(false);
    if (updateError) setSaveError(updateError.message);
  };

  if (loading) return <p className="text-sm text-slate-400">Chargement…</p>;
  if (error)
    return (
      <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>
    );
  if (!ticket)
    return (
      <div>
        <p className="text-sm text-slate-500">Ticket introuvable.</p>
        <Link to="/" className="mt-2 inline-block text-sm text-brand hover:underline">
          ← Retour à la liste
        </Link>
      </div>
    );

  return (
    <section className="max-w-3xl">
      <Link to="/" className="text-sm text-brand hover:underline">
        ← Retour à la liste
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-slate-900">{ticket.title}</h1>
        <StatusBadge status={ticket.status} />
        <UrgencyBadge level={ticket.urgency_level} />
      </div>

      <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Catégorie" value={TICKET_CATEGORY_LABELS[ticket.category]} />
        <Field
          label="Logement"
          value={
            ticket.apartment
              ? `${ticket.apartment.residence?.name ?? '—'} · ${ticket.apartment.unit_number}`
              : '—'
          }
        />
        <Field label="Déclaré par" value={ticket.reporter?.full_name ?? '—'} />
        <Field label="Assigné à" value={ticket.assignee?.full_name ?? 'Non assigné'} />
        <Field label="Créé le" value={formatDateTime(ticket.created_at)} />
        <Field label="Résolu le" value={formatDateTime(ticket.resolved_at) || '—'} />
      </dl>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-medium text-slate-700">Description</p>
        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
          {ticket.description}
        </p>
      </div>

      <div className="mt-6">
        <p className="text-sm font-medium text-slate-700">Changer le statut</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {STATUS_ORDER.map((s) => (
            <button
              key={s}
              type="button"
              disabled={saving || s === ticket.status}
              onClick={() => handleStatusChange(s)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {TICKET_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        {saveError ? (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {saveError}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-700">{value}</dd>
    </div>
  );
}
