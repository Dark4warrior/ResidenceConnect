import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, spacing } from '../../theme';

interface HeaderBackButtonProps {
  /** Route de repli si aucun historique de navigation n'existe. */
  fallbackHref: string;
}

/**
 * Bouton de retour affiché dans l'en-tête des écrans de détail.
 *
 * Les écrans de détail sont déclarés comme onglets masqués (`href: null`) :
 * ils n'héritent donc d'aucun bouton de retour automatique. Ce composant
 * comble ce manque.
 *
 * On revient dans l'historique quand c'est possible, sinon on retombe sur la
 * liste du rôle : l'utilisateur n'est jamais bloqué, même en arrivant
 * directement sur l'écran (lien profond, rechargement).
 */
export function HeaderBackButton({ fallbackHref }: HeaderBackButtonProps) {
  const router = useRouter();

  const handlePress = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallbackHref as never);
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel="Revenir à la liste"
      hitSlop={12}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Ionicons
        name="chevron-back"
        size={26}
        color={colors.textOnPrimary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingLeft: spacing.sm,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
  },
  pressed: { opacity: 0.6 },
});
