# Manolo Meteo

Aplicación meteorológica con interfaz móvil/PWA, previsiones y recomendaciones prácticas con humor («El consejo de Manolo»).

> **Documento de contexto y trabajo — actualizado el 07/11/2026.** La información sobre pantallas procede de capturas facilitadas por el usuario; **no se ha auditado el código ni la exactitud de los datos meteorológicos**. Distinguir siempre entre comportamiento observado, incidencias por investigar y mejoras propuestas. Este README no constituye autorización para implementar cambios.

## Contexto observado en capturas (versión mostrada: v1.9.1)

- Tarjeta de **amanecer, atardecer y horas de luz** (ejemplo de la captura: 08:32, 19:34 y 11 h 02 min), con sensación térmica, humedad y viento.
- Indicador de actualización y atribución **Open-Meteo**, con hora local de la localidad.
- Tarjeta «**Lo que viene / Próximas 6 horas**» con horas, temperatura, probabilidad de precipitación y comentario breve.
- Tarjeta «**Próximos días**» con acceso a siete días y datos como humedad, viento máximo y UV máximo en la vista mostrada.
- «**El consejo de Manolo**» combina una frase humorística, una recomendación práctica y una nota sobre la previsión y avisos oficiales.
- «**Centro de operaciones**» enlaza a Radar, Avisos y Pronóstico de **AEMET**.
- «**Laboratorio QA / Probar ambientes**», marcado como «solo visual», con opción Demo.
- Pie de página atribuye datos a Open-Meteo, advierte que las previsiones son estimaciones y remite a avisos oficiales.
- Las capturas muestran interfaz móvil; no permiten verificar accesibilidad, cálculos, persistencia, API, funcionamiento offline ni diseño en escritorio.

## Feedback y problemas a investigar — 20/10/2026

### MET-01 — Recomendación de hora concreta sin justificación visible

**Evidencia:** en una captura compartida del 14/10/2026, el consejo «Terraza» indica «vete a 12:00 (al mediodía)» sin explicar por qué esa hora sería mejor que otras. Un usuario pregunta «q me recoja a las 12 para q».

**Problema de producto:** la hora parece arbitraria si la interfaz no explica qué variables la hacen preferible. **No está demostrado que el algoritmo esté mal**: hace falta revisar su lógica y los datos utilizados.

**Comportamiento deseado (propuesta):**
- Recomendar una **franja horaria** cuando varias horas tengan condiciones similares; evitar precisión ficticia.
- Si existe una hora objetivamente más favorable, explicar los motivos de forma breve y verificable.
- Si no hay una diferencia significativa, decir que varias horas son adecuadas, sin elegir una «hora óptima» artificial.
- Evaluar temperatura, sensación térmica, precipitación, viento y UV cuando sean relevantes; no usar una única variable de manera engañosa.
- Mantener el tono humorístico separado del consejo accionable y de la explicación meteorológica.

**Criterios QA propuestos:** misma meteorología con horas similares → intervalo o recomendación general; cambio real de lluvia/viento/calor → motivo explícito; datos faltantes → aviso de incertidumbre; recomendaciones y fecha deben referirse al día y localidad seleccionados.

### MET-02 — Posible incoherencia entre consejo de paraguas y previsión horaria

**Evidencia:** captura del 20/10/2026 con consejo «Paraguas» («La nube viene con ganas…») y horas visibles con 0 % de precipitación.

**Estado:** **hipótesis de defecto, no bug confirmado**. Las horas visibles podrían no abarcar el periodo que activa el consejo, o podría intervenir otro indicador (precipitación prevista, código de tiempo, ventana diaria, etc.).

**Investigación necesaria:** identificar las variables, umbrales y ventana temporal que alimentan el consejo; cotejar pronóstico horario y diario para la misma localidad, fecha y momento de actualización; comprobar caché, desfases de zona horaria y datos obsoletos.

**Criterios QA propuestos:** no dar un consejo categórico de paraguas sin respaldo explicable; si el riesgo está en otra franja, mencionarla; distinguir probabilidad de precipitación de lluvia confirmada; conservar advertencias sobre avisos oficiales.

## Mejoras candidatas — NO implementadas ni aprobadas

### MET-03 — Ampliación de la previsión horaria

**Objetivo:** permitir planificar salidas más allá de las próximas seis horas sin saturar la pantalla principal.

**Diseño exploratorio:** conservar **6 h** como vista rápida y ofrecer vistas ampliadas **12 h / 24 h / 48 h** mediante selector o navegación equivalente. Para cada intervalo mostrar horas locales y, según disponibilidad, temperatura, probabilidad de lluvia, viento y otros datos útiles.

**Decisiones pendientes:** si usar tarjetas desplazables o vista expandida; comportamiento al cruzar medianoche; accesibilidad del selector; rendimiento y frecuencia de actualización; cobertura real de la API. No mostrar valores ficticios como si fueran pronósticos.

**Pruebas QA sugeridas:** 6/12/24/48 h; cambio de día y horario de verano; selección de localidad; pantalla pequeña; scroll horizontal; datos ausentes; actualización y caché; coherencia entre resumen y detalle.

### MET-04 — Evaluación de una segunda fuente meteorológica

**Objetivo:** estudiar si contrastar proveedores mejora confianza, cobertura o claridad, sin mezclar datos incompatibles.

**Fuente que aparece en la aplicación:** Open-Meteo. **AEMET figura como enlaces a radar, avisos y pronóstico**; esto no prueba que alimente los cálculos de la app.

**Candidatos para investigación:** OpenWeather, WeatherAPI y servicios de AEMET según disponibilidad y condiciones aplicables. No se ha validado aún su precio, licencia, límites, cobertura, granularidad ni exactitud.

**Comprobar antes de elegir:** licencias y atribución, coste y cuotas, disponibilidad de datos horarios, cobertura España/internacional, latencia, fiabilidad, campos equivalentes, actualización, privacidad y términos de redistribución.

**Principio de diseño:** identificar el proveedor de cada pronóstico; no promediar ni combinar fuentes silenciosamente. Si se ofrece comparación, aclarar diferencias de hora de emisión, resolución espacial, unidades, modelos y horizonte. No declarar «más preciso» sin una evaluación con observaciones reales.

**Experimento propuesto:** comparar pronósticos de las mismas localidades, horas y variables durante un periodo definido, contrastándolos posteriormente con observaciones cuando sea viable. Registrar errores y discrepancias, no impresiones aisladas.

### MET-05 — Manolo meteorológico: avatar dinámico junto a «El consejo de Manolo» (idea aprobada para estudiar)

**Origen:** propuesta de Helio del 7/11/2026. **Estado:** concepto para futura renovación visual; **no implementado**, sin diseños finales ni autorización para modificar la app.

**Objetivo:** que «El consejo de Manolo» deje de ser solamente un texto y muestre un **avatar/mini icono de Manolo que cambie según el clima de la localidad seleccionada**. El personaje y el consejo deben comunicar la misma situación meteorológica, con un tono útil, cercano, original y distendido. Este cambio formaría parte de un rediseño más profesional de Manolo Meteo, menos parecido a una plantilla genérica, sin sacrificar legibilidad ni rendimiento.

**Identidad obligatoria de la mascota:** usar la versión oficial de **ManoloLabs by Helio**: robot 3D blanco/metálico, **dos antenas**, gafas oscuras cuadradas, bigote marrón, detalles luminosos azules y **M azul luminosa en el pecho**. Mantener proporciones y rasgos de las referencias oficiales; no reutilizar el Manolo antiguo ni inventar un personaje diferente. Los complementos y expresiones pueden variar con el tiempo sin ocultar sus rasgos identificativos.

**Estados iniciales candidatos** (ejemplos, no diseños aprobados): sol, intervalos nubosos, nublado, lluvia, tormenta, viento, nieve/frío, calor intenso y noche despejada. Se pueden usar accesorios discretos (paraguas, bufanda, etc.) y expresiones acordes. Evitar que el avatar contradiga el pronóstico o convierta alertas meteorológicas en chistes que minimicen el riesgo.

**Comportamiento propuesto:**
- Leer los datos meteorológicos **ya disponibles** en la aplicación; mapearlos a un conjunto limitado de estados visuales, sin exigir otra API solo para el icono.
- Definir **prioridades deterministas** si se solapan estados: p. ej., tormenta/precipitación y avisos relevantes antes que condición genérica de día o noche; calor/frío/viento solo cuando existan umbrales definidos y sustentados por datos.
- Emparejar cada avatar con un consejo contextual **coherente y explicable**, indicando el periodo temporal al que se refiere. Conservar separadas la frase humorística, la recomendación práctica y la información meteorológica verificable.
- Si hay datos incompletos o conflicto, mostrar el **Manolo neutro** y una recomendación prudente; no afirmar lluvia, sol ni temperatura sin respaldo.
- Usar imágenes optimizadas y accesibles (texto alternativo o decoración correctamente marcada, según contexto), con tamaño estable, sin saltos visuales y sin animaciones obligatorias. Preferir variantes visuales aprobadas frente a generación de imágenes en tiempo real.

**Despliegue por fases sugerido:**
1. Diseñar y **aprobar visualmente** una colección pequeña de avatares consistentes con el Manolo oficial.
2. Implementar el mapeo y la variante de avatar en la tarjeta actual de consejos, con fallback neutro.
3. Ampliar estados y pulir transiciones, solo si aportan valor y no perjudican rendimiento o accesibilidad.

**QA / aceptación futura:** comprobar localidad, día/noche, cambios de hora y zona horaria, transiciones entre condiciones, múltiples factores simultáneos, datos ausentes, caché, coherencia icono–consejo–previsión, lectura en móvil y escritorio, accesibilidad, tiempos de carga y comportamiento sin red. Incluir escenarios de riesgo meteorológico con mensajes prudentes. No dar por implementada esta mejora hasta revisar código, recursos y pruebas.

## Orden sugerido para retomar el proyecto

1. **Auditar el repositorio y el estado real de v1.9.1:** localizar componentes, funciones de consejo, consultas Open-Meteo, normalización horaria, manejo de errores, caché/PWA y pruebas existentes. La versión se observa en las capturas; verificar en código.
2. **Reproducir MET-01 y MET-02** con datos y fechas controlados; clasificar defectos confirmados, comportamiento esperado o falta de explicación.
3. **Definir requisitos y criterios de aceptación** para consejos útiles, trazables y no contradictorios.
4. **Prototipar y probar MET-03** (6/12/24/48 h), priorizando legibilidad móvil y accesibilidad.
5. **Investigar MET-04** y decidir si una segunda fuente aporta suficiente valor para justificar mantenimiento y costes.
6. **Planificar MET-05** como parte del rediseño visual: validar referencias oficiales de Manolo, prototipos y reglas de mapeo antes de implementar el avatar dinámico.
7. **Realizar regresión:** distintas localidades, fechas, zona horaria, cambios de hora, días lluviosos/secos, pronósticos parciales, móvil/escritorio, instalación PWA y modo de conexión degradada.
8. Documentar decisiones, resultados de QA y cambios de código **solo después de validarlos**.

## Principios de trabajo

- **Datos antes que ocurrencias:** ningún consejo debe prometer condiciones que la previsión no respalde.
- **Claridad antes que falsa precisión:** explicar «por qué» y «cuándo»; utilizar intervalos si corresponde.
- **Fuente y contexto visibles:** localidad, hora local, actualización, proveedor y limitaciones.
- **No confundir previsiones con avisos oficiales:** remitir a servicios meteorológicos competentes ante riesgos.
- **No modificar código ni dar por implementadas estas mejoras** sin decisión explícita del responsable del proyecto.
