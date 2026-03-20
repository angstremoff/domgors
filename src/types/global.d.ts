import type { RefObject } from 'react';
import type { NavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './navigation';

declare global {
  var propertyDeepLinkId: string | null;
  var pendingPropertyNavigation: string | null;
  var pendingAgencyNavigation: string | null;
  var navigationRef: RefObject<NavigationContainerRef<RootStackParamList> | null> | null;

  interface Window {
    propertyDeepLinkId: string | null;
  }
}

export {};
