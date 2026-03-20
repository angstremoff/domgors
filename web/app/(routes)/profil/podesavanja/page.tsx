'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { ChevronRight, LogOut, Bell, Info, Phone, FileText, ExternalLink } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

export default function PodesavanjaPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const { user, signOut } = useAuth();
    const [modalOpen, setModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [modalMessage, setModalMessage] = useState('');

    const showModal = (title: string, message: string) => {
        setModalTitle(title);
        setModalMessage(message);
        setModalOpen(true);
    };

    const handleLogout = async () => {
        await signOut();
        router.push('/');
        router.refresh();
    };

    const appVersion = '1.0.11';

    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="flex items-center gap-4 mb-6">
                    <Link href="/profil">
                        <Button variant="outline" size="sm">
                            ← {t('common.back')}
                        </Button>
                    </Link>
                    <h1 className="text-3xl font-bold text-text">{t('settings.title')}</h1>
                </div>

                {/* Уведомления */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bell className="h-5 w-5" />
                            {t('settings.notifications')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between py-3 border-b border-border">
                            <span className="text-text">{t('settings.newPropertyNotifications')}</span>
                            <button
                                className="relative w-12 h-6 rounded-full bg-primary cursor-pointer"
                                onClick={() => showModal(t('settings.notificationNote.title'), t('settings.notificationNote.message'))}
                            >
                                <span className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full transition-all" />
                            </button>
                        </div>
                    </CardContent>
                </Card>

                {/* Аккаунт */}
                {user && (
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('settings.account')}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between py-2">
                                    <span className="text-textSecondary">Email</span>
                                    <span className="text-text">{user.email}</span>
                                </div>
                                <Button
                                    variant="outline"
                                    className="w-full text-red-500 border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    onClick={handleLogout}
                                >
                                    <LogOut className="h-4 w-4 mr-2" />
                                    {t('common.logout')}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* О приложении */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Info className="h-5 w-5" />
                            {t('settings.about')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                        <div className="flex items-center justify-between py-3 border-b border-border">
                            <span className="text-text">{t('settings.version')}</span>
                            <span className="text-textSecondary">{appVersion}</span>
                        </div>

                        <button
                            className="flex items-center justify-between py-3 border-b border-border w-full text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors -mx-4 px-4"
                            onClick={() => showModal(t('settings.aboutApp.title'), t('settings.aboutApp.message'))}
                        >
                            <span className="text-text">{t('settings.help')}</span>
                            <ChevronRight className="h-5 w-5 text-textSecondary" />
                        </button>

                        <a
                            href="https://www.rustore.ru/catalog/app/domgo.rs"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between py-3 border-b border-border w-full text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors -mx-4 px-4"
                        >
                            <span className="text-text">{t('settings.update.openRuStore')}</span>
                            <ExternalLink className="h-5 w-5 text-primary" />
                        </a>

                        <button
                            className="flex items-center justify-between py-3 border-b border-border w-full text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors -mx-4 px-4"
                            onClick={() => showModal(t('settings.contactInfo.title'), t('settings.contactInfo.message'))}
                        >
                            <span className="text-text">{t('settings.contactUs')}</span>
                            <ChevronRight className="h-5 w-5 text-textSecondary" />
                        </button>

                        <button
                            className="flex items-center justify-between py-3 w-full text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors -mx-4 px-4"
                            onClick={() => showModal(t('settings.listingTerms.title'), t('settings.listingTerms.message'))}
                        >
                            <span className="text-text">{t('settings.listingTerms.title')}</span>
                            <ChevronRight className="h-5 w-5 text-textSecondary" />
                        </button>
                    </CardContent>
                </Card>

                {/* Модальное окно */}
                {modalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setModalOpen(false)}>
                        <div className="bg-background rounded-lg shadow-xl max-w-md w-full mx-4 p-6" onClick={e => e.stopPropagation()}>
                            <h3 className="text-xl font-bold text-text mb-4">{modalTitle}</h3>
                            <p className="text-textSecondary whitespace-pre-line mb-6">{modalMessage}</p>
                            <Button className="w-full" onClick={() => setModalOpen(false)}>
                                {t('common.ok')}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
