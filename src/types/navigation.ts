import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import type { Property } from '../contexts/PropertyContext';

// Типы для всех параметров экранов приложения
export type RootStackParamList = {
  MainTabs: undefined;
  PropertyDetails: { propertyId: string; property?: Property; id?: string };
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: undefined;
  AddProperty: undefined;
  Settings: undefined;
  ContactInfo: undefined;
  Map: undefined;
  MyProperties: undefined;
  EditProperty: { propertyId: string };
  Home: undefined;
  Favorites: undefined;
  Profile: undefined;
  Agency: { agencyId: string };
};

// Типы для пропсов экранов
export type PropertyDetailsScreenProps = {
  route: RouteProp<RootStackParamList, 'PropertyDetails'>;
  navigation: NativeStackNavigationProp<RootStackParamList>;
};

export type EditPropertyScreenProps = {
  route: RouteProp<RootStackParamList, 'EditProperty'>;
  navigation: NativeStackNavigationProp<RootStackParamList>;
};

export type AgencyScreenProps = {
  route: RouteProp<RootStackParamList, 'Agency'>;
  navigation: NativeStackNavigationProp<RootStackParamList>;
};

export type LoginScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Login'>;
};

export type RegisterScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Register'>;
};

export type ForgotPasswordScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ForgotPassword'>;
};

export type ResetPasswordScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ResetPassword'>;
};
