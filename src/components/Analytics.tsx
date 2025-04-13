import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// ID для аналитики - их нужно будет заменить на реальные
const YANDEX_METRIKA_ID = '10081034' // Реальный ID Яндекс.Метрики
const GA_MEASUREMENT_ID = 'G-B3K5RCDEFZ' // Реальный ID Google Analytics из вашего кода

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
    if (document.getElementById('yandex-metrika-script')) return

    // Создаем носкрипт элемент для тех, у кого отключен JavaScript
    const noscript = document.createElement('noscript')
    const img = document.createElement('img')
    img.src = `https://mc.yandex.ru/watch/${YANDEX_METRIKA_ID}`
    img.style.position = 'absolute'
    img.style.left = '-9999px'
    img.alt = ''
    noscript.appendChild(img)
    document.body.appendChild(noscript)

    // Правильная инициализация Яндекс.Метрики
    const scriptInit = document.createElement('script')
    scriptInit.id = 'yandex-metrika-init'
    scriptInit.innerHTML = `
      (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
      m[i].l=1*new Date();
      for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) return;}
      k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
      (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

      ym(${YANDEX_METRIKA_ID}, "init", {
         clickmap:true,
         trackLinks:true,
         accurateTrackBounce:true,
         webvisor:true
      });
    `
    document.head.appendChild(scriptInit)

    console.log('Яндекс.Метрика инициализирована с ID:', YANDEX_METRIKA_ID)

    return () => {
      const script = document.getElementById('yandex-metrika-init')
      if (script && script.parentNode) {
        script.parentNode.removeChild(script)
      }
      if (noscript && noscript.parentNode) {
        noscript.parentNode.removeChild(noscript)
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
