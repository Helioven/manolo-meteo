# Manolo Meteo

Aplicación meteorológica con interfaz móvil/PWA, previsiones y recomendaciones prácticas con humor («El consejo de Manolo»).

> **Documento de contexto y trabajo — actualizado el 20/10/2026.** La información sobre pantallas procede de capturas facilitadas por el usuario; **no se ha auditado el código ni la exactitud de los datos meteorológicos**. Distinguir siempre entre comportamiento observado, incidencias por investigar y mejoras propuestas. Este README no constituye autorización para implementar cambios.

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

## Orden sugerido para retomar el proyecto

1. **Auditar el repositorio y el estado real de v1.9.1:** localizar componentes, funciones de consejo, consultas Open-Meteo, normalización horaria, manejo de errores, caché/PWA y pruebas existentes. La versión se observa en las capturas; verificar en código.
2. **Reproducir MET-01 y MET-02** con datos y fechas controlados; clasificar defectos confirmados, comportamiento esperado o falta de explicación.
3. **Definir requisitos y criterios de aceptación** para consejos útiles, trazables y no contradictorios.
4. **Prototipar y probar MET-03** (6/12/24/48 h), priorizando legibilidad móvil y accesibilidad.
5. **Investigar MET-04** y decidir si una segunda fuente aporta suficiente valor para justificar mantenimiento y costes.
6. **Realizar regresión:** distintas localidades, fechas, zona horaria, cambios de hora, días lluviosos/secos, pronósticos parciales, móvil/escritorio, instalación PWA y modo de conexión degradada.
7. Documentar decisiones, resultados de QA y cambios de código **solo después de validarlos**.

## Principios de trabajo

- **Datos antes que ocurrencias:** ningún consejo debe prometer condiciones que la previsión no respalde.
- **Claridad antes que falsa precisión:** explicar «por qué» y «cuándo»; utilizar intervalos si corresponde.
- **Fuente y contexto visibles:** localidad, hora local, actualización, proveedor y limitaciones.
- **No confundir previsiones con avisos oficiales:** remitir a servicios meteorológicos competentes ante riesgos.
- **No modificar código ni dar por implementadas estas mejoras** sin decisión explícita del responsable del proyecto.
