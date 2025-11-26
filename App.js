// App.js (refactored)
// This file sets up the root navigation for the refactored You 2.0 app.  It mirrors the original
// App.js but points at our new screen locations under `src/screens`.  All other logic
// is preserved in the respective screens and services.

import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider } from 'react-native-paper';

// Import refactored screens.  These were moved from the root of the repo into
// `src/screens` to better organize the code base without changing any of the
// underlying functionality.
import TaskScreen from './src/screens/TaskScreen';
import FocusScreen from './src/screens/FocusScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider>
        <SafeAreaView style={{ flex: 1 }}>
          <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              {/*
                The main task tree and log UI lives in TaskScreen.  We preserve
                all original behaviour by simply moving the file; navigation
                names remain the same to avoid breaking downstream links.
              */}
              <Stack.Screen name="Main" component={TaskScreen} />
              <Stack.Screen name="Focus" component={FocusScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </SafeAreaView>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}