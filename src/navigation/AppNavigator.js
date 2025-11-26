import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import TodayScreen from '../screens/TodayScreen';
import AllScreen from '../screens/AllScreen';
import LogsScreen from '../screens/LogsScreen';
import ChatScreen from '../screens/ChatScreen';

// NOTE: The original implementation used a MaterialTopTabNavigator from
// '@react-navigation/material-top-tabs' to render the Today, All and
// Logs pages in a swipeable tab view.  However, that dependency may
// not be installed or may conflict with the user's environment.  To
// improve compatibility, we fall back to a simple stack navigator
// that registers each page as a separate route.  You can still
// navigate between pages using navigation.navigate('All'), etc.  If
// you later install the top tab package, you can restore the tab
// navigator here.

const Stack = createNativeStackNavigator();
export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Today" component={TodayScreen} />
        <Stack.Screen name="All" component={AllScreen} />
        <Stack.Screen name="Logs" component={LogsScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}