# Atıf / Attribution

Bu depodaki 3B anatomi verisi bize ait değildir. Aşağıdaki açık kaynak projelerden
türetilmiştir ve **CC BY-SA** lisansı gereği atıf zorunludur.

The 3D anatomical data in this repository is **not ours**. It is derived from the
open-source projects below. Attribution is **required** under CC BY-SA.

---

## 1. BodyParts3D

> **BodyParts3D, © The Database Center for Life Science (DBCLS)**
> licensed under **CC BY-SA 2.1 Japan**

- https://lifesciencedb.jp/bp3d/
- İnsan anatomisinin özgün 3B rekonstrüksiyonu (2003→).

## 2. Z-Anatomy

> **Z-Anatomy — The libre 3D atlas of anatomy**
> licensed under **CC BY-SA 4.0**

- https://www.z-anatomy.com/
- https://github.com/Z-Anatomy/Models-of-human-anatomy
- BodyParts3D verisinin yeniden düzenlenmiş, adlandırılmış ve Terminologia
  Anatomica (TA2) ile eşleştirilmiş Blender atlası.

`systems/*.glb` dosyaları Z-Anatomy `Startup.blend` dosyasından
`tools/export_systems.py` ile üretilmiştir (koleksiyon seçimi + decimate + glTF).
Geometri **indirgenmiştir**, anatomik içerik değiştirilmemiştir.

---

## 3. three.js

MIT License — https://github.com/mrdoob/three.js
`vendor/three/` altında sürüm **r185** yerel olarak tutulur (CDN bağımlılığı yok).
Lisans metni: `vendor/three/LICENSE`.

---

## Türetilmiş çalışma bildirimi / Derivative notice

`systems/` klasöründeki tüm `.glb` dosyaları yukarıdaki CC BY-SA kaynaklarından
**türetilmiş çalışmalardır** ve aynı lisansla (**CC BY-SA 4.0**) dağıtılmaktadır.
Bu dosyaları kullanan/yeniden dağıtan herkes aynı yükümlülüğü üstlenir.

All `.glb` files under `systems/` are **derivative works** of the CC BY-SA sources
above and are distributed under the same license (**CC BY-SA 4.0**). Anyone
redistributing them assumes the same obligation.

---

## Marka / Trademark

`assets/yzo-mark.png` — Yapay Zekâ Okulum logosu. **Bu depodaki lisanslar logoyu
kapsamaz**; marka hakları saklıdır. Çatallarsanız (fork) lütfen kendi logonuzla
değiştirin veya kaldırın.

`assets/yzo-mark.png` is the Yapay Zekâ Okulum brand mark. It is **not covered** by
the licenses in this repository; all rights reserved. Please replace or remove it
in forks.
