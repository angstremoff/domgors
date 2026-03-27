import { Metadata } from 'next';
import { ForgotPasswordForm } from '@/components/forms/ForgotPasswordForm';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { FormTitle } from '@/components/forms/FormTitle';

export const metadata: Metadata = {
  title: 'Oporavak lozinke | Восстановление пароля',
  description: 'Zatražite email za oporavak lozinke na DomGo.rs. Запросите письмо для восстановления пароля DomGo.rs.',
  robots: { index: false, follow: true },
};

export default function ForgotPasswordPage() {
  return (
    <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md">
        <Card>
          <CardHeader>
            <FormTitle translationKey="auth.resetPassword" />
          </CardHeader>
          <CardContent>
            <ForgotPasswordForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
