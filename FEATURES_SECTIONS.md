# Funcionalidad de Secciones y Lógica Condicional

Esta documentación explica cómo usar las secciones y la lógica condicional en las encuestas.

## Secciones

Las secciones permiten organizar las preguntas de una encuesta en grupos lógicos. Esto es útil para:

- Organizar encuestas largas en partes más manejables
- Crear flujos de navegación estructurados
- Mejorar la experiencia del usuario al completar encuestas complejas

### Crear Secciones

1. En el editor de encuestas, haz clic en el botón **"Secciones"** en la barra superior
2. Haz clic en **"Agregar Sección"** para crear una nueva sección
3. Ingresa un título descriptivo para la sección
4. Opcionalmente, agrega una descripción

### Asignar Preguntas a Secciones

1. Selecciona una pregunta haciendo clic en ella
2. En el panel de configuración que aparece, encontrarás un selector de **"Sección"**
3. Selecciona la sección a la que deseas asignar la pregunta
4. Si no seleccionas ninguna sección, la pregunta aparecerá en la primera sección o sin sección

### Navegación entre Secciones

Cuando un usuario completa una encuesta con secciones:

- Verá un indicador de progreso mostrando todas las secciones
- Puede navegar entre secciones usando los botones "Anterior" y "Siguiente"
- Puede hacer clic directamente en cualquier sección visible para saltar a ella
- Las secciones completadas se marcan visualmente

## Lógica Condicional

La lógica condicional permite mostrar u ocultar preguntas o secciones basándose en las respuestas del usuario.

### Estructura de la Lógica Condicional

La lógica condicional se define como un objeto JSON con la siguiente estructura:

```json
{
  "type": "show_if",
  "question_id": "id_de_la_pregunta_referenciada",
  "operator": "equals",
  "value": "valor_esperado"
}
```

### Operadores Disponibles

- `equals`: La respuesta debe ser igual al valor especificado
- `not_equals`: La respuesta debe ser diferente al valor especificado
- `contains`: La respuesta debe contener el valor especificado (útil para texto)
- `greater_than`: La respuesta numérica debe ser mayor que el valor
- `less_than`: La respuesta numérica debe ser menor que el valor
- `greater_than_or_equal`: La respuesta numérica debe ser mayor o igual al valor
- `less_than_or_equal`: La respuesta numérica debe ser menor o igual al valor

### Ejemplos de Uso

#### Ejemplo 1: Mostrar pregunta solo si se selecciona una opción específica

```
Pregunta 1: "¿Tienes seguro médico?"
- Opción Única: ["Sí", "No"]

Pregunta 2: "¿Qué tipo de seguro tienes?"
- Lógica condicional:
  - question_id: "id_de_pregunta_1"
  - operator: "equals"
  - value: "Sí"
```

En este caso, la Pregunta 2 solo se mostrará si el usuario selecciona "Sí" en la Pregunta 1.

#### Ejemplo 2: Mostrar sección basada en respuesta numérica

```
Pregunta 1: "¿Cuántos años tienes?"
- Tipo: Número

Sección 2: "Información para menores de edad"
- Lógica condicional en primera pregunta de la sección:
  - question_id: "id_de_pregunta_1"
  - operator: "less_than"
  - value: "18"
```

#### Ejemplo 3: Mostrar pregunta basada en texto

```
Pregunta 1: "¿En qué ciudad vives?"
- Tipo: Texto Corto

Pregunta 2: "¿Conoces algún centro médico en tu ciudad?"
- Lógica condicional:
  - question_id: "id_de_pregunta_1"
  - operator: "contains"
  - value: "Bogotá"
```

## Configuración de Lógica Condicional (Próximamente)

La interfaz de usuario para configurar lógica condicional está en desarrollo. Por ahora, la lógica condicional debe configurarse directamente en el código o mediante la API.

## Validaciones

El sistema valida automáticamente:

1. **Referencias de Secciones**: Todas las preguntas que referencian una sección deben apuntar a una sección que existe
2. **Referencias de Preguntas**: Todas las condiciones que referencian preguntas deben apuntar a preguntas que existen
3. **Campos Requeridos**: Si una pregunta es requerida y está en una sección, el usuario debe completarla antes de avanzar

## Mejores Prácticas

1. **Organización**: Usa secciones para agrupar preguntas relacionadas temáticamente
2. **Navegación**: Limita el número de secciones a un máximo de 5-7 para mantener la navegación manejable
3. **Lógica Condicional**: Usa lógica condicional para crear flujos dinámicos, pero evita crear dependencias circulares
4. **Pruebas**: Siempre prueba tus encuestas con secciones y lógica condicional antes de publicarlas
5. **Claridad**: Asegúrate de que los títulos de las secciones sean descriptivos y claros

## Limitaciones Actuales

- La interfaz de usuario para configurar lógica condicional está en desarrollo
- Las secciones no pueden tener lógica condicional directamente (solo las preguntas)
- No hay soporte para "saltar a sección" basado en condiciones (solo mostrar/ocultar)

## Soporte Técnico

Para más información o reportar problemas, consulta la documentación de la API o contacta al equipo de desarrollo.

