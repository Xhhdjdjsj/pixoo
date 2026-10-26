/* PIXO FX: маркеры выделения, прожектор, магнитные кнопки, курсор-узел, бегущая строка */
(() => {
  const d = document, $ = (s) => d.querySelector(s)
  const rm = matchMedia('(prefers-reduced-motion:reduce)').matches
  const CARD = '.st,.cd,.bc,.ws,.hero-art-card,.gallery-project-card,.gallery-create-card,[class$="-card"],[class$="card"]'
  const BTN = '.btn,.gallery-create-button'

  d.addEventListener('pointermove', (e) => {
    const t = e.target
    if (!t.closest) return
    const c = t.closest(CARD)
    if (c && c.offsetWidth > 90 && c.offsetHeight > 60) {
      if (!c.querySelector(':scope>.hd')) {
        if (getComputedStyle(c).position === 'static') c.style.position = 'relative'
        const h = d.createElement('i')
        h.className = 'hd'
        h.innerHTML = '<b></b><b></b><b></b><b></b>'
        c.appendChild(h)
      }
      const r = c.getBoundingClientRect()
      c.style.setProperty('--mx', e.clientX - r.left + 'px')
      c.style.setProperty('--my', e.clientY - r.top + 'px')
    }
    const b = t.closest(BTN)
    if (b && !rm) {
      const r = b.getBoundingClientRect()
      b.style.translate = (e.clientX - r.left - r.width / 2) * 0.18 + 'px ' + (e.clientY - r.top - r.height / 2) * 0.28 + 'px'
    }
  }, { passive: true })

  d.addEventListener('pointerout', (e) => {
    const b = e.target.closest && e.target.closest(BTN)
    if (b) b.style.translate = ''
  }, true)

  // курсор-узел: только там, где у страницы нет собственного #cur
  const start = () => {
    if (!d.body || $('#cur') || rm || !matchMedia('(hover:hover)').matches) return
    const c = d.createElement('div')
    c.className = 'fxc'
    d.body.appendChild(c)
    let x = 0, y = 0, tx = 0, ty = 0
    addEventListener('pointermove', (e) => {
      tx = e.clientX; ty = e.clientY
      c.classList.toggle('on', !$('#root') || !!e.target.closest('.studio-projects'))
      c.classList.toggle('hot', !!e.target.closest('a,button,input,[class$="card"]'))
    }, { passive: true })
    ;(function f() { x += (tx - x) * 0.2; y += (ty - y) * 0.2; c.style.transform = 'translate(' + x + 'px,' + y + 'px)'; requestAnimationFrame(f) })()
  }

  // бегущая строка с именами компонентов — только на лендинге
  const ticker = () => {
    const how = $('#how')
    if (!how || $('.tick')) return
    const w = ['КНИГА', 'ПАЗЛ', 'СМАРТФОН', 'НАУШНИКИ', 'ЛАМПА', 'МОНЕТА', 'БЛОКНОТ', 'КАРАНДАШ', 'ЦВЕТЫ', 'SVG']
    const row = w.map((s) => s + '<b>✦</b>').join('')
    const t = d.createElement('div')
    t.className = 'tick'
    t.setAttribute('aria-hidden', 'true')
    t.innerHTML = '<div>' + row + row + '</div>'
    how.parentNode.insertBefore(t, how)
  }

  const init = () => { start(); ticker() }
  d.readyState === 'loading' ? d.addEventListener('DOMContentLoaded', init) : init()
})()
