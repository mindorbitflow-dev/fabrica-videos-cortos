# 🎬 Fábrica de Videos Cortos Explicativos

Videos verticales (1080×1920, de 60 a 120 s) que explican un tema con **escenas procedurales en canvas**
(cámara continua, campos de células, partículas, figuras, redes...), voz neuronal gratis, música de fondo y
subtítulos palabra por palabra. Todo gratis.

## Uso
```bash
python run.py                                    # Interfaz en http://localhost:8502
python run.py --nicho ciencia --tema aleatorio   # un video completo por consola
python run.py --nicho cuerpo --tema "Por qué bostezamos"
python run.py --nicho dinero --lote 5            # 5 videos con temas nuevos, sin repetir
python run.py --check                            # diagnóstico: ffmpeg, Chromium, voz, IA
```

## Flujo en la interfaz
**🎬 Crear**: nicho → tema (o 🎲) → ✍️ Guion con IA (o 📝 manual) → revisa y edita → 🎨 Animar
→ vista previa → 🎞️ Renderizar MP4 → copia el texto de publicación.
Cada escena se puede **🔁 rehacer** sola. Si cambias "Qué se dibuja", esa escena queda pendiente de animar.

**🖼️ Galería**: todos los proyectos con miniatura, video, descarga y texto para publicar.
**🏭 Lote**: varios videos seguidos (temas de la IA o tu lista).
**🧭 Nichos**: tono, voz, frase de cierre, paleta de colores y banco de ideas (`config/nichos.yaml`).

## Zona segura (TikTok, Reels y Shorts)
Todo se diseña dentro de la zona que no tapa la interfaz de ninguna de las tres apps (lienzo 1080×1920):
libres ~250 px arriba, ~420 px abajo, ~140 px a la derecha (botones) y 70 px a la izquierda.
Título 260-430 · dibujo 430-1190 (el canvas ocupa todo el cuadro; la cámara centra el protagonista en y=810) ·
subtítulos 1210-1440 · portada 860-1240. Las etiquetas, los números y la barra de escala se recortan solos a la zona.

## Revisión automática (la fábrica verifica su propio resultado)
1. **Historia** (`src/director.py`): la IA decide qué pasa en cada escena con un vocabulario fijo (acciones, plano, cámara,
   escenario; `src/historia.py` lo convierte en rutas, cámara continua y paisajes planos). Cada protagonista sale de una
   de tres fuentes: la **biblioteca propia** (`src/objetos.py`, dibujada a mano con piezas que giran), las **ilustraciones
   abiertas** (`src/emojis.py`: Fluent Emoji Flat de Microsoft, MIT, y Noto Emoji de Google, Apache 2.0, por la API
   pública de Iconify; licencias en `assets/emojis/LICENCIAS.md`) o un objeto que **la IA diseña como piezas planas**
   (`src/objetos_ia.py`). Todo objeto se verifica con una IA con visión *a ciegas* (`src/vision.py`: primero dice qué ve,
   sin saber qué debería ser). Una segunda pasada revisa que cada protagonista sea lo que dice la voz y, si no, la IA
   replantea (hasta 3 rondas).
2. **Control final** (`src/control.py`): cada escena armada se dibuja como la verá el público y una IA con visión describe
   qué ve (objeto, color, tamaño) para compararlo con la voz y el rótulo. Lo que no concuerda pasa a **tarjeta de texto**
   (nunca un dibujo que no corresponde); si son demasiadas, el video se descarta.
3. **MP4** (`render.verificar_mp4`): 1080×1920, 30 fps, H.264 yuv420p, AAC 48 kHz, 10-150 s, final en
   silencio y peso que quepa en el correo.

## Estilos
`plano` (diagramas sobre cuadrícula) e `ilustracion` (diagramas sobre fondo cálido con grano: Biología y Cuerpo).

## Sin clichés
El guion no puede usar muletillas como "sabías que", "increíble", "secreto", "descubre" ni pedir que te sigan
(se comprueba en código). La única petición de seguir es la escena final fija del sistema ("Síguenos", con
`cierre:` por nicho); los hashtags genéricos (#viral, #fyp, #curiosidades…) se eliminan.

## Verificación de datos
Después de escribir el guion, otra consulta a la IA busca mitos y exageraciones; si los hay, se reescribe
(hasta 3 intentos y se queda con el mejor). Lo que no se pudo corregir llega como ⚠️ en la app y en el correo.

## Portada y ganchos virales
Cada guion trae una **portada**: 2-5 palabras gigantes que chocan con lo que la gente cree, con la palabra del
giro en color y una línea pequeña que lo explica (fórmulas "NO X: Y", "SIN X Y SIGUE", "TU X HACE Y"...).
Se ve en el primer segundo y sale como `portada.jpg` (adjunta en el correo) para usarla de miniatura.

## Voces
| Voz | Motor | Nota |
|---|---|---|
| Puck, Fenrir, Achird | Gemini TTS (clave gratis) | Las más naturales. 1 petición por video; subtítulos sincronizados con Whisper |
| Brian | Microsoft Edge-TTS | Conversacional, sin límite. Es el respaldo automático si Gemini falla |

Cada nicho trae su voz por defecto (`voz:` en `config/nichos.yaml`); en 🎬 Crear se cambia por video.
Las muestras de todas las voces probadas están en `muestras_voz/`.

## Cómo está hecho
```
config/nichos.yaml     nichos (paleta, voz, ideas)
plantilla/base.css     estilos del título, la portada y los subtítulos
plantilla/primitivas.js primitivas en canvas: cámara, sprites (objetos vectoriales o ilustraciones) con rutas y giro, paisajes planos
                       (colinas, carretera, siluetas), células, vasos, partículas, figuras, red, ramas...
plantilla/motor.js     reloj de escenas y subtítulos (la vista previa y el MP4 son idénticos)
src/guionista.py       temas sin repetir + guion con contrato (12-18 escenas, 240-380 palabras ≈ 80-135 s, gancho corto, "enlace"
                       sin terminar para que el video encadene en bucle) + verificación de datos
src/director.py        la IA dirige la historia, consigue los objetos y replantea lo que no concuerda
src/historia.py        guion de movimientos → escena del motor (rutas, cámara que sigue, escenarios: carretera, campo, bosque, interior)
src/objetos.py         biblioteca propia de objetos vectoriales (carro, llanta, cono, disco, pedal, módulo ABS)
src/objetos_ia.py      objetos que la IA diseña como piezas planas + verificación
src/emojis.py          ilustraciones abiertas (Fluent Emoji Flat / Noto) por la API de Iconify, con caché en assets/emojis
src/vision.py          IA con visión: verificación ciega de objetos
src/control.py         control final sobre cada escena armada
src/prim.py            esquema único de las primitivas: validar(), describir() para el prompt y respaldo()
src/animador.py        (método anterior de escenas por IA, ya no se usa en la fábrica)
src/voces.py           Gemini TTS / Edge-TTS + alineación de palabras con Whisper
src/render.py          Chromium (Playwright) cuadro a cuadro + ffmpeg (-14 LUFS lineal) + verificación del MP4
src/revisor.py         (método anterior: mide escenas del método viejo)
src/fabrica.py         proyectos en proyectos/<id>/ (proyecto.json, video.html, video.mp4, miniatura.jpg)
src/llm.py, src/env.py copiados de "videos automatizados" (cascada OpenRouter → Gemini → Groq)
```

## Problemas comunes
- Voz con error 403 → `pip install -U edge-tts`
- Falta Chromium → `python -m playwright install chromium`
- Música: por defecto una pista aleatoria de `assets/musica/` (hay un ambiente incluido); para usar otra, pon .mp3 sin copyright ahí y elígela en la app, o `--musica ninguna`

## 🤖 Automático en GitHub Actions (2 videos cada 3 horas, por correo)
`.github/workflows/fabrica.yml` corre cada 3 horas (21:17, 0:17, 3:17 … 18:17, hora de Colombia) y fabrica 2 videos por ejecución: 16 al día en
teoría (GitHub se salta parte de las ejecuciones programadas, así que el número real es menor). Rota el nicho
(el que lleva más tiempo sin video), fabrica un video con tema nuevo y te lo envía a Gmail con el texto
para publicar. Si falla, te llega un correo con el error. El video también queda 7 días en Actions.

Secrets necesarios (Settings → Secrets and variables → Actions):
`GEMINI_API_KEY`, `GROQ_API_KEY`, `CUSTOM_LLM_BASE_URL`, `CUSTOM_LLM_API_KEY`,
`GMAIL_USUARIO`, `GMAIL_CLAVE_APP` (contraseña de aplicación: myaccount.google.com/apppasswords), `CORREO_DESTINO` (opcional).

- Lanzarlo a mano: pestaña **Actions → Fábrica de videos → Run workflow** (puedes elegir el nicho).
- Limitar los nichos: variable `NICHOS_AUTO` (ej. `cotidiano,ciencia`).
- Los nichos con `auto: false` en `config/nichos.yaml` (hoy `dinero` y `mente`, demasiado abstractos para ilustrarlos con objetos) no entran en la rotación automática; siguen disponibles a mano.
- Cambiar la frecuencia: línea `cron` del workflow (hora UTC). Cambiar cuántos videos por ejecución: `python run.py --auto --cantidad N` (o el campo
  *cantidad* al lanzarlo a mano); cada ejecución aguanta unos 3 videos antes del límite de 90 minutos.
- Los temas usados se guardan en `state/historial.json` (lo actualiza el propio workflow).
