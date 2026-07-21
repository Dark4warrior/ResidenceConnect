import { useState, type FormEvent } from 'react';
import { useAuthContext } from '../context/AuthContext';

/** Page « Mon compte » : le gestionnaire consulte et modifie ses infos. */
export function Profile() {
  const { session, profile, updateProfile } = useAuthContext();

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<
    { type: 'success' | 'error'; message: string } | null
  >(null);

  const dirty =
    fullName.trim() !== (profile?.full_name ?? '') ||
    phone.trim() !== (profile?.phone ?? '');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!fullName.trim()) {
      setFeedback({ type: 'error', message: 'Le nom ne peut pas être vide.' });
      return;
    }

    setSaving(true);
    const { error } = await updateProfile({
      full_name: fullName.trim(),
      phone: phone.trim() || null,
    });
    setSaving(false);

    setFeedback(
      error
        ? { type: 'error', message: `Échec de l'enregistrement : ${error.message}` }
        : { type: 'success', message: 'Informations mises à jour.' }
    );
  };

  const inputClass =
    'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand';

  return (
    <section className="max-w-lg">
      <h1 className="text-2xl font-bold text-slate-900">Mon compte</h1>
      <p className="mt-1 text-sm text-slate-500">
        Gérez vos informations personnelles de gestionnaire.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-6 rounded-xl border border-slate-200 bg-white p-6"
      >
        <label className="block text-sm font-medium text-slate-700">
          Nom complet
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="mt-4 block text-sm font-medium text-slate-700">
          Téléphone
          <input
            type="tel"
            value={phone}
            placeholder="Non renseigné"
            onChange={(e) => setPhone(e.target.value)}
            className={inputClass}
          />
        </label>

        <div className="mt-4">
          <span className="text-sm font-medium text-slate-700">Adresse e-mail</span>
          {/* L'e-mail relève de l'authentification : non modifiable ici. */}
          <p className="mt-1 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">
            {session?.user?.email ?? '—'}
          </p>
        </div>

        {feedback ? (
          <p
            role="alert"
            className={`mt-4 rounded-lg px-3 py-2 text-sm ${
              feedback.type === 'success'
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {feedback.message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={saving || !dirty}
          className="mt-6 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </form>
    </section>
  );
}
