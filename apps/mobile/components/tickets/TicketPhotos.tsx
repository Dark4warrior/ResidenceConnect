import { useState } from 'react';
import {
  View,
  Text,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DisplayPhoto } from '../../hooks/useTicketPhotos';
import { colors, spacing, radius, fontSize, fontWeight } from '../../theme';

interface TicketPhotosProps {
  photos: DisplayPhoto[];
}

/**
 * Galerie horizontale des photos d'un signalement, avec ouverture en plein
 * écran. Ne s'affiche pas s'il n'y a aucune photo.
 */
export function TicketPhotos({ photos }: TicketPhotosProps) {
  const [fullscreen, setFullscreen] = useState<string | null>(null);

  if (photos.length === 0) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Photos ({photos.length})</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.row}>
          {photos.map((p, index) => (
            <Pressable
              key={p.id}
              onPress={() => setFullscreen(p.uri)}
              accessibilityRole="imagebutton"
              accessibilityLabel={`Agrandir la photo ${index + 1} sur ${photos.length}`}
            >
              <Image
                source={{ uri: p.uri }}
                style={styles.thumb}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <Modal visible={!!fullscreen} transparent animationType="fade">
        <Pressable style={styles.backdrop} onPress={() => setFullscreen(null)}>
          <Pressable
            style={styles.close}
            onPress={() => setFullscreen(null)}
            accessibilityRole="button"
            accessibilityLabel="Fermer la photo"
          >
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
          {fullscreen && (
            <Image
              source={{ uri: fullscreen }}
              style={styles.fullImage}
              resizeMode="contain"
              accessible
              accessibilityRole="image"
              accessibilityLabel="Photo du signalement en plein écran"
            />
          )}
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  title: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: spacing.md,
  },
  row: { flexDirection: 'row', gap: spacing.sm },
  thumb: {
    width: 104,
    height: 104,
    borderRadius: radius.md,
    backgroundColor: colors.border,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullImage: { width: '100%', height: '80%' },
  close: {
    position: 'absolute',
    top: 56,
    right: 24,
    zIndex: 2,
    padding: spacing.sm,
  },
});
