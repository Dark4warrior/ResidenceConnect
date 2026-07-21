import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import type { UserRole } from '@residenceconnect/shared';

const ROLES: {
  value: UserRole;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { value: 'tenant', label: 'Locataire', icon: 'home-outline' },
  { value: 'manager', label: 'Gestionnaire', icon: 'briefcase-outline' },
  { value: 'technician', label: 'Technicien', icon: 'construct-outline' },
];

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('tenant');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleRegister = async () => {
    if (!fullName || !email || !password) {
      setError('Veuillez remplir les champs obligatoires.');
      return;
    }
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    setLoading(true);
    setError(null);

    const { error: authError } = await signUp(
      email,
      password,
      fullName,
      role,
      phone || undefined
    );

    if (authError) {
      setError(authError.message);
    } else {
      setSuccess(true);
    }

    setLoading(false);
  };

  if (success) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={64} color="#22c55e" />
        </View>
        <Text style={styles.successTitle}>Compte créé !</Text>
        <Text style={styles.successText}>
          Votre compte a bien été créé. Vous pouvez maintenant vous connecter.
        </Text>
        <Link href="/(auth)/login" asChild>
          <Button title="Aller à la connexion" style={styles.successBtn} />
        </Link>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Créer un compte</Text>
          <Text style={styles.subtitle}>Rejoignez ResidenceConnect</Text>
        </View>

        <View style={styles.card}>
          {error && (
            <View style={styles.errorBox} accessibilityLiveRegion="assertive">
              <Ionicons
                name="alert-circle"
                size={18}
                color="#ef4444"
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Input
            icon="person-outline"
            accessibilityLabel="Nom complet (obligatoire)"
            placeholder="Nom complet *"
            value={fullName}
            onChangeText={setFullName}
            autoComplete="name"
          />

          <Input
            icon="mail-outline"
            accessibilityLabel="Adresse email (obligatoire)"
            placeholder="Adresse email *"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          <Input
            icon="call-outline"
            accessibilityLabel="Téléphone"
            placeholder="Téléphone"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
          />

          <Input
            icon="lock-closed-outline"
            accessibilityLabel="Mot de passe (obligatoire, au moins 8 caractères)"
            placeholder="Mot de passe * (min. 8 caractères)"
            value={password}
            onChangeText={setPassword}
            isPassword
            autoComplete="new-password"
          />

          <Text style={styles.roleLabel}>Votre rôle</Text>
          <View style={styles.roleRow}>
            {ROLES.map((r) => {
              const active = role === r.value;
              return (
                <TouchableOpacity
                  key={r.value}
                  style={[styles.roleCard, active && styles.roleCardActive]}
                  onPress={() => setRole(r.value)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Rôle ${r.label}`}
                >
                  <Ionicons
                    name={r.icon}
                    size={22}
                    color={active ? '#fff' : '#64748b'}
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                  />
                  <Text
                    style={[styles.roleText, active && styles.roleTextActive]}
                  >
                    {r.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Button
            title="S'inscrire"
            onPress={handleRegister}
            loading={loading}
            style={styles.submit}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Déjà un compte ? </Text>
          <Link href="/(auth)/login" style={styles.footerLink}>
            Se connecter
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 6,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    gap: 14,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 12,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    flex: 1,
  },
  roleLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginTop: 2,
    marginLeft: 2,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  roleCard: {
    flex: 1,
    height: 76,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  roleCardActive: {
    borderColor: '#1e3a5f',
    backgroundColor: '#1e3a5f',
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  roleTextActive: {
    color: '#fff',
  },
  submit: {
    marginTop: 6,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: '#64748b',
    fontSize: 14,
  },
  footerLink: {
    color: '#1e3a5f',
    fontSize: 14,
    fontWeight: '700',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f1f5f9',
    gap: 12,
  },
  successIcon: {
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
  },
  successText: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
  },
  successBtn: {
    marginTop: 16,
    alignSelf: 'stretch',
  },
});
