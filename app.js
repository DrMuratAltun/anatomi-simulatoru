/**
 * Tam Boy Anatomi Simülatörü
 * Model: Z-Anatomy (CC-BY-SA 4.0) / BodyParts3D — DBCLS (CC-BY-SA 2.1 JP)
 *
 * Mimari notu: her sistem GLB'sinde yapılar AYRI mesh olarak gelir (278–684 adet).
 * Bunları çizim çağrısı başına 1'e indirmek için tek bir BufferGeometry'de
 * birleştirip her köşeye `structureId` yazıyoruz. Işın testi vurduğu üçgenin
 * köşesinden id'yi okuyup yapının GERÇEK adını veriyor — beyin simülatöründeki
 * gibi koordinat tahminine gerek yok.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// -------------------------------------------------------------
// SİSTEM TANIMLARI
// -------------------------------------------------------------
const SYSTEMS = [
    {
        id: 'iskelet', ad: 'İskelet Sistemi', latin: 'Systema skeletale', hex: '#e8dcc8',
        desc: 'Vücudun taşıyıcı çatısı. 206 kemik; hareket için kaldıraç, iç organlar için zırh, ' +
              'kan hücreleri için üretim yeri (kırmızı kemik iliği) ve kalsiyum/fosfat deposu.',
        oncelik: 0
    },
    {
        id: 'eklem', ad: 'Eklemler', latin: 'Articulationes', hex: '#9fd8cb',
        desc: 'Kemikleri birbirine bağlayan yapılar: sinovyal (hareketli), kıkırdaksı ve lifli eklemler ' +
              'ile bağlar (ligament). Hareket açıklığını belirler ve eklemi stabilize eder.',
        oncelik: 1
    },
    {
        id: 'kas', ad: 'Kas Sistemi', latin: 'Systema musculare', hex: '#c8564f',
        desc: 'İskelet kasları, iskelete tutunarak istemli hareketi üretir. Aynı zamanda duruşu korur, ' +
              'eklemleri stabilize eder ve titreme yoluyla ısı üretir.',
        oncelik: 2
    },
    {
        id: 'dolasim', ad: 'Dolaşım Sistemi', latin: 'Systema cardiovasculare', hex: '#d94f5c',
        desc: 'Kalp ve damarlar. Oksijen, besin, hormon ve ısıyı taşır; atık ürünleri boşaltım ' +
              'organlarına götürür. Büyük ve küçük (pulmoner) dolaşım olmak üzere iki devre.',
        oncelik: 3
    },
    {
        id: 'sinir', ad: 'Sinir Sistemi', latin: 'Systema nervosum', hex: '#f2c14e',
        desc: 'Merkezi (beyin, omurilik) ve çevresel sinir sistemi ile duyu organları. Bilgiyi alır, ' +
              'işler ve yanıt üretir; tüm sistemlerin eşgüdümünü sağlar.',
        oncelik: 4
    },
    {
        id: 'ic-organlar', ad: 'İç Organlar', latin: 'Systemata visceralia', hex: '#c98a5e',
        desc: 'Sindirim, solunum, üriner ve genital sistemler. Besinin sindirimi, gaz değişimi, ' +
              'kanın süzülmesi ve üreme işlevleri bu organlarda yürütülür.',
        oncelik: 5
    },
    {
        id: 'lenf', ad: 'Lenf Sistemi', latin: 'Systema lymphoideum', hex: '#7fb2e5',
        desc: 'Lenf damarları, düğümler, dalak ve timus. Doku sıvısını dolaşıma geri döndürür, ' +
              'yağ emilimine katılır ve bağışıklık yanıtının merkezini oluşturur.',
        oncelik: 6
    }
];

// Yapı adı ekleri: .l/.r taraf, parantez = alternatif/eski terim
const SIDE_LABELS = { l: 'Sol', r: 'Sağ', ol: 'Sol (dış)', or: 'Sağ (dış)' };

// Örtü katmanları: altındaki yapıları tamamen kapatan zarlar. Anatomik olarak
// doğru ama açıkken kasları/organları göstermiyor, o yüzden ayrı mesh'e alınıp
// varsayılan olarak kapatılıyor.
const COVER_RE = /fascia|aponeuros|retinacul|peritone|pleura|dura mater|pericardi|omentum|epicardium/i;
const isCover = (name) => COVER_RE.test(name);

function parseStructureName(raw) {
    let name = (raw || '').trim();
    let side = null;

    const m = name.match(/\.(ol|or|l|r)$/i);
    if (m) {
        side = SIDE_LABELS[m[1].toLowerCase()] || null;
        name = name.slice(0, -m[0].length);
    }
    // Blender kopya eki
    name = name.replace(/\.\d{3}$/, '');

    let note = null;
    if (/^\(.*\)$/.test(name)) {
        name = name.slice(1, -1);
        note = 'Alternatif / eski terim';
    }
    return { name: name.trim(), side, note };
}

// -------------------------------------------------------------
// UYGULAMA
// -------------------------------------------------------------
class AnatomyApp {
    constructor() {
        this.container = document.getElementById('canvas-container');
        const rect = this.container.getBoundingClientRect();
        this.width = Math.max(1, Math.round(rect.width) || window.innerWidth);
        this.height = Math.max(1, Math.round(rect.height) || window.innerHeight);

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0d13);
        this.scene.fog = new THREE.FogExp2(0x0a0d13, 0.028);

        this.camera = new THREE.PerspectiveCamera(42, this.width / this.height, 0.05, 200);
        this.camera.position.set(0, 0.2, 6.2);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.15;
        this.container.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.06;
        this.controls.minDistance = 0.4;
        this.controls.maxDistance = 20;

        // Dış grup yalnız DÖNER, iç grup ölçek/merkezleme taşır.
        // Tek grupta yapılırsa matris sırası (T·R·S) yüzünden model dönerken
        // merkezden kayıyor.
        this.bodyGroup = new THREE.Group();
        this.bodyPivot = new THREE.Group();
        this.bodyGroup.add(this.bodyPivot);
        this.scene.add(this.bodyGroup);

        this.loader = new GLTFLoader();
        this.layers = new Map();        // id -> {names, parts:[{kind,mesh,structureIds,colorAttr}], visible}
        this.loading = new Set();
        this.activeSystem = null;
        this.hovered = null;            // {systemId, structureId}
        this.selected = null;
        this.normalized = false;        // gövde ölçek/merkez dönüşümü uygulandı mı
        this.autoSpin = true;
        this.showHoverName = true;
        this.showCovers = false;     // fasya/periton gibi örtü zarları
        this.dimOpacity = 0.16;

        this.raycaster = new THREE.Raycaster();
        this.pointer = new THREE.Vector2(-999, -999);
        this.pointerPx = { x: 0, y: 0 };

        this.initLights();
        this.buildSystemList();
        this.initEvents();

        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);

        this.selectSystem('iskelet');
    }

    initLights() {
        this.scene.add(new THREE.HemisphereLight(0xbcd4ff, 0x2a2118, 0.85));

        const key = new THREE.DirectionalLight(0xfff2e0, 1.7);
        key.position.set(3, 6, 5);
        this.scene.add(key);

        const fill = new THREE.DirectionalLight(0x9fc2ff, 0.6);
        fill.position.set(-5, 1, 3);
        this.scene.add(fill);

        const rim = new THREE.DirectionalLight(0xffffff, 0.75);
        rim.position.set(0, 3, -6);
        this.scene.add(rim);
    }

    // ---------------------------------------------------------
    // SİSTEM YÜKLEME + BİRLEŞTİRME
    // ---------------------------------------------------------
    async loadSystem(id) {
        if (this.layers.has(id) || this.loading.has(id)) return this.layers.get(id);
        this.loading.add(id);
        this.setLoading(true, `${SYSTEMS.find(s => s.id === id).ad} yükleniyor…`);

        const gltf = await this.loader.loadAsync(`systems/${id}.glb`);

        // three.js GLTFLoader node adlarını animasyon bağlaması için sterilize
        // eder (nokta silinir, boşluk "_" olur) -> "Incus.l" adı "Incusl" olur.
        // Orijinal adı glTF JSON'undan associations üzerinden okuyoruz.
        const json = gltf.parser.json;
        const assoc = gltf.parser.associations;
        const originalName = (obj) => {
            const a = assoc.get(obj);
            if (a && a.nodes !== undefined && json.nodes[a.nodes]) {
                return json.nodes[a.nodes].name || obj.name;
            }
            return obj.name;
        };

        // Yapıları "ana" ve "örtü" olarak iki gruba ayırıp her grubu tek
        // geometride birleştir; köşe başına structureId yaz.
        const buckets = { main: [], cover: [] };
        const names = [];
        gltf.scene.updateMatrixWorld(true);
        gltf.scene.traverse((child) => {
            if (!child.isMesh) return;
            const geom = child.geometry.clone();
            geom.applyMatrix4(child.matrixWorld);
            geom.deleteAttribute('uv');
            geom.deleteAttribute('tangent');
            if (!geom.attributes.normal) geom.computeVertexNormals();

            const structureId = names.length;
            const name = originalName(child) || `Yapı ${structureId}`;
            names.push(name);

            const n = geom.attributes.position.count;
            const ids = new Float32Array(n).fill(structureId);
            geom.setAttribute('structureId', new THREE.BufferAttribute(ids, 1));
            buckets[isCover(name) ? 'cover' : 'main'].push(geom);
        });

        const sys = SYSTEMS.find(s => s.id === id);
        const layer = {
            id, names,
            baseColor: new THREE.Color(sys.hex),
            visible: true,
            parts: []
        };

        for (const kind of ['main', 'cover']) {
            if (!buckets[kind].length) continue;
            const merged = mergeGeometries(buckets[kind]);
            buckets[kind].forEach(g => g.dispose());
            const colors = new Float32Array(merged.attributes.position.count * 3);
            merged.setAttribute('color', new THREE.BufferAttribute(colors, 3));

            const mesh = new THREE.Mesh(merged, new THREE.MeshStandardMaterial({
                vertexColors: true,
                roughness: kind === 'cover' ? 0.5 : 0.62,
                metalness: 0.03,
                transparent: true,
                opacity: 1,
                side: THREE.DoubleSide
            }));
            mesh.name = `${id}:${kind}`;
            mesh.userData.systemId = id;
            mesh.visible = (kind === 'main') || this.showCovers;

            layer.parts.push({
                kind, mesh,
                structureIds: merged.attributes.structureId.array,
                colorAttr: merged.attributes.color
            });
            this.bodyPivot.add(mesh);
        }

        this.layers.set(id, layer);
        this.paintLayer(layer);

        if (!this.normalized) this.normalizeBody();

        this.loading.delete(id);
        if (this.loading.size === 0) this.setLoading(false);
        this.refreshSystemList();
        return layer;
    }

    /** Gövdeyi sahne merkezine al ve sabit boya ölçekle (ilk tam boy sistemden). */
    normalizeBody() {
        const box = new THREE.Box3().setFromObject(this.bodyPivot);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        if (size.y < 0.001) return;

        const scale = 3.4 / size.y;
        this.bodyPivot.scale.setScalar(scale);
        this.bodyPivot.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
        this.normalized = true;
        this.bodyHeight = 3.4;
        this.setCamera('front', false);
    }

    // ---------------------------------------------------------
    // RENKLENDİRME
    // ---------------------------------------------------------
    paintLayer(layer) {
        const base = layer.baseColor;
        const isActive = layer.id === this.activeSystem;

        const hoverId = (this.hovered && this.hovered.systemId === layer.id) ? this.hovered.structureId : -1;
        const selId = (this.selected && this.selected.systemId === layer.id) ? this.selected.structureId : -1;

        // Her yapıya kararlı (deterministik) küçük bir ton farkı: aynı sistemdeki
        // komşu kaslar/kemikler tek düz renk yerine ayırt edilebilir olsun.
        // Ton, structureId'den değil TEMEL ADDAN türetilir; böylece bir yapının
        // sol ve sağ eşi aynı rengi alır (aksi halde gövde ortadan ikiye
        // bölünmüş gibi görünüyordu).
        if (!layer.shades) {
            layer.shades = new Float32Array(layer.names.length);
            for (let s = 0; s < layer.names.length; s++) {
                const nm = parseStructureName(layer.names[s]).name;
                let h = 0;
                for (let c = 0; c < nm.length; c++) h = (h * 31 + nm.charCodeAt(c)) % 100003;
                layer.shades[s] = 0.82 + 0.30 * (h / 100003);
            }
        }
        const shades = layer.shades;
        const dim = isActive ? 1 : 0.55;

        for (const part of layer.parts) {
            const colors = part.colorAttr.array;
            const ids = part.structureIds;
            for (let i = 0; i < ids.length; i++) {
                const k = dim * shades[ids[i]];
                let r = base.r * k, g = base.g * k, b = base.b * k;
                if (ids[i] === selId) { r = 1.0; g = 0.86; b = 0.35; }
                else if (ids[i] === hoverId) {
                    r = Math.min(1, r * 1.5 + 0.18);
                    g = Math.min(1, g * 1.5 + 0.18);
                    b = Math.min(1, b * 1.5 + 0.18);
                }
                colors[i * 3] = r; colors[i * 3 + 1] = g; colors[i * 3 + 2] = b;
            }
            part.colorAttr.needsUpdate = true;

            const mat = part.mesh.material;
            mat.opacity = isActive ? (part.kind === 'cover' ? 0.5 : 1) : this.dimOpacity;
            mat.depthWrite = mat.opacity > 0.9;
            mat.transparent = mat.opacity < 0.999;
            part.mesh.visible = layer.visible && (part.kind === 'main' || this.showCovers);
        }
    }

    repaintAll() {
        this.layers.forEach(l => this.paintLayer(l));
    }

    // ---------------------------------------------------------
    // ETKİLEŞİM
    // ---------------------------------------------------------
    async selectSystem(id) {
        this.activeSystem = id;
        this.selected = null;
        document.getElementById('structure-block').hidden = true;
        this.refreshSystemList();
        this.showSystemInfo(id);
        await this.loadSystem(id);
        this.showSystemInfo(id);   // yapı sayısı ancak katman yüklenince bilinir
        this.repaintAll();
    }

    toggleLayer(id, on) {
        const layer = this.layers.get(id);
        if (on && !layer) { this.loadSystem(id); return; }
        if (!layer) return;
        layer.visible = on;
        this.paintLayer(layer);
        this.refreshSystemList();
    }

    checkHover() {
        if (!this.showHoverName) return;
        const meshes = [];
        this.layers.forEach(l => l.parts.forEach(p => { if (p.mesh.visible) meshes.push(p.mesh); }));
        if (!meshes.length) return;

        this.raycaster.setFromCamera(this.pointer, this.camera);
        const hits = this.raycaster.intersectObjects(meshes, false);

        if (!hits.length) {
            if (this.hovered) { this.hovered = null; this.repaintAll(); }
            this.hideTooltip();
            return;
        }

        const hit = hits[0];
        const layer = this.layers.get(hit.object.userData.systemId);
        const part = layer.parts.find(p => p.mesh === hit.object);
        const idx = this.nearestVertex(hit);
        const sid = part.structureIds[idx];

        if (!this.hovered || this.hovered.systemId !== layer.id || this.hovered.structureId !== sid) {
            this.hovered = { systemId: layer.id, structureId: sid };
            this.repaintAll();
        }
        this.showTooltip(layer.names[sid]);
    }

    nearestVertex(hit) {
        const pos = hit.object.geometry.attributes.position;
        const tmp = new THREE.Vector3();
        let best = hit.face.a, bestD = Infinity;
        for (const idx of [hit.face.a, hit.face.b, hit.face.c]) {
            tmp.fromBufferAttribute(pos, idx).applyMatrix4(hit.object.matrixWorld);
            const d = tmp.distanceToSquared(hit.point);
            if (d < bestD) { bestD = d; best = idx; }
        }
        return best;
    }

    selectStructure() {
        if (!this.hovered) return;
        this.selected = { ...this.hovered };
        const layer = this.layers.get(this.selected.systemId);
        const parsed = parseStructureName(layer.names[this.selected.structureId]);

        document.getElementById('structure-block').hidden = false;
        document.getElementById('structure-name').textContent = parsed.name;
        document.getElementById('structure-side').textContent =
            [parsed.side, parsed.note].filter(Boolean).join(' · ');

        if (this.selected.systemId !== this.activeSystem) this.selectSystem(this.selected.systemId);
        else this.repaintAll();
    }

    // ---------------------------------------------------------
    // ARAYÜZ
    // ---------------------------------------------------------
    buildSystemList() {
        const box = document.getElementById('system-list');
        box.innerHTML = '';
        SYSTEMS.forEach((s) => {
            const row = document.createElement('div');
            row.className = 'system-row';
            row.dataset.system = s.id;
            row.innerHTML = `
                <button class="sys-main" data-system="${s.id}">
                    <span class="sys-dot" style="--c:${s.hex}"></span>
                    <span class="sys-name">${s.ad}</span>
                    <span class="sys-count"></span>
                </button>
                <button class="sys-eye" data-eye="${s.id}" title="Katmanı aç/kapa" aria-label="Katmanı aç/kapa">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                </button>`;
            box.appendChild(row);
        });

        box.addEventListener('click', (e) => {
            const main = e.target.closest('.sys-main');
            if (main) { this.selectSystem(main.dataset.system); return; }
            const eye = e.target.closest('.sys-eye');
            if (eye) {
                const id = eye.dataset.eye;
                const layer = this.layers.get(id);
                this.toggleLayer(id, layer ? !layer.visible : true);
            }
        });
    }

    refreshSystemList() {
        SYSTEMS.forEach((s) => {
            const row = document.querySelector(`.system-row[data-system="${s.id}"]`);
            if (!row) return;
            const layer = this.layers.get(s.id);
            row.classList.toggle('active', s.id === this.activeSystem);
            row.classList.toggle('loaded', !!layer);
            row.classList.toggle('hidden-layer', !!layer && !layer.visible);
            row.classList.toggle('busy', this.loading.has(s.id));
            const count = row.querySelector('.sys-count');
            count.textContent = layer ? `${layer.names.length}` : '';
        });
    }

    showSystemInfo(id) {
        const s = SYSTEMS.find(x => x.id === id);
        document.getElementById('info-title').textContent = s.ad;
        document.getElementById('info-latin').textContent = s.latin;
        document.getElementById('info-desc').textContent = s.desc;
        const dot = document.getElementById('info-dot');
        dot.style.background = s.hex;
        dot.style.boxShadow = `0 0 12px ${s.hex}`;

        const meta = (this.systemsMeta || {})[id];
        const layer = this.layers.get(id);
        const specs = [];
        if (layer) specs.push(['Ayrı yapı sayısı', layer.names.length]);
        if (meta) {
            specs.push(['Üçgen (atlas)', meta.ucgen_ham.toLocaleString('tr-TR')]);
            specs.push(['Web için indirgeme', `%${Math.round(meta.decimate_orani * 100)}`]);
            specs.push(['Dosya boyutu', `${meta.boyut_mb} MB`]);
        }
        document.getElementById('info-specs').innerHTML =
            specs.map(([k, v]) => `<li><strong>${k}:</strong> ${v}</li>`).join('');
    }

    showTooltip(raw) {
        const parsed = parseStructureName(raw);
        const tip = document.getElementById('tooltip');
        tip.textContent = parsed.side ? `${parsed.name} — ${parsed.side}` : parsed.name;
        tip.style.left = `${this.pointerPx.x}px`;
        tip.style.top = `${this.pointerPx.y}px`;
        tip.style.opacity = '1';
    }

    hideTooltip() {
        document.getElementById('tooltip').style.opacity = '0';
    }

    setLoading(on, text) {
        const ov = document.getElementById('loading-overlay');
        if (text) document.getElementById('loading-text').textContent = text;
        ov.classList.toggle('hidden', !on);
    }

    // ---------------------------------------------------------
    // KAMERA
    // ---------------------------------------------------------
    setCamera(preset, animate = true) {
        const h = this.bodyHeight || 3.4;
        const views = {
            front: { pos: [0, 0, h * 1.55], target: [0, 0, 0] },
            back: { pos: [0, 0, -h * 1.55], target: [0, 0, 0] },
            left: { pos: [-h * 1.55, 0, 0], target: [0, 0, 0] },
            right: { pos: [h * 1.55, 0, 0], target: [0, 0, 0] },
            head: { pos: [0, h * 0.44, h * 0.42], target: [0, h * 0.42, 0] },
            torso: { pos: [0, h * 0.08, h * 0.72], target: [0, h * 0.08, 0] }
        };
        const v = views[preset] || views.front;
        const pos = new THREE.Vector3(...v.pos);
        const target = new THREE.Vector3(...v.target);
        if (!animate) {
            this.camera.position.copy(pos);
            this.controls.target.copy(target);
            this.controls.update();
            return;
        }
        this.flyTo(pos, target);
    }

    flyTo(pos, target) {
        const p0 = this.camera.position.clone();
        const t0 = this.controls.target.clone();
        const rot0 = ((this.bodyGroup.rotation.y + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
        const id = (this.flightId || 0) + 1;
        this.flightId = id;
        this.flying = true;
        const start = performance.now();

        const step = () => {
            if (this.flightId !== id) return;
            const p = Math.min(1, (performance.now() - start) / 750);
            const e = 0.5 - Math.cos(p * Math.PI) / 2;
            this.camera.position.lerpVectors(p0, pos, e);
            this.controls.target.lerpVectors(t0, target, e);
            this.bodyGroup.rotation.y = rot0 * (1 - e);
            this.controls.update();
            if (p < 1) requestAnimationFrame(step);
            else this.flying = false;
        };
        step();
    }

    // ---------------------------------------------------------
    // OLAYLAR
    // ---------------------------------------------------------
    initEvents() {
        const resize = () => {
            const rect = this.container.getBoundingClientRect();
            const w = Math.max(1, Math.round(rect.width) || window.innerWidth);
            const h = Math.max(1, Math.round(rect.height) || window.innerHeight);
            if (w === this.width && h === this.height) return;
            this.width = w; this.height = h;
            this.camera.aspect = w / h;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(w, h);
        };
        window.addEventListener('resize', resize);
        if (window.ResizeObserver) new ResizeObserver(resize).observe(this.container);

        const canvas = this.renderer.domElement;
        canvas.addEventListener('pointermove', (e) => {
            this.pointerPx = { x: e.clientX, y: e.clientY };
            this.pointer.x = (e.clientX / this.width) * 2 - 1;
            this.pointer.y = -(e.clientY / this.height) * 2 + 1;
        });
        canvas.addEventListener('pointerdown', () => { this.dragStart = performance.now(); });
        canvas.addEventListener('pointerup', () => {
            if (performance.now() - (this.dragStart || 0) < 220) this.selectStructure();
        });

        document.querySelectorAll('.cam-btn').forEach(btn => {
            btn.addEventListener('click', () => this.setCamera(btn.dataset.cam));
        });

        document.getElementById('reset-view-btn').addEventListener('click', () => this.setCamera('front'));

        const spinBtn = document.getElementById('spin-btn');
        spinBtn.addEventListener('click', () => {
            this.autoSpin = !this.autoSpin;
            spinBtn.setAttribute('aria-pressed', String(this.autoSpin));
            spinBtn.textContent = `Otomatik Dönüş: ${this.autoSpin ? 'Açık' : 'Kapalı'}`;
        });

        document.getElementById('opacity-slider').addEventListener('input', (e) => {
            this.dimOpacity = e.target.value / 100;
            this.repaintAll();
        });

        document.getElementById('xray-toggle').addEventListener('change', (e) => {
            const on = e.target.checked;
            this.layers.forEach(l => l.parts.forEach(p => { p.mesh.material.wireframe = on; }));
        });

        document.getElementById('cover-toggle').addEventListener('change', (e) => {
            this.showCovers = e.target.checked;
            this.repaintAll();
        });

        document.getElementById('hover-toggle').addEventListener('change', (e) => {
            this.showHoverName = e.target.checked;
            if (!this.showHoverName) { this.hovered = null; this.hideTooltip(); this.repaintAll(); }
        });
    }

    animate() {
        requestAnimationFrame(this.animate);
        if (this.autoSpin && !this.flying && this.controls.state === -1) {
            this.bodyGroup.rotation.y += 0.0022;
        }
        this.checkHover();
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

/** Basit geometri birleştirme (yalnız position/normal/structureId, indeksli). */
function mergeGeometries(geoms) {
    let vCount = 0, iCount = 0;
    for (const g of geoms) {
        vCount += g.attributes.position.count;
        iCount += g.index ? g.index.count : g.attributes.position.count;
    }

    const position = new Float32Array(vCount * 3);
    const normal = new Float32Array(vCount * 3);
    const structureId = new Float32Array(vCount);
    const index = vCount > 65535 ? new Uint32Array(iCount) : new Uint16Array(iCount);

    let vo = 0, io = 0;
    for (const g of geoms) {
        const p = g.attributes.position, n = g.attributes.normal, s = g.attributes.structureId;
        const c = p.count;
        position.set(p.array.subarray(0, c * 3), vo * 3);
        if (n) normal.set(n.array.subarray(0, c * 3), vo * 3);
        structureId.set(s.array.subarray(0, c), vo);

        if (g.index) {
            const src = g.index.array;
            for (let i = 0; i < src.length; i++) index[io + i] = src[i] + vo;
            io += src.length;
        } else {
            for (let i = 0; i < c; i++) index[io + i] = vo + i;
            io += c;
        }
        vo += c;
    }

    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(position, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
    out.setAttribute('structureId', new THREE.BufferAttribute(structureId, 1));
    out.setIndex(new THREE.BufferAttribute(index, 1));
    out.computeBoundingSphere();
    return out;
}

const app = new AnatomyApp();
window.anatomyApp = app;

fetch('data/systems.json')
    .then(r => r.json())
    .then(m => { app.systemsMeta = m; app.showSystemInfo(app.activeSystem); })
    .catch(() => {});
