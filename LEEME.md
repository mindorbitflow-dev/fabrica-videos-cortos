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
1. **Escenas** (`src/animador.py` + `src/revisor.py`): la IA describe cada escena como JSON (`src/prim.py` define
   las primitivas y sus rangos; se valida y se recorta lo que sobra). Si el JSON no sirve tras 3 intentos, se arma
   una escena de respaldo en código (🧩). El revisor abre cada escena en un navegador y mide qué fracción del cuadro
   tiene dibujo en 4 momentos (menos de 0,20 en algún momento o de 0,30 en promedio = casi vacía) y si hay capas
   que aparecen cuando la escena ya terminó. Los problemas se le devuelven a la IA (hasta 2 veces, quedándose con
   la mejor versión). Lo que no se pudo corregir sale como ⚠️.
2. **MP4** (`render.verificar_mp4`): 1080×1920, 30 fps, H.264 yuv420p, AAC 48 kHz, 10-120 s, final en
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
plantilla/primitivas.js primitivas procedurales en canvas (cámara, células, vasos, partículas, figuras, red, ramas...)
plantilla/motor.js     reloj de escenas y subtítulos (la vista previa y el MP4 son idénticos)
src/guionista.py       temas sin repetir + guion con contrato (6-12 escenas, 170-290 palabras, gancho corto)
src/prim.py            esquema único de las primitivas: validar(), describir() para el prompt y respaldo()
src/animador.py        escena → JSON de primitivas con IA (validado; respaldo procedural en código)
src/voces.py           Gemini TTS / Edge-TTS + alineación de palabras con Whisper
src/render.py          Chromium (Playwright) cuadro a cuadro + ffmpeg (-14 LUFS lineal) + verificación del MP4
src/revisor.py         mide cada escena en el navegador (cuadro casi vacío, capas tardías)
src/fabrica.py         proyectos en proyectos/<id>/ (proyecto.json, video.html, video.mp4, miniatura.jpg)
src/llm.py, src/env.py copiados de "videos automatizados" (cascada OpenRouter → Gemini → Groq)
```

## Problemas comunes
- Voz con error 403 → `pip install -U edge-tts`
- Falta Chromium → `python -m playwright install chromium`
- Música: por defecto una pista aleatoria de `assets/musica/` (hay un ambiente incluido); para usar otra, pon .mp3 sin copyright ahí y elígela en la app, o `--musica ninguna`

## 🤖 Automático en GitHub Actions (un video cada 3 horas, por correo)
`.github/workflows/fabrica.yml` corre cada 3 horas (21:17, 0:17, 3:17 … 18:17, hora de Colombia): 8 videos al día. Rota el nicho
(el que lleva más tiempo sin video), fabrica un video con tema nuevo y te lo envía a Gmail con el texto
para publicar. Si falla, te llega un correo con el error. El video también queda 7 días en Actions.

Secrets necesarios (Settings → Secrets and variables → Actions):
`GEMINI_API_KEY`, `GROQ_API_KEY`, `CUSTOM_LLM_BASE_URL`, `CUSTOM_LLM_API_KEY`,
`GMAIL_USUARIO`, `GMAIL_CLAVE_APP` (contraseña de aplicación: myaccount.google.com/apppasswords), `CORREO_DESTINO` (opcional).

- Lanzarlo a mano: pestaña **Actions → Fábrica de videos → Run workflow** (puedes elegir el nicho).
- Limitar los nichos: variable `NICHOS_AUTO` (ej. `cotidiano,ciencia`).
- Cambiar la frecuencia: línea `cron` del workflow (hora UTC).
- Los temas usados se guardan en `state/historial.json` (lo actualiza el propio workflow).
