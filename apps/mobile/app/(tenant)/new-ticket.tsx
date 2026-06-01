import { View, Text, StyleSheet } from 'react-native';

export default function NewTicketScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Formulaire de signalement — à venir</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  text: { fontSize: 16, color: '#64748b' },
});
