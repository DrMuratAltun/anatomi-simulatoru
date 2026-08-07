/**
 * Dikey (9:16) tanıtım turu — Instagram/Reels için.  ?demo=dikey
 *
 * Yatay turdan farkı: paneller kapalı kalır, model tam ekran döner, altyazı
 * büyük ve okunaklıdır. Üreme sistemi katmanı kapalıdır (varsayılan).
 */
(function () {
    const app = () => window.anatomyApp;

    function goster(...ids) {
        const a = app();
        a.layers.forEach((l, k) => { l.visible = ids.includes(k); });
        a.activeSystem = ids[ids.length - 1];
        a.showSystemInfo(a.activeSystem);
        a.refreshSystemList();
        a.repaintAll();
    }

    function kamera(preset) { app().setCamera(preset); }

    const ADIM = [
        { t: 0,    ust: 'Tam Boy İnsan Anatomisi',  alt: '7 sistem · 1.969 yapı · tarayıcıda',
          yap: (a) => { goster('iskelet'); kamera('front'); } },
        { t: 5.5,  ust: 'İskelet Sistemi',          alt: '277 kemik ve kıkırdak yapısı',
          yap: () => kamera('front') },
        { t: 11,   ust: 'Kas Sistemi',              alt: '683 kas, iskeletin üzerinde',
          yap: (a) => goster('iskelet', 'kas') },
        { t: 17,   ust: 'Dolaşım Sistemi',          alt: '356 arter · 203 ven · kalp',
          yap: (a) => goster('dolasim') },
        { t: 23,   ust: 'Dolaşım Sistemi',          alt: 'damar ağacı baştan ayağa',
          yap: () => kamera('torso') },
        { t: 28,   ust: 'Sinir Sistemi',            alt: 'beyin, omurilik, 266 sinir',
          yap: (a) => { goster('iskelet', 'sinir'); kamera('front'); } },
        { t: 34,   ust: 'İç Organlar',              alt: 'sindirim · solunum · üriner',
          yap: (a) => { goster('iskelet', 'ic-organlar'); kamera('torso'); } },
        { t: 39.5, ust: 'Her yapı tıklanabilir',    alt: 'adı anında görünür',
          yap: (a) => { goster('iskelet', 'kas'); kamera('front'); } },
        { t: 45,   ust: 'Açık kaynak · ücretsiz',   alt: 'yapayzekaokulum.com',
          yap: (a) => { a.layers.forEach((l) => { l.visible = true; }); a.repaintAll(); } }
    ];

    function altyaziKur() {
        const kutu = document.createElement('div');
        kutu.id = 'ig-caption';
        kutu.style.cssText = [
            'position:fixed', 'left:0', 'right:0', 'bottom:104px',
            'z-index:9999', 'text-align:center', 'pointer-events:none',
            'padding:0 18px', 'opacity:0', 'transition:opacity .4s ease'
        ].join(';');
        kutu.innerHTML =
            '<div id="ig-ust" style="font:800 26px/1.2 Inter,system-ui,sans-serif;' +
            'color:#fff;text-shadow:0 2px 18px rgba(0,0,0,.85);letter-spacing:-0.01em"></div>' +
            '<div id="ig-alt" style="margin-top:6px;font:500 15px/1.35 Inter,system-ui,sans-serif;' +
            'color:#9fc9f0;text-shadow:0 2px 14px rgba(0,0,0,.85)"></div>';
        document.body.appendChild(kutu);
        return kutu;
    }

    async function basla() {
        const a = app();

        // Tur boyunca arayüz sade: çekmeceler kapalı, alt çubuk gizli
        document.querySelectorAll('.left-panel, .right-panel').forEach((el) => el.classList.remove('open'));
        const cubuk = document.getElementById('mobile-bar');
        if (cubuk) cubuk.style.display = 'none';

        for (const s of ['iskelet', 'kas', 'dolasim', 'sinir', 'ic-organlar', 'lenf', 'eklem']) {
            await a.loadSystem(s);
        }
        // Tanıtım videosunda üreme sistemi kapalı (sayfada varsayılan açık)
        a.showGenital = false;
        const gt = document.getElementById('genital-toggle');
        if (gt) gt.checked = false;

        a.autoSpin = true;          // "evir çevir"
        goster('iskelet');

        const kutu = altyaziKur();
        const ust = document.getElementById('ig-ust');
        const alt = document.getElementById('ig-alt');

        ADIM.forEach((s) => {
            setTimeout(() => {
                kutu.style.opacity = '0';
                setTimeout(() => {
                    ust.textContent = s.ust;
                    alt.textContent = s.alt;
                    kutu.style.opacity = '1';
                }, 240);
                try { s.yap(a); } catch (e) { console.warn('adım atlandı', e); }
            }, s.t * 1000);
        });

        setTimeout(() => { kutu.style.opacity = '0'; }, 51000);
    }

    const delay = Number(new URLSearchParams(location.search).get('delay') || 2000);
    const t0 = performance.now();
    const bekle = setInterval(() => {
        const a = app();
        if (a && a.layers.size && performance.now() - t0 >= delay) {
            clearInterval(bekle);
            basla();
        }
    }, 150);
})();
