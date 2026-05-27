"""Generate VRS-Studio-Cambios.pdf — handoff document for the original author."""
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT, TA_JUSTIFY
from reportlab.lib.units import cm
from reportlab.lib.colors import HexColor, white
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
    HRFlowable,
)
from reportlab.platypus.doctemplate import NextPageTemplate

OUTPUT = r"c:\Users\Juan Miguel\VRC\vrs-studio-web\VRS-Studio-Cambios.pdf"

# ---------------------------------------------------------------------------
# Palette
# ---------------------------------------------------------------------------
ACCENT = HexColor("#DC2626")
INK = HexColor("#111111")
INK_SOFT = HexColor("#3F3F46")
MUTED = HexColor("#71717A")
RULE = HexColor("#E4E4E7")
SURFACE = HexColor("#FAFAFA")
SUCCESS = HexColor("#15803D")
INFO = HexColor("#0369A1")

# ---------------------------------------------------------------------------
# Styles
# ---------------------------------------------------------------------------
styles = getSampleStyleSheet()

style_h2 = ParagraphStyle(
    "h2", parent=styles["Heading2"], fontName="Helvetica-Bold",
    fontSize=13, leading=16, textColor=ACCENT,
    spaceBefore=14, spaceAfter=6, keepWithNext=1,
)
style_h3 = ParagraphStyle(
    "h3", parent=styles["Heading3"], fontName="Helvetica-Bold",
    fontSize=10.5, leading=13, textColor=INK,
    spaceBefore=8, spaceAfter=2, keepWithNext=1,
)
style_body = ParagraphStyle(
    "body", parent=styles["BodyText"], fontName="Helvetica",
    fontSize=9.8, leading=14, textColor=INK_SOFT,
    alignment=TA_JUSTIFY, spaceAfter=4,
)
style_lead = ParagraphStyle(
    "lead", parent=style_body, fontSize=10.5, leading=15,
    textColor=INK, spaceAfter=8,
)
style_bullet = ParagraphStyle(
    "bullet", parent=style_body, leftIndent=14, bulletIndent=2,
    spaceAfter=3, alignment=TA_LEFT,
)
style_small = ParagraphStyle(
    "small", parent=style_body, fontSize=8.3, leading=11,
    textColor=MUTED, alignment=TA_LEFT,
)
style_callout = ParagraphStyle(
    "callout", parent=style_body, fontSize=10, leading=14,
    textColor=INK, alignment=TA_LEFT,
    leftIndent=10, rightIndent=10, spaceBefore=6, spaceAfter=6,
)
style_cover_title = ParagraphStyle(
    "covertitle", fontName="Helvetica-Bold", fontSize=36, leading=40,
    textColor=white, alignment=TA_LEFT, spaceAfter=6,
)
style_cover_sub = ParagraphStyle(
    "coversub", fontName="Helvetica", fontSize=14, leading=18,
    textColor=HexColor("#F5F5F5"), alignment=TA_LEFT, spaceAfter=14,
)
style_cover_kicker = ParagraphStyle(
    "coverkicker", fontName="Helvetica-Bold", fontSize=9, leading=11,
    textColor=ACCENT, alignment=TA_LEFT, spaceAfter=4,
)
style_cover_meta = ParagraphStyle(
    "covermeta", fontName="Helvetica", fontSize=10, leading=14,
    textColor=HexColor("#D4D4D8"), alignment=TA_LEFT,
)
style_code = ParagraphStyle(
    "code", parent=style_body, fontName="Courier", fontSize=8.5,
    leading=11, textColor=INK, leftIndent=8, rightIndent=8,
    spaceAfter=3,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def bullet(text):
    return Paragraph(text, style_bullet, bulletText="•")


def section_rule():
    return HRFlowable(width="100%", thickness=0.6, color=RULE,
                      spaceBefore=2, spaceAfter=8)


def kv_table(rows):
    data = [[Paragraph(f"<b>{k}</b>", style_body), Paragraph(v, style_body)]
            for k, v in rows]
    t = Table(data, colWidths=[4.6 * cm, 11.5 * cm])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ]))
    return t


def two_col_bullets(left, right):
    L = [bullet(t) for t in left]
    R = [bullet(t) for t in right]
    while len(L) < len(R):
        L.append(Spacer(1, 1))
    while len(R) < len(L):
        R.append(Spacer(1, 1))
    rows = [[l, r] for l, r in zip(L, R)]
    t = Table(rows, colWidths=[8.2 * cm, 8.2 * cm])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
    ]))
    return t


def feature_card(title, desc):
    title_p = Paragraph(f"<b>{title}</b>", ParagraphStyle(
        "ftitle", parent=style_body, fontName="Helvetica-Bold",
        textColor=ACCENT, fontSize=9.8, leading=13, spaceAfter=2,
    ))
    body_p = Paragraph(desc, style_small)
    return [title_p, body_p]


def feature_grid(items):
    rows, i = [], 0
    while i < len(items):
        left = feature_card(*items[i])
        right = feature_card(*items[i + 1]) if i + 1 < len(items) else [Spacer(1, 1)]
        rows.append([left, right])
        i += 2
    t = Table(rows, colWidths=[8.2 * cm, 8.2 * cm])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("BACKGROUND", (0, 0), (-1, -1), SURFACE),
        ("LINEABOVE", (0, 0), (-1, -1), 0.5, RULE),
        ("LINEBELOW", (0, 0), (-1, -1), 0.5, RULE),
        ("LINEBEFORE", (0, 0), (0, -1), 1.5, ACCENT),
        ("LINEBEFORE", (1, 0), (1, -1), 1.5, ACCENT),
    ]))
    return t


# ---------------------------------------------------------------------------
# Page templates
# ---------------------------------------------------------------------------
PAGE_W, PAGE_H = A4
MARGIN = 1.8 * cm


def draw_cover_bg(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(HexColor("#0A0A0A"))
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    canvas.setFillColor(ACCENT)
    p = canvas.beginPath()
    p.moveTo(0, PAGE_H * 0.18); p.lineTo(PAGE_W, PAGE_H * 0.28)
    p.lineTo(PAGE_W, PAGE_H * 0.32); p.lineTo(0, PAGE_H * 0.22); p.close()
    canvas.drawPath(p, fill=1, stroke=0)
    canvas.setFillColor(HexColor("#52525B"))
    canvas.setFont("Helvetica", 8)
    canvas.drawString(MARGIN, 1.2 * cm, "VRS Studio  ·  documento de cambios")
    canvas.drawRightString(PAGE_W - MARGIN, 1.2 * cm, "v3.0  ·  2026")
    canvas.restoreState()


def draw_body_bg(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(ACCENT)
    canvas.rect(0, PAGE_H - 0.5 * cm, PAGE_W, 0.5 * cm, fill=1, stroke=0)
    canvas.setFillColor(INK)
    canvas.setFont("Helvetica-Bold", 9)
    canvas.drawString(MARGIN, PAGE_H - 1.1 * cm, "VRS Studio")
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 9)
    canvas.drawRightString(PAGE_W - MARGIN, PAGE_H - 1.1 * cm, "Resumen de cambios v3")
    canvas.setStrokeColor(RULE); canvas.setLineWidth(0.4)
    canvas.line(MARGIN, 1.4 * cm, PAGE_W - MARGIN, 1.4 * cm)
    canvas.setFillColor(MUTED); canvas.setFont("Helvetica", 8)
    canvas.drawString(MARGIN, 1.0 * cm, "https://vrs-studio-web.vercel.app")
    canvas.drawRightString(PAGE_W - MARGIN, 1.0 * cm, f"Pagina {doc.page}")
    canvas.restoreState()


cover_frame = Frame(
    MARGIN, MARGIN, PAGE_W - 2 * MARGIN, PAGE_H - 2 * MARGIN,
    id="cover", leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0,
)
body_frame = Frame(
    MARGIN, MARGIN + 0.4 * cm,
    PAGE_W - 2 * MARGIN, PAGE_H - 2 * MARGIN - 1.0 * cm,
    id="body", leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0,
)

doc = BaseDocTemplate(
    OUTPUT, pagesize=A4,
    leftMargin=MARGIN, rightMargin=MARGIN,
    topMargin=MARGIN, bottomMargin=MARGIN,
    title="VRS Studio - Resumen de cambios v3",
    author="VRS Studio",
    subject="Migracion Python tkinter -> PWA Next.js + Supabase con analisis de pace",
)
doc.addPageTemplates([
    PageTemplate(id="cover", frames=[cover_frame], onPage=draw_cover_bg),
    PageTemplate(id="body", frames=[body_frame], onPage=draw_body_bg),
])

# ---------------------------------------------------------------------------
# Story
# ---------------------------------------------------------------------------
story = []

# ---- COVER -----------------------------------------------------------------
story.append(Spacer(1, 4.2 * cm))
story.append(Paragraph("VRS STUDIO", style_cover_kicker))
story.append(Paragraph("Resumen de cambios", style_cover_title))
story.append(Paragraph(
    "De app de escritorio en Python<br/>"
    "a herramienta web con analisis de pace",
    style_cover_sub,
))
story.append(Spacer(1, 5.6 * cm))
story.append(Paragraph(
    "<b>URL en produccion</b><br/>"
    "<font color='#DC2626'>https://vrs-studio-web.vercel.app</font>",
    style_cover_meta,
))
story.append(Spacer(1, 0.4 * cm))
story.append(Paragraph(
    "Documento de traspaso v3<br/>"
    "Incluye nuevas funcionalidades de analisis (sectores, stints, share publico).",
    style_cover_meta,
))
story.append(Spacer(1, 0.4 * cm))
story.append(Paragraph(
    "Stack: Next.js 16 &middot; React 19 &middot; TypeScript &middot; "
    "Tailwind v4 &middot; Supabase (Postgres + RLS + Realtime) &middot; Serwist PWA",
    style_cover_meta,
))

story.append(NextPageTemplate("body"))
story.append(PageBreak())

# ---- 1. Resumen ejecutivo --------------------------------------------------
story.append(Paragraph("Resumen ejecutivo", style_h2))
story.append(section_rule())
story.append(Paragraph(
    "La aplicacion ha pasado de ser un <b>cuaderno digital con cronometro</b> "
    "(equivalente al original en Python) a una <b>herramienta de analisis de "
    "pace</b> con sectores, stints, comparativa entre sesiones y link publico para "
    "compartir resultados.",
    style_lead,
))
story.append(Paragraph(
    "El flujo del mecanico se mantiene tal cual. Las metricas nuevas aparecen "
    "automaticamente cuando registras vueltas; no requieren configuracion extra "
    "(salvo definir el numero de sectores al crear la sesion, opcional).",
    style_body,
))

# ---- 2. Stack tecnico ------------------------------------------------------
story.append(Paragraph("Stack tecnico", style_h2))
story.append(section_rule())
story.append(kv_table([
    ("Framework", "Next.js 16 (App Router) sobre React 19 y TypeScript estricto"),
    ("Estilos", "Tailwind CSS v4, tema oscuro racing (rojo #DC2626)"),
    ("Backend", "Supabase: Auth por email + Postgres + RLS + Realtime"),
    ("PWA", "Serwist (Service Worker, precaching, manifest, instalable)"),
    ("Excel", "ExcelJS - hojas Resumen, Tiempos, Sectores, Stints, Eventos, Setup"),
    ("Hosting", "Vercel - desplegado desde CLI, dominio publico"),
    ("Iconografia", "lucide-react, iconos PNG/SVG generados con sharp"),
    ("Graficas", "SVG nativo (sin librerias externas, tooltip integrado)"),
]))

# ---- 3. Lo que ya hacia el original ---------------------------------------
story.append(Paragraph("Lo que ya hacia el original y sigue estando", style_h2))
story.append(section_rule())
left = [
    "<b>Creacion de sesion completa</b>: modalidad, tipo, categoria, "
    "campeonato, equipo, evento, circuito, fecha.",
    "<b>Datos del piloto y maquina</b>: piloto, chasis, motor.",
    "<b>Condiciones</b>: clima, temperatura aire y pista, notas.",
    "<b>Cronometro</b>: start / pause / reanudar / reset / registrar vuelta.",
]
right = [
    "<b>Estado de pista</b>: Green / Yellow / Red Flag, Safety Car, VSC, Pit Lane.",
    "<b>Eventos</b>: incidencia, pit in/out, safety car sale/entra, "
    "bandera, cambio de clima.",
    "<b>Setup</b>: direccion, eje trasero, motor (texto libre).",
    "<b>Exportacion Excel</b>: ahora ampliada con sectores y stints.",
]
story.append(two_col_bullets(left, right))

# ---- 4. Funcionalidades nuevas v2 ------------------------------------------
story.append(Paragraph("Funcionalidades anadidas (v2)", style_h2))
story.append(section_rule())
v2 = [
    ("Multiusuario con autenticacion",
     "Cada mecanico o equipo crea su cuenta. Las sesiones son privadas (Row "
     "Level Security en Postgres). Cero filtrado entre cuentas."),
    ("PWA instalable",
     "Banner automatico en Chrome/Edge/Android. Hint guiado en iOS. Tras la "
     "primera carga, funciona offline."),
    ("Diseno responsivo",
     "Misma interfaz en movil (390 px) y desktop (hasta 1366+). Tema oscuro "
     "racing pensado para box."),
    ("Delta a la mejor vuelta",
     "Cada vuelta muestra cuanto tiempo pierde frente a la mejor. Color-coded: "
     "rojo para la mejor, ambar cuando se pierde tiempo."),
    ("Stats de pace",
     "Media de vueltas limpias, desviacion tipica, CV % y etiqueta cualitativa "
     "(Excelente / Muy buena / Buena / Aceptable / Irregular)."),
    ("Filtro de vueltas limpias",
     "Las stats de consistencia solo cuentan vueltas Green Flag. Pit in/out, SC "
     "y banderas quedan fuera para no contaminar la metrica."),
    ("Comparativa entre sesiones",
     "Pagina <font color='#DC2626'>/compare</font>: eliges 2 sesiones, ves "
     "stats lado a lado y diferencia vuelta a vuelta coloreada."),
    ("Excel ampliado",
     "La hoja Resumen incluye stats de pace. La hoja Tiempos tiene columna "
     "<i>Delta mejor</i> por vuelta."),
]
story.append(feature_grid(v2))

# ---- 5. Funcionalidades v3 (destacadas) ------------------------------------
story.append(Paragraph("Funcionalidades anadidas (v3) - destacado", style_h2))
story.append(section_rule())
story.append(Paragraph(
    "Esta es la version actual. Lo nuevo da el salto de <i>cuaderno digital</i> "
    "a <i>herramienta de analisis</i>.",
    style_lead,
))

v3 = [
    ("Sectores por vuelta",
     "Al crear la sesion eliges 0 a 10 sectores. El boton de vuelta cicla por "
     "los sectores (S1 -> S2 -> ... -> vuelta). Cada sector se guarda y se "
     "puede analizar."),
    ("Vuelta teorica",
     "Suma de mejores sectores de toda la sesion. Te dice cual seria tu vuelta "
     "si los juntaras todos. Aparece como bloque destacado encima del cronometro."),
    ("Mejor sector resaltado",
     "En la tabla de vueltas, expande una vuelta para ver los sectores. El "
     "mejor de cada sector aparece marcado en rojo."),
    ("Analisis de stints",
     "Nueva pestana <b>Stints</b>. Detecta automaticamente los stints separados "
     "por Pit In/Out. Por cada stint: vueltas, mejor, media, desviacion, "
     "consistencia y <i>decay</i> en s/vuelta."),
    ("Tiempo de pit stop automatico",
     "Calcula el tiempo entre Pit In y Pit Out de cada parada. En el Excel se "
     "expone como total y por stint."),
    ("Grafica de evolucion de tiempos",
     "Linea SVG nativa en la pestana Tiempos. Hover sobre cualquier punto "
     "muestra el numero de vuelta y el tiempo exacto."),
    ("Grafica en /compare",
     "Las dos sesiones se superponen en una sola grafica (A rojo, B azul). "
     "Ves de un vistazo donde diverge el pace."),
    ("Link publico read-only",
     "Toggle <b>Compartir publicamente</b> en cada sesion. Genera un slug y "
     "una URL <font color='#DC2626'>/s/&lt;slug&gt;</font> sin login. Util para "
     "mandar al piloto o familia sin pedir cuenta."),
    ("Realtime sync entre dispositivos",
     "El mecanico apunta una vuelta en el movil y el ingeniero la ve aparecer "
     "en su portatil al instante. Sin recargar. Usa Supabase Realtime."),
    ("Atajo de teclado: barra espaciadora",
     "En desktop, pulsa <i>espacio</i> para registrar vuelta o sector. Util "
     "cuando estas mirando la pista y no quieres tocar el raton."),
    ("Editar vueltas",
     "No solo borrar: ahora puedes corregir el tiempo, estado de pista o nota "
     "de cualquier vuelta sin recrearla."),
    ("Excel con hojas nuevas",
     "Anade hoja <b>Sectores</b> (mejor por sector + vuelta teorica) y hoja "
     "<b>Stints</b> (vueltas, mejor, media, decay, pit anterior)."),
]
story.append(feature_grid(v3))

# ---- 6. Umbrales -----------------------------------------------------------
story.append(Paragraph("Umbrales de consistencia (calibrados para karting)", style_h3))
threshold_data = [
    ["Coef. variacion", "Etiqueta", "Lectura tipica"],
    ["< 0.5 %", "Excelente", "Pace metronomico. Setup muy fino, piloto al limite."],
    ["0.5 - 1.0 %", "Muy buena", "Pace solido. Margen para optimizar pequenos detalles."],
    ["1.0 - 2.0 %", "Buena", "Sesion productiva. Trabajar sobre la variabilidad."],
    ["2.0 - 3.0 %", "Aceptable", "Hay ruido. Buscar la causa (trafico, neumatico, errores)."],
    ["> 3.0 %", "Irregular", "Sesion ruidosa para sacar conclusiones de pace."],
]
tt = Table(threshold_data, colWidths=[3.2 * cm, 3.8 * cm, 9.4 * cm])
tt.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), ACCENT),
    ("TEXTCOLOR", (0, 0), (-1, 0), white),
    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
    ("FONTSIZE", (0, 0), (-1, -1), 8.8),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ("TOPPADDING", (0, 0), (-1, -1), 5),
    ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [white, SURFACE]),
    ("LINEBELOW", (0, 0), (-1, -1), 0.3, RULE),
    ("TEXTCOLOR", (0, 1), (-1, -1), INK_SOFT),
]))
story.append(tt)
story.append(Spacer(1, 4))
story.append(Paragraph(
    "<i>CV = stddev / media. Solo cuenta vueltas Green Flag. El decay se calcula "
    "por regresion lineal cuando hay >= 3 vueltas en el stint.</i>",
    style_small,
))

# ---- 7. Privacidad y datos --------------------------------------------------
story.append(Paragraph("Privacidad y datos", style_h2))
story.append(section_rule())
story.append(kv_table([
    ("Privacidad por defecto",
     "Toda sesion es privada hasta que el dueno active el toggle publico."),
    ("Politicas Postgres",
     "RLS owner-only en sessions, laps, events, lap_sectors y setups. "
     "Politicas de lectura publica activas solo cuando is_public = true."),
    ("Borrado en cascada",
     "Borrar una sesion elimina sus vueltas, sectores, eventos y setup. "
     "Borrar una cuenta elimina sus sesiones."),
    ("Realtime",
     "Solo recibes eventos de tus propias sesiones (filtrado por RLS)."),
    ("Slug publico",
     "10 caracteres aleatorios. Se conserva si desactivas y reactivas el "
     "share (mismo link sigue funcionando)."),
]))

# ---- 8. Lo que NO hace -----------------------------------------------------
story.append(Paragraph("Lo que NO hace todavia", style_h2))
story.append(section_rule())
story.append(Paragraph(
    "Honestidad por delante. La app es ya una herramienta de analisis para "
    "uso amateur/semi-pro. Lo que falta para acercarse a software profesional "
    "como Alfano Visor, AiM RaceStudio o software de telemetria real:",
    style_body,
))
lim = [
    ("Telemetria en pista",
     "No se conecta a Mychron, Alfano, AiM ni equivalentes. La entrada es "
     "manual o via cronometro propio. Para deteccion automatica de sectores "
     "se necesitaria un cronometro con splits o GPS."),
    ("Multi-piloto por sesion",
     "Una sesion = un piloto. Comparar teammates se hace via /compare entre "
     "dos sesiones distintas."),
    ("Modelo de combustible y temperaturas",
     "Irrelevante en karting puro, pero faltaria para Endurance o "
     "monoplazas con stints largos."),
    ("Gap al lider en carrera",
     "No hay multi-piloto en sesion Race ni feed externo de tiempos."),
    ("Importacion de CSV de otros sistemas",
     "Pendiente. Hoy la entrada es manual o desde el cronometro integrado."),
    ("Templates de sesion",
     "Aun no se puede 'clonar' una sesion previa para empezar con setup "
     "prerrellenado."),
]
lim_data = [[Paragraph(f"<b>{k}</b>", style_body), Paragraph(v, style_body)]
            for k, v in lim]
lt = Table(lim_data, colWidths=[5.0 * cm, 11.4 * cm])
lt.setStyle(TableStyle([
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("LEFTPADDING", (0, 0), (-1, -1), 0),
    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ("TOPPADDING", (0, 0), (-1, -1), 4),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ("LINEBELOW", (0, 0), (-1, -1), 0.3, RULE),
]))
story.append(lt)

# ---- 9. Como se usa --------------------------------------------------------
story.append(Paragraph("Como se usa (flujo completo)", style_h2))
story.append(section_rule())
steps = [
    ("1. Entrar y crear cuenta",
     "Abre <b>https://vrs-studio-web.vercel.app</b>. Crea cuenta con email y "
     "contrasena. Confirma el email si Supabase asi lo requiere."),
    ("2. Instalar como app (opcional)",
     "Aparece banner en Android/Chrome/Edge para instalar con un click. En "
     "iOS sigue el hint para anadir a pantalla de inicio."),
    ("3. Crear sesion",
     "Boton <b>Nueva sesion</b>. Rellena datos generales. Si vas a usar "
     "sectores, indica el numero (0 a 10)."),
    ("4. Cronometrar vueltas",
     "Pestana <b>Tiempos</b>: Iniciar y luego Vuelta (o S1/S2/... si "
     "configuraste sectores). Atajo: barra espaciadora."),
    ("5. Registrar eventos",
     "Pestana <b>Eventos</b>: Pit In/Out, banderas, safety car, "
     "incidencias, cambio de clima. El tiempo de pit stop se calcula solo."),
    ("6. Ver stints y pace",
     "Pestana <b>Stints</b>: cada stint con su mejor, media, consistencia "
     "y curva de degradacion (decay)."),
    ("7. Setup",
     "Pestana <b>Setup</b>: direccion, eje trasero, motor. Texto libre, se "
     "guarda en cualquier momento."),
    ("8. Exportar Excel",
     "Boton <b>Exportar Excel</b> en la cabecera. Descarga .xlsx con hojas "
     "Resumen, Tiempos, Sectores, Stints, Eventos, Setup."),
    ("9. Compartir publicamente",
     "Boton <b>Privada</b> en la cabecera de la sesion para activar share. "
     "Genera URL /s/&lt;slug&gt;. Copiable con un click."),
    ("10. Comparar sesiones",
     "Desde el dashboard, boton <b>Comparar</b>. Eliges A y B, ves stats lado "
     "a lado, diferencia vuelta a vuelta y grafica con ambas series."),
]
step_data = [[Paragraph(f"<font color='#DC2626'><b>{n}</b></font>", style_body),
              Paragraph(d, style_body)] for n, d in steps]
st = Table(step_data, colWidths=[5.4 * cm, 11.0 * cm])
st.setStyle(TableStyle([
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("LEFTPADDING", (0, 0), (-1, -1), 0),
    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ("TOPPADDING", (0, 0), (-1, -1), 4),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ("LINEBELOW", (0, 0), (-1, -1), 0.3, RULE),
]))
story.append(st)

# ---- 10. Cierre ------------------------------------------------------------
story.append(Paragraph("Cierre", style_h2))
story.append(section_rule())
story.append(Paragraph(
    "El nucleo del original esta intacto. La reescritura le ha dado: <b>un "
    "sitio donde vivir</b> (navegador, movil, nube), <b>analisis de pace "
    "automatizado</b> (sectores, stints, comparativa, vuelta teorica), y "
    "<b>capacidad de compartir</b> resultados sin trampas.",
    style_body,
))
story.append(Paragraph(
    "Si echas en falta algo del workflow original, dimelo y lo recuperamos. "
    "Si hay alguna metrica nueva que te interesa, tambien.",
    style_body,
))
story.append(Spacer(1, 0.6 * cm))
story.append(Paragraph(
    "<font color='#71717A'>Documento generado automaticamente desde el codigo "
    "fuente del proyecto. v3 / 2026.</font>",
    style_small,
))


# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------
doc.build(story)
print(f"PDF generated: {OUTPUT}")
