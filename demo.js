/**
 * Otomatik tanıtım turu — yalnızca ?demo=1 ile yüklenir.
 * Uygulama koduna dokunmaz, mevcut arayüzü sırayla sürer.
 */
(function () {
    const $ = (s) => document.querySelector(s);
    const app = () => window.anatomyApp;

    function only(...ids) {
        const a = app();
        a.layers.forEach((l, k) => { l.visible = ids.includes(k); });
        a.activeSystem = ids[ids.length - 1];
        a.showSystemInfo(a.activeSystem);
        a.refreshSystemList();
        a.repaintAll();
    }

    function toggle(id, on) {
        const el = document.getElementById(id);
        if (!el || el.checked === on) return;
        el.checked = on;
        el.dispatchEvent(new Event('change'));
    }

    function slider(id, value) {
        const el = document.getElementById(id);
        if (!el) return;
        el.value = value;
        el.dispatchEvent(new Event('input'));
    }

    /** Ekran oranından ışın atıp yapıyı seçer (imleç hareketini taklit eder). */
    function pick(fx, fy) {
        const a = app();
        a.pointer.x = fx * 2 - 1;
        a.pointer.y = -(fy * 2 - 1);
        a.pointerPx = { x: fx * a.width, y: fy * a.height };
        a.hovered = null;
        a.checkHover();
        if (a.hovered) a.selectStructure();
        return a.hovered;
    }

    const STEPS = [
        { t: 0,    cap: 'Tam boy insan anatomisi — 1.969 ayrı yapı, 7 sistem', run: (a) => { only('iskelet'); a.setCamera('front'); } },
        { t: 5.5,  cap: 'İskelet Sistemi — 277 kemik ve kıkırdak yapısı',      run: (a) => a.setCamera('head') },
        { t: 10,   cap: 'Kafatası, omurga, göğüs kafesi — her kemik ayrı obje', run: (a) => a.setCamera('torso') },
        { t: 15,   cap: 'Eklemler — bağlar ve eklem kapsülleri',               run: (a) => { only('iskelet', 'eklem'); a.setCamera('front'); } },
        { t: 21,   cap: 'Kas Sistemi — 683 kas, iskeletin üzerine oturuyor',   run: (a) => { only('iskelet', 'kas'); } },
        { t: 27,   cap: 'Kasların üstündeki fasya tabakası — açıp kapatılabilir', run: () => toggle('cover-toggle', true) },
        { t: 32,   cap: 'Fasya kapalı: kas karınları tek tek görünür',         run: () => toggle('cover-toggle', false) },
        { t: 36,   cap: 'Dolaşım Sistemi — kalp, arter ve venler',             run: (a) => { only('iskelet', 'dolasim'); a.setCamera('torso'); } },
        { t: 42,   cap: 'Sinir Sistemi — beyin, omurilik ve çevresel sinirler', run: (a) => { only('iskelet', 'sinir'); a.setCamera('front'); } },
        { t: 48,   cap: 'İç Organlar — sindirim, solunum, üriner sistem',      run: (a) => { only('iskelet', 'ic-organlar'); a.setCamera('torso'); } },
        { t: 53.5, cap: 'Her yapıya tıklanabilir — adı anında panelde',        run: () => { pick(0.52, 0.45) || pick(0.48, 0.42) || pick(0.55, 0.5); } },
        { t: 58,   cap: 'Lenf Sistemi — düğümler, dalak, timus',               run: (a) => { only('iskelet', 'lenf'); a.setCamera('front'); } },
        { t: 63,   cap: 'Katmanlar üst üste — saydamlık ayarlanabilir',        run: (a) => {
            a.layers.forEach((l) => { l.visible = true; });
            a.activeSystem = 'kas'; a.showSystemInfo('kas'); a.refreshSystemList();
            slider('opacity-slider', 30);
        } },
        { t: 69,   cap: 'Röntgen modu — tel kafes görünümü',                   run: () => toggle('xray-toggle', true) },
        { t: 73,   cap: 'yapayzekaokulum.com',                                 run: (a) => {
            toggle('xray-toggle', false);
            slider('opacity-slider', 16);
            only('iskelet', 'kas');
            a.setCamera('front');
        } }
    ];

    function buildCaption() {
        const bar = document.createElement('div');
        bar.id = 'demo-caption';
        bar.style.cssText = [
            'position:fixed', 'left:50%', 'bottom:74px', 'transform:translateX(-50%)',
            'padding:11px 26px', 'border-radius:999px', 'z-index:9999',
            'background:rgba(10,13,19,0.86)', 'backdrop-filter:blur(14px)',
            'border:1px solid rgba(127,178,229,0.3)',
            'box-shadow:0 8px 40px rgba(0,0,0,0.5)',
            'color:#e9eef6', 'font:600 15px/1.3 Inter,system-ui,sans-serif',
            'white-space:nowrap', 'opacity:0', 'transition:opacity .4s ease'
        ].join(';');
        document.body.appendChild(bar);
        return bar;
    }

    async function start() {
        const a = app();
        const bar = buildCaption();

        // Tur sırasında takılma olmasın diye hepsini önceden yükle
        for (const s of ['iskelet', 'eklem', 'kas', 'dolasim', 'sinir', 'ic-organlar', 'lenf']) {
            await a.loadSystem(s);
        }
        only('iskelet');

        STEPS.forEach((s) => {
            setTimeout(() => {
                bar.style.opacity = '0';
                setTimeout(() => { bar.textContent = s.cap; bar.style.opacity = '1'; }, 240);
                try { s.run(a); } catch (e) { console.warn('demo adımı atlandı', e); }
            }, s.t * 1000);
        });

        setTimeout(() => { bar.style.opacity = '0'; }, 79000);
    }

    const delay = Number(new URLSearchParams(location.search).get('delay') || 2000);
    const t0 = performance.now();
    const wait = setInterval(() => {
        const a = app();
        if (a && a.layers.size && performance.now() - t0 >= delay) {
            clearInterval(wait);
            start();
        }
    }, 150);
})();
