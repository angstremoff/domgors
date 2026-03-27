import { Metadata } from 'next';
import { ResetPasswordForm } from '@/components/forms/ResetPasswordForm';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { FormTitle } from '@/components/forms/FormTitle';

export const metadata: Metadata = {
  title: 'Nova lozinka | Новый пароль',
  description: 'Postavite novu lozinku za DomGo.rs nalog. Установите новый пароль для аккаунта DomGo.rs.',
  robots: { index: false, follow: true },
};

export default function ResetPasswordPage() {
  return (
    <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md">
        <Card>
          <CardHeader>
            <FormTitle translationKey="auth.setNewPassword" />
          </CardHeader>
          <CardContent>
            <ResetPasswordForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
