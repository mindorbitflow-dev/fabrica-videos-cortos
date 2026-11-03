# 🎬 Fábrica de Videos Cortos Explicativos

Videos verticales (1080×1920) que explican un tema con **diagramas animados en HTML/SVG**, voz neuronal
gratis y subtítulos palabra por palabra. Todo gratis.

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
Título 260-430 · diagrama 430-1190 (SVG de 870×760) · subtítulos 1210-1440 · portada 860-1240.

## Revisión automática (la fábrica verifica su propio resultado)
1. **Escenas** (`src/revisor.py`): cada escena se abre en un navegador y se mide dónde quedó cada elemento.
   Detecta: elementos que se salen de la zona segura, textos encimados o montados sobre el borde de una
   figura, íconos encimados, título que choca con el dibujo, dibujo tapado por la portada, escenas casi
   vacías y elementos que aparecen demasiado tarde. Los problemas se le devuelven a la IA para que rehaga la
   escena (hasta 2 veces, quedándose con la mejor versión). Lo que no se pudo corregir sale como ⚠️.
2. **MP4** (`render.verificar_mp4`): 1080×1920, 30 fps, H.264 yuv420p, AAC 48 kHz, 10-90 s, final en
   silencio y peso que quepa en el correo.

## Estilos
`plano` (diagramas sobre cuadrícula) e `ilustracion` (diagramas sobre fondo cálido con grano: Biología y Cuerpo).

## Sin clichés
El guion no puede usar muletillas como "sabías que", "increíble", "secreto", "descubre" ni pedir que te sigan
(se comprueba en código); los hashtags genéricos (#viral, #fyp, #curiosidades…) se eliminan.

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
plantilla/base.css     estilos + animaciones (aparece, pop, dibuja, vacia, pulso, sube, baja, izquierda, flujo)
plantilla/motor.js     reloj de escenas y subtítulos (la vista previa y el MP4 son idénticos)
src/guionista.py       temas sin repetir + guion con contrato (5-8 escenas, 100-160 palabras, gancho corto)
src/animador.py        escena → SVG animado con IA (limpia scripts/enlaces; respaldo de texto animado)
src/voces.py           Gemini TTS / Edge-TTS + alineación de palabras con Whisper
src/render.py          Chromium (Playwright) cuadro a cuadro + ffmpeg (-14 LUFS lineal) + verificación del MP4
src/revisor.py         mide cada escena en el navegador y lista los problemas de composición
src/fabrica.py         proyectos en proyectos/<id>/ (proyecto.json, video.html, video.mp4, miniatura.jpg)
src/llm.py, src/env.py copiados de "videos automatizados" (cascada OpenRouter → Gemini → Groq)
```

## Problemas comunes
- Voz con error 403 → `pip install -U edge-tts`
- Falta Chromium → `python -m playwright install chromium`
- Música: desactivada por defecto; para usarla, pon .mp3 sin copyright en `assets/musica/` y elígela en la app

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
