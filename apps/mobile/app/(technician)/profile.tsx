import { ScrollView, Text, View } from 'react-native';
import { useMemo } from 'react';
import { TICKET_CATEGORY_LABELS } from '@residenceconnect/shared';
import { useAuth } from '../../hooks/useAuth';
import { useTickets } from '../../hooks/useTickets';
import { colors } from '../../theme';
import {
  ProfileHeader,
  Section,
  StatsRow,
  InfoRow,
  TileRow,
  LogoutButton,
  AppVersion,
  profileStyles as s,
} from '../../components/profile/ProfileKit';

export default function TechnicianProfileScreen() {
  const { profile, user, signOut } = useAuth();
  const { tickets } = useTickets();

  const stats = useMemo(() => {
    const resolved = tickets.filter((t) => t.status === 'resolved');
    const active = tickets.filter((t) => t.status !== 'resolved');

    // Résidences sur lesquelles le technicien intervient (via ses missions).
    const residences = new Map<string, string>();
    for (const t of tickets) {
      const r = t.apartment?.residence;
      if (r) residences.set(r.id, r.name);
    }

    // Répartition des interventions par type d'incident.
    const byCategory = new Map<string, number>();
    for (const t of tickets) {
      byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + 1);
    }
    const topCategories = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);

    return {
      active: active.length,
      resolved: resolved.length,
      total: tickets.length,
      residences: [...residences.entries()],
      topCategories,
    };
  }, [tickets]);

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}
    >
      <ProfileHeader
        name={profile?.full_name ?? '—'}
        roleLabel="Technicien"
        roleIcon="construct-outline"
        since={profile?.created_at}
      />

      <Section title="Mon activité">
        <StatsRow
          items={[
            { value: stats.active, label: 'En charge', tone: colors.warning },
            { value: stats.resolved, label: 'Résolues', tone: colors.success },
            { value: stats.total, label: 'Total', tone: colors.primary },
          ]}
        />
      </Section>

      <Section title="Mes types d'intervention">
        {stats.topCategories.length === 0 ? (
          <Text style={s.emptyText}>
            Aucune intervention enregistrée pour le moment.
          </Text>
        ) : (
          stats.topCategories.map(([cat, count], i) => (
            <TileRow
              key={cat}
              icon="build-outline"
              title={
                TICKET_CATEGORY_LABELS[cat as keyof typeof TICKET_CATEGORY_LABELS] ??
                cat
              }
              subtitle={`${count} intervention${count > 1 ? 's' : ''}`}
              divider={i > 0}
            />
          ))
        )}
      </Section>

      <Section title="Mes secteurs d'intervention">
        {stats.residences.length === 0 ? (
          <Text style={s.emptyText}>
            Aucune résidence rattachée à vos missions actuelles.
          </Text>
        ) : (
          stats.residences.map(([id, name], i) => (
            <TileRow
              key={id}
              icon="business-outline"
              title={name}
              divider={i > 0}
            />
          ))
        )}
      </Section>

      <Section title="Mes coordonnées">
        <InfoRow icon="mail-outline" label="E-mail" value={user?.email ?? '—'} />
        <InfoRow
          icon="call-outline"
          label="Téléphone"
          value={profile?.phone ?? 'Non renseigné'}
          muted={!profile?.phone}
          divider
        />
      </Section>

      <Section title="Rappel">
        <Text style={s.helpText}>
          Pensez à mettre à jour le statut de vos missions depuis le terrain :
          le locataire et le gestionnaire sont informés en temps réel. Un
          commentaire à la clôture alimente le journal d&apos;intervention.
        </Text>
      </Section>

      <View>
        <LogoutButton onConfirm={() => void signOut()} />
        <AppVersion />
      </View>
    </ScrollView>
  );
}
