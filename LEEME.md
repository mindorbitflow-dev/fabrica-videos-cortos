# 🎬 Fábrica de Videos Cortos

Videos verticales (1080×1920, de 55 a 90 s) con **escenas dibujadas a medida para cada tema** (canvas 2D con el motor de
ilustración: pincel con volumen, luz cálida de borde, colores apagados y grano), voz neuronal, música de fondo y subtítulos palabra
por palabra. Claude Code escribe el guion y el dibujo de cada escena, mira sus propias hojas de contacto y corrige; la fábrica
renderiza el MP4 y lo envía por correo.

## Series de Sombra de Evidencia
`evidencia` alterna dos series (`series:` en `config/nichos.yaml`; cada video es de la que lleva más tiempo sin usarse, `fabrica.serie_siguiente`):
**origen** (el origen oculto de una marca o costumbre; ejemplo `ejemplos/evidencia/`) y **mito** (Mito vs. evidencia: Tito cree algo popular, Sombra pide pruebas
y el sello `D.sello` da el veredicto; ejemplo `ejemplos/evidencia_mito/`). A mano: `claude "/video evidencia SERIE:mito Los vikingos no usaban cascos con cuernos"`.
El guion trae `"serie"` y el historial la guarda. Para añadir una serie: un bloque en `series:`, sus reglas en `.claude/commands/video.md` y, si quieres, `ejemplos/evidencia_<serie>/`.

## Las tres páginas (desde 2026-11-22 solo `evidencia` está activa: `sobrevive` y `estafa` tienen `auto: false` y se usan a mano)
| Nicho | Página | Qué cuenta | Reglas | Ejemplo |
|---|---|---|---|---|
| `evidencia` | 🔍 Sombra de Evidencia | Tito (cerdito) llega con algo cotidiano y el detective Sombra revela su origen oculto: historias reales de negocios, publicidad y dinero | `.claude/commands/video.md` | `ejemplos/evidencia/` |
| `sobrevive` | 🆘 ¿Sobrevivirías? | Una situación extrema en segunda persona: lo que casi todos harían falla y lo que de verdad te salva | `.claude/commands/video-sobrevive.md` | `ejemplos/sobrevive/` |
| `estafa` | 🚨 Así te estafan | Una estafa cotidiana con Marta: cómo funciona el truco, la señal que lo delata y qué hacer. Pensada para que se la manden a su mamá | `.claude/commands/video-estafa.md` | `ejemplos/estafa/` |

Los demás nichos de `config/nichos.yaml` (`biologia`, `cotidiano`, `ciencia`, `cuerpo`, `tecnologia`, `dinero`, `mente`) tienen
`auto: false`: no entran en la rotación, pero se pueden fabricar a mano con `/video <nicho>` (usan `.claude/commands/video.md` y
`ejemplos/pulpo/`).

## Uso
```bash
claude "/video-estafa estafa"                 # un video de Así te estafan (el tema lo elige Claude)
claude "/video evidencia Tu anillo de diamante es publicidad"
python run.py --nicho estafa --tema aleatorio # lo mismo desde la consola (dibuja Claude Code o, sin él, Gemini)
python run.py --guion guion.json --nicho estafa   # crea el proyecto desde un guion ya escrito
python run.py --hoja ID                       # hojas de contacto para revisar el dibujo (y errores de las escenas)
python run.py --render ID [--correo]          # voz + MP4 (y lo envía por correo)
python run.py --ejemplo estafa [--correo]     # renderiza ejemplos/estafa como si fuera un video nuevo
python run.py --check                         # diagnóstico: ffmpeg, Chromium, voz, IA
```

## Cómo está hecho
```
config/nichos.yaml          nichos: tono, voz, paleta, ideas, comando, libs/personajes
.claude/commands/           reglas de cada página (video.md, video-sobrevive.md, video-estafa.md): guion → dibujo → revisión
ejemplos/<nicho>/           guion.json + escenas.js de un video completo: el dibujante los imita (pulpo = ejemplo genérico)
plantilla/kit.js            utilidades de dibujo (tiempo, cámara, `K.plano` = cámara que viaja con paralaje, curvas, rótulos, grano)
plantilla/ilustra.js        motor de ilustración (se construye desde ilustra/src con ilustra/herramientas/construir.py)
plantilla/sombra*.js        Sombra, Tito y la gente (S30.hombre / S30.mujer) con el motor de ilustración
plantilla/decorados.js      fondos y props (D): calle, banco, oficina, tienda..., y D.celular (mensajes y llamadas) para las estafas
plantilla/sobrevive2d.js    personas, animales, fondos y efectos de ¿Sobrevivirías? (V); fauna2d.js trae los animales
plantilla/motor.js          reloj de escenas y subtítulos (la vista previa y el MP4 son idénticos)
plantilla/base.css          estilos de subtítulos, portada y cierre
src/autor.py                el dibujante: Claude Code (`claude -p "/comando nicho tema"`) o, sin él, Gemini con las mismas reglas
src/fabrica.py              proyectos en proyectos/<id>/ (proyecto.json, escenas.js, video.html, video.mp4), nichos, historial y render
src/guionista.py            temas sin repetir (lista de ideas del nicho o LIBRE) y comprobación de muletillas
src/voces.py                Gemini TTS / Edge-TTS + alineación de palabras con Whisper
src/render.py               Chromium (Playwright) cuadro a cuadro + ffmpeg + verificación del MP4 y hojas de contacto
src/correo.py               envío por Gmail   ·   src/personajes.py posts de dos viñetas (hoy apagados: `post: false`)
src/llm.py, src/env.py      cascada de IAs (Gemini → Groq → servicio propio) y lectura de .env
state/historial.json        temas ya hechos (lo actualiza el propio workflow)
ilustra/                    código fuente, herramientas y especificaciones del motor de ilustración (solo para desarrollarlo)
```

## Zona segura (TikTok, Reels y Shorts)
Lienzo 1080×1920: libres ~250 px arriba, ~420 px abajo, ~140 px a la derecha (botones) y 70 px a la izquierda. En las tres páginas
los subtítulos van ARRIBA (y≈170-400) y lo importante entre y=420 y 1250; la escena 1 no lleva título (arranca en el gancho) y la
última escena deja la pregunta del sistema en y≈420-1000.

## Voces
Cada nicho trae su voz (`voz:` en `config/nichos.yaml`): Gemini Charon (evidencia, sobrevive) y Achird (estafa); respaldo
automático con Edge-TTS (Brian) si Gemini falla. Subtítulos sincronizados con Whisper. Si Edge-TTS da 403: `pip install -U edge-tts`.

## Sin clichés
El guion no puede usar muletillas ("sabías que", "increíble", "secreto", "descubre"…) ni pedir que te sigan; se comprueba en código
(`guionista.muletillas_en`) y lo que falle llega como ⚠️ en el correo. La última escena es siempre una pregunta para comentar.

## 🤖 Automático en GitHub Actions (por correo, sin el PC encendido)
`.github/workflows/fabrica.yml` lanza dos tandas al día (9:17 y 20:17 UTC = 4:17 y 15:17 en Colombia) con un respaldo 1,5 h después
(GitHub puede retrasar o saltarse ejecuciones). Cada tanda fabrica un video por cada página con `auto: true`, lo envía a Gmail con el
texto para publicar y, si algo falla, manda un correo con el error. El video queda 7 días en Actions.

- Dibujante: `claude` se instala solo y se autentica con el secret `CLAUDE_CODE_OAUTH_TOKEN` (token de la suscripción, `claude setup-token`;
  cada video gasta del límite de uso del plan). Sin él, `src/autor.py` usa Gemini (`GEMINI_API_KEY`) con las mismas reglas.
- **Las reglas que lee el dibujante son las de `.claude/commands/` del repositorio: si cambias algo ahí, hay que hacer push para que
  GitHub lo use.**
- Secrets: `CLAUDE_CODE_OAUTH_TOKEN`, `GEMINI_API_KEY`, `GROQ_API_KEY`, `CUSTOM_LLM_BASE_URL`, `CUSTOM_LLM_API_KEY`, `GMAIL_USUARIO`,
  `GMAIL_CLAVE_APP` (contraseña de aplicación), `CORREO_DESTINO` (opcional).
- A mano: **Actions → Fábrica de videos → Run workflow** (elige nicho o un ejemplo para renderizar). Limitar nichos: variable `NICHOS_AUTO`.
- Los temas salen de `ideas:` del nicho (al azar entre los no hechos); al acabarse, Claude elige otros nuevos y virales.

## Problemas comunes
- Falta Chromium → `python -m playwright install chromium`.
- Música: pista aleatoria de `assets/musica/`; `--musica ninguna` para quitarla.
- Los videos no salen con el estilo nuevo → revisa que `.claude/commands/` tenga los comandos actuales y que estén subidos a GitHub.
