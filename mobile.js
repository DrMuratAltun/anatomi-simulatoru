/**
 * Mobil çekmece davranışı (<= 860px).
 *
 * Masaüstünde paneller sabit yan sütunlardır ve bu dosya hiçbir şey yapmaz.
 * Telefonda ise paneller alttan açılan çekmeceye dönüşür; aynı anda yalnız
 * biri açık kalır, sahneye dokununca kapanır.
 */
(function () {
    const MOBILE = () => window.matchMedia('(max-width: 860px)').matches;

    const bar = document.getElementById('mobile-bar');
    if (!bar) return;

    const panels = {
        'left-panel': document.querySelector('.left-panel'),
        'info-panel': document.getElementById('info-panel')
    };

    function setOpen(id) {
        Object.entries(panels).forEach(([key, el]) => {
            if (!el) return;
            el.classList.toggle('open', key === id);
        });
        bar.querySelectorAll('.mob-btn').forEach((b) => {
            b.classList.toggle('active', b.dataset.panel === id);
        });
    }

    function closeAll() { setOpen(null); }

    bar.addEventListener('click', (e) => {
        const btn = e.target.closest('.mob-btn');
        if (!btn) return;
        const id = btn.dataset.panel;
        const isOpen = panels[id] && panels[id].classList.contains('open');
        setOpen(isOpen ? null : id);
    });

    // Sahneye dokununca çekmeceyi kapat (model görünsün).
    //
    // ÖNEMLİ: bu dokunuş SEÇİM sayılmamalı. Aksi halde menüyü kapatmak için
    // modele dokunmak, altta duran sönük katmandaki bir yapıyı seçiyor ve
    // uygulama o yapının sistemine geçiyordu — "dolaşımı seçtim, menüyü
    // kapatınca iskelete döndü" hatası buydu.
    const app = () => window.anatomyApp || window.simulatorApp;
    const canvas = document.getElementById('canvas-container');
    if (canvas) {
        canvas.addEventListener('pointerdown', () => {
            if (!MOBILE()) return;
            const acikVar = Object.values(panels).some((el) => el && el.classList.contains('open'));
            if (!acikVar) return;
            closeAll();
            const a = app();
            if (a) a.suppressTap = true;   // bu dokunuş yalnız kapatma içindir
        }, true);
    }

    // Bir yapı seçilince bilgi kartını otomatik aç — mobilde asıl beklenen bu.
    const info = panels['info-panel'];
    if (info) {
        const obs = new MutationObserver(() => {
            if (!MOBILE()) return;
            const block = document.getElementById('structure-block');
            if (block && !block.hidden) setOpen('info-panel');
        });
        const block = document.getElementById('structure-block');
        if (block) obs.observe(block, { attributes: true, attributeFilter: ['hidden'] });
    }

    // Masaüstüne dönülürse inline durumları temizle
    window.addEventListener('resize', () => { if (!MOBILE()) closeAll(); });
})();
