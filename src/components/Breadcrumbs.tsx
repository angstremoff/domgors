import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Fragment, useMemo } from 'react';

interface BreadcrumbItem {
  label: string;
  path: string;
  isLast: boolean;
}

const Breadcrumbs = () => {
  const location = useLocation();
  const { t } = useTranslation();
  
  const breadcrumbs = useMemo(() => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    
    // Базовый путь на главную
    const items: BreadcrumbItem[] = [
      {
        label: t('common.home'),
        path: '/',
        isLast: pathSegments.length === 0
      }
    ];
    
    // Добавляем пути на основе сегментов URL
    if (pathSegments.length > 0) {
      pathSegments.forEach((segment, index) => {
        const path = `/${pathSegments.slice(0, index + 1).join('/')}`;
        let label = '';
        
        // Преобразуем URL в понятные названия
        switch (segment) {
          case 'rent':
            label = t('common.rent');
            break;
          case 'buy':
            label = t('common.buy');
            break;
          case 'sale':
            label = t('common.sale');
            break;
          case 'favorites':
            label = t('common.favorites');
            break;
          case 'property':
            label = t('common.propertyDetails');
            break;
          case 'profile':
            label = t('common.profile');
            break;
          default:
            // Если сегмент это ID, используем обобщенное имя
            if (/^\d+$/.test(segment)) {
              label = t('common.propertyDetails');
            } else {
              label = segment;
            }
        }
        
        items.push({
          label,
          path,
          isLast: index === pathSegments.length - 1
        });
      });
    }
    
    return items;
  }, [location.pathname, t]);
  
  if (breadcrumbs.length <= 1) {
    return null; // Не показываем хлебные крошки на главной странице
  }

  return (
    <nav className="flex" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-2">
        {breadcrumbs.map((breadcrumb, index) => (
          <Fragment key={breadcrumb.path}>
            {index > 0 && (
              <li aria-hidden="true">
                <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              </li>
            )}
            
            <li className="flex items-center">
              {breadcrumb.isLast ? (
                <span className="text-sm font-medium text-gray-500">
                  {/* Вместо ключа показываем текст с переводом */}
                  {breadcrumb.label.startsWith('common.') 
                    ? t(breadcrumb.label) 
                    : breadcrumb.label}
                </span>
              ) : (
                <Link 
                  to={breadcrumb.path} 
                  className="text-sm font-medium text-primary-600 hover:text-primary-800 hover:underline"
                >
                  {/* Вместо ключа показываем текст с переводом */}
                  {breadcrumb.label.startsWith('common.') 
                    ? t(breadcrumb.label) 
                    : breadcrumb.label}
                </Link>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
