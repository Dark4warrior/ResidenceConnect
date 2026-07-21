import { View, StyleSheet, ViewProps } from 'react-native';
import { colors, radius, spacing, shadow } from '../../theme';

interface CardProps extends ViewProps {
  padded?: boolean;
}

/** Conteneur blanc arrondi avec ombre douce, brique de base de l'UI. */
export function Card({ padded = true, style, children, ...props }: CardProps) {
  return (
    <View style={[styles.card, padded && styles.padded, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    ...shadow.card,
  },
  padded: {
    padding: spacing.lg,
  },
});
