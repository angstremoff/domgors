import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// ID для аналитики - их нужно будет заменить на реальные
const YANDEX_METRIKA_ID = '10081034' // Реальный ID Яндекс.Метрики
const GA_MEASUREMENT_ID = 'G-XXXXXXXXXX' // Замените на ваш реальный ID Google Analytics

const Analytics = () => {
  const location = useLocation()

  // Отслеживание изменений страницы
  useEffect(() => {
    // Отправка данных в Яндекс.Метрику при изменении страницы
    if (window.ym) {
      window.ym(YANDEX_METRIKA_ID, 'hit', location.pathname)
    }
    
    // Отправка данных в Google Analytics при изменении страницы
    if (window.gtag) {
      window.gtag('config', GA_MEASUREMENT_ID, {
        page_path: location.pathname,
      })
    }
  }, [location])

  // Инициализация Яндекс.Метрики
  useEffect(() => {
    // Проверка, чтобы не инициализировать дважды
    if (window.ym) return

    // Код для загрузки Яндекс.Метрики
    const scriptYm = document.createElement('script')
    scriptYm.async = true
    scriptYm.src = `https://mc.yandex.ru/metrika/tag.js`
    document.head.appendChild(scriptYm)

    scriptYm.onload = () => {
      window.ym = window.ym || function () {
        (window.ym.a = window.ym.a || []).push(arguments)
      }
      window.ym.l = 1 * Date.now()
      window.ym(YANDEX_METRIKA_ID, 'init', {
        clickmap: true,
        trackLinks: true,
        accurateTrackBounce: true,
        webvisor: true
      })
    }

    return () => {
      if (scriptYm && scriptYm.parentNode) {
        scriptYm.parentNode.removeChild(scriptYm)
      }
    }
  }, [])

  // Инициализация Google Analytics
  useEffect(() => {
    // Проверка, чтобы не инициализировать дважды
    if (window.gtag) return

    // Код для загрузки Google Analytics (gtag.js)
    const scriptGa = document.createElement('script')
    scriptGa.async = true
    scriptGa.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`
    document.head.appendChild(scriptGa)

    // Инициализация Google Analytics
    const scriptInit = document.createElement('script')
    scriptInit.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${GA_MEASUREMENT_ID}');
    `
    document.head.appendChild(scriptInit)

    return () => {
      if (scriptGa && scriptGa.parentNode) {
        scriptGa.parentNode.removeChild(scriptGa)
      }
      if (scriptInit && scriptInit.parentNode) {
        scriptInit.parentNode.removeChild(scriptInit)
      }
    }
  }, [])

  return null // Компонент ничего не рендерит
}

// Добавим типы для глобальных объектов
declare global {
  interface Window {
    ym: any
    gtag: any
  }
}

export default Analytics
