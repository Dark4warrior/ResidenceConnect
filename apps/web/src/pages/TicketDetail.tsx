import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  TICKET_STATUS_LABELS,
  TICKET_CATEGORY_LABELS,
  type TicketStatus,
} from '@residenceconnect/shared';
import { useTickets } from '../hooks/useTickets';
import { useTechnicians } from '../hooks/useTechnicians';
import {
  useTicketHistory,
  formatHistoryTransition,
} from '../hooks/useTicketHistory';
import { useTicketPhotos } from '../hooks/useTicketPhotos';
import { formatDateTime } from '../lib/format';
import { StatusBadge, UrgencyBadge } from '../components/Badges';

const STATUS_ORDER: TicketStatus[] = ['pending', 'in_progress', 'resolved'];

/** Détail d'un ticket avec changement de statut, assignation et historique. */
export function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const { tickets, loading, error, updateStatus, assignTechnician } = useTickets();
  const { technicians, loading: loadingTechs } = useTechnicians();
  const {
    history,
    loading: loadingHistory,
    error: historyError,
    refetch: refetchHistory,
  } = useTicketHistory(id);
  const { photos } = useTicketPhotos(id);

  const [saving, setSaving] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const ticket = useMemo(
    () => tickets.find((t) => t.id === id) ?? null,
    [tickets, id],
  );

  const handleStatusChange = async (status: TicketStatus) => {
    if (!ticket) return;
    setSaving(true);
    setSaveError(null);
    const { error: updateError } = await updateStatus(ticket.id, status);
    setSaving(false);
    if (updateError) {
      setSaveError(updateError.message);
      return;
    }
    await refetchHistory();
  };

  const handleAssign = async (technicianId: string) => {
    if (!ticket) return;
    setAssigning(true);
    setSaveError(null);
    const value = technicianId === '' ? null : technicianId;
    const { error: assignError } = await assignTechnician(ticket.id, value);
    setAssigning(false);
    if (assignError) setSaveError(assignError.message);
  };

  if (loading) return <p className="text-sm text-slate-500">Chargement…</p>;
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
        <h2 className="text-sm font-medium text-slate-700">Description</h2>
        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
          {ticket.description}
        </p>
      </div>

      {photos.length > 0 ? (
        <div className="mt-6">
          <h2 className="text-sm font-medium text-slate-700">
            Photos ({photos.length})
          </h2>
          <div className="mt-2 flex flex-wrap gap-3">
            {photos.map((p) => (
              <a
                key={p.id}
                href={p.url}
                target="_blank"
                rel="noreferrer"
                className="block"
              >
                <img
                  src={p.url}
                  alt="Photo du signalement"
                  className="h-28 w-28 rounded-lg border border-slate-200 object-cover transition-opacity hover:opacity-80"
                />
              </a>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-6">
        <h2 className="text-sm font-medium text-slate-700">Changer le statut</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {STATUS_ORDER.map((s) => (
            <button
              key={s}
              type="button"
              disabled={saving || s === ticket.status}
              onClick={() => void handleStatusChange(s)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {TICKET_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <label
          htmlFor="assign-technician"
          className="text-sm font-medium text-slate-700"
        >
          Assigner à un technicien
        </label>
        <select
          id="assign-technician"
          className="mt-2 block w-full max-w-md rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          value={ticket.assigned_to ?? ''}
          disabled={assigning || loadingTechs}
          onChange={(e) => void handleAssign(e.target.value)}
        >
          <option value="">Non assigné</option>
          {technicians.map((tech) => (
            <option key={tech.id} value={tech.id}>
              {tech.full_name}
            </option>
          ))}
        </select>
      </div>

      {saveError ? (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {saveError}
        </p>
      ) : null}

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-slate-800">Historique</h2>
        {loadingHistory ? (
          <p className="mt-2 text-sm text-slate-500">Chargement de l’historique…</p>
        ) : null}
        {historyError ? (
          <p className="mt-2 text-sm text-red-600">{historyError}</p>
        ) : null}
        {!loadingHistory && !historyError && history.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            Aucun changement enregistré pour l’instant.
          </p>
        ) : null}
        <ul className="mt-3 space-y-3">
          {history.map((entry) => (
            <li
              key={entry.id}
              className="rounded-lg border border-slate-200 bg-white px-4 py-3"
            >
              <p className="text-sm font-medium text-slate-800">
                {formatHistoryTransition(
                  entry.old_status,
                  entry.new_status,
                  TICKET_STATUS_LABELS,
                )}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {entry.author?.full_name ?? 'Utilisateur inconnu'} ·{' '}
                {formatDateTime(entry.changed_at)}
              </p>
              {entry.comment ? (
                <p className="mt-1 text-sm italic text-slate-500">
                  « {entry.comment} »
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-700">{value}</dd>
    </div>
  );
}
