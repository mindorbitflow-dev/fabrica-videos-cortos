# 🎬 Fábrica de Videos Cortos Explicativos

Videos verticales (1080×1920) que explican un tema con **gráficos animados en HTML/SVG**, voz neuronal gratis
(Edge-TTS), subtítulos palabra por palabra y música opcional. Todo gratis.

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

## Portada y ganchos virales
Cada guion trae una **portada**: 2-5 palabras gigantes que chocan con lo que la gente cree, con la palabra del
giro en color y una línea pequeña que lo explica (fórmulas "NO X: Y", "SIN X Y SIGUE", "TU X HACE Y"...).
Se ve en el primer segundo y sale como `portada.jpg` (adjunta en el correo) para usarla de miniatura.
Nicho **🧬 Biología** y **🫀 Cuerpo** usan el estilo `ilustracion` (fondo cálido con grano, sin cuadrícula).

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
src/render.py          Chromium (Playwright) cuadro a cuadro + ffmpeg (-14 LUFS)
src/fabrica.py         proyectos en proyectos/<id>/ (proyecto.json, video.html, video.mp4, miniatura.jpg)
src/llm.py, src/env.py copiados de "videos automatizados" (cascada OpenRouter → Gemini → Groq)
```

## Problemas comunes
- Voz con error 403 → `pip install -U edge-tts`
- Falta Chromium → `python -m playwright install chromium`
- Música: pon tus .mp3 sin copyright en `assets/musica/`

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
