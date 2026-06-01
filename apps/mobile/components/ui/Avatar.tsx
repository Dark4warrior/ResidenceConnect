import { View, Text, StyleSheet } from 'react-native';
import { colors, fontWeight } from '../../theme';

interface AvatarProps {
  name: string;
  size?: number;
}

/** Renvoie les initiales (max 2 lettres) d'un nom complet. */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/** Pastille ronde avec les initiales de l'utilisateur. */
export function Avatar({ name, size = 56 }: AvatarProps) {
  return (
    <View
      style={[
        styles.container,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[styles.text, { fontSize: size * 0.38 }]}>
        {getInitials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: colors.textOnPrimary,
    fontWeight: fontWeight.bold,
  },
});
