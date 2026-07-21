import { ScrollView, Text, View } from 'react-native';
import { useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useTickets } from '../../hooks/useTickets';
import { useTechnicians } from '../../hooks/useTechnicians';
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

export default function ManagerProfileScreen() {
  const { profile, user, signOut } = useAuth();
  const { tickets } = useTickets();
  const { technicians } = useTechnicians();

  const stats = useMemo(() => {
    const resolved = tickets.filter((t) => t.status === 'resolved').length;
    const unassigned = tickets.filter(
      (t) => !t.assigned_to && t.status !== 'resolved'
    ).length;

    // Résidences supervisées, déduites des signalements visibles.
    const residences = new Map<string, { name: string; count: number }>();
    for (const t of tickets) {
      const r = t.apartment?.residence;
      if (!r) continue;
      const entry = residences.get(r.id);
      residences.set(r.id, { name: r.name, count: (entry?.count ?? 0) + 1 });
    }

    return {
      total: tickets.length,
      resolved,
      unassigned,
      residences: [...residences.entries()],
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
        roleLabel="Gestionnaire"
        roleIcon="briefcase-outline"
        since={profile?.created_at}
      />

      <Section title="Vue d'ensemble">
        <StatsRow
          items={[
            { value: stats.total, label: 'Signalements', tone: colors.primary },
            { value: stats.unassigned, label: 'À attribuer', tone: colors.warning },
            { value: stats.resolved, label: 'Résolus', tone: colors.success },
          ]}
        />
      </Section>

      <Section title="Mes résidences">
        {stats.residences.length === 0 ? (
          <Text style={s.emptyText}>
            Aucune résidence rattachée à votre compte pour le moment.
          </Text>
        ) : (
          stats.residences.map(([id, r], i) => (
            <TileRow
              key={id}
              icon="business-outline"
              title={r.name}
              subtitle={`${r.count} signalement${r.count > 1 ? 's' : ''}`}
              divider={i > 0}
            />
          ))
        )}
      </Section>

      <Section title="Mon équipe technique">
        {technicians.length === 0 ? (
          <Text style={s.emptyText}>
            Aucun technicien disponible pour l&apos;attribution.
          </Text>
        ) : (
          technicians.map((t, i) => {
            const load = tickets.filter(
              (k) => k.assigned_to === t.id && k.status !== 'resolved'
            ).length;
            return (
              <TileRow
                key={t.id}
                icon="construct-outline"
                title={t.full_name}
                subtitle={
                  load === 0
                    ? 'Disponible'
                    : `${load} mission${load > 1 ? 's' : ''} en cours`
                }
                divider={i > 0}
              />
            );
          })
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

      <View>
        <LogoutButton onConfirm={() => void signOut()} />
        <AppVersion />
      </View>
    </ScrollView>
  );
}
