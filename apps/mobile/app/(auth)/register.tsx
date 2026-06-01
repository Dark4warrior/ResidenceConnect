import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Link } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import type { UserRole } from '@residenceconnect/shared';

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'tenant', label: 'Locataire' },
  { value: 'manager', label: 'Gestionnaire' },
  { value: 'technician', label: 'Technicien' },
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

    const { error: authError } = await signUp(email, password, fullName, role, phone || undefined);

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
        <Text style={styles.successTitle}>Inscription réussie !</Text>
        <Text style={styles.successText}>
          Vérifiez votre email pour confirmer votre compte.
        </Text>
        <Link href="/(auth)/login" style={styles.link}>
          Retour à la connexion
        </Link>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.inner}>
        <Text style={styles.title}>Créer un compte</Text>

        {error && <Text style={styles.error}>{error}</Text>}

        <TextInput
          style={styles.input}
          placeholder="Nom complet *"
          value={fullName}
          onChangeText={setFullName}
          autoComplete="name"
        />

        <TextInput
          style={styles.input}
          placeholder="Email *"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />

        <TextInput
          style={styles.input}
          placeholder="Téléphone"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          autoComplete="tel"
        />

        <TextInput
          style={styles.input}
          placeholder="Mot de passe * (min. 8 caractères)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="new-password"
        />

        <Text style={styles.label}>Votre rôle</Text>
        <View style={styles.roleContainer}>
          {ROLES.map((r) => (
            <TouchableOpacity
              key={r.value}
              style={[styles.roleButton, role === r.value && styles.roleButtonActive]}
              onPress={() => setRole(r.value)}
            >
              <Text style={[styles.roleText, role === r.value && styles.roleTextActive]}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>S'inscrire</Text>
          )}
        </TouchableOpacity>

        <Link href="/(auth)/login" style={styles.link}>
          Déjà un compte ? Se connecter
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  inner: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e3a5f',
    textAlign: 'center',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginTop: 4,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1e293b',
  },
  roleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  roleButtonActive: {
    borderColor: '#1e3a5f',
    backgroundColor: '#1e3a5f',
  },
  roleText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  roleTextActive: {
    color: '#fff',
  },
  button: {
    backgroundColor: '#1e3a5f',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
  },
  link: {
    color: '#1e3a5f',
    textAlign: 'center',
    marginTop: 8,
    fontSize: 14,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f8fafc',
    gap: 12,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#22c55e',
  },
  successText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
});
