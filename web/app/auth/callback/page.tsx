import { Metadata } from 'next';
import { AuthCallbackClient } from '@/components/forms/AuthCallbackClient';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { FormTitle } from '@/components/forms/FormTitle';

export const metadata: Metadata = {
  title: 'Potvrda emaila | Подтверждение email',
  description: 'Završetak potvrde email adrese za DomGo.rs nalog. Завершение подтверждения email для аккаунта DomGo.rs.',
  robots: { index: false, follow: true },
};

export default function AuthCallbackPage() {
  return (
    <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md">
        <Card>
          <CardHeader>
            <FormTitle translationKey="auth.confirmEmail" />
          </CardHeader>
          <CardContent>
            <AuthCallbackClient />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
