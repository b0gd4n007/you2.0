import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage key used to persist notes to local storage.
const KEY = 'you2.logs.v1';

/**
 * Load the list of notes from AsyncStorage.  Returns an empty array
 * if no data is stored or if parsing fails.
 * @returns {Promise<Array>} The list of notes
 */
export async function loadNotes() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Save the list of notes to AsyncStorage.  Serializes as JSON.
 * @param {Array} list The list of notes to persist
 */
export async function saveNotes(list) {
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
}