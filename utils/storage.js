export const loadThreads = async () => {
  const data = await AsyncStorage.getItem('you2_threads');
  return data ? JSON.parse(data) : null;
};
s
export const saveThreads = async (threads) => {
  await AsyncStorage.setItem('you2_threads', JSON.stringify(threads));
};
