# Sistema de Versionado Automático

Este proyecto utiliza un sistema de versionado automático que incrementa la versión en cada commit.

## Archivos de Versión

- **`VERSION`**: Archivo principal de versión (formato: `MAJOR.MINOR.PATCH`)
- **`survey_mobile/pubspec.yaml`**: Versión de la app móvil Flutter (formato: `version+buildNumber`)
- **`frontend/survey-ui/package.json`**: Versión del frontend React

## Uso

### Opción 1: Usar el script de commit (Recomendado)

```bash
./git-commit.sh "mensaje del commit"
./git-commit.sh patch "corrección de bug"
./git-commit.sh minor "nueva funcionalidad"
./git-commit.sh major "cambio importante"
```

Este script:
1. Incrementa automáticamente la versión
2. Actualiza todos los archivos de versión
3. Crea un commit con el formato: `vX.Y.Z: mensaje del commit`

### Opción 2: Incrementar versión manualmente

```bash
# Incrementar patch (1.0.0 -> 1.0.1)
./version_bump.sh patch

# Incrementar minor (1.0.0 -> 1.1.0)
./version_bump.sh minor

# Incrementar major (1.0.0 -> 2.0.0)
./version_bump.sh major
```

Luego hacer commit normalmente:
```bash
git add VERSION survey_mobile/pubspec.yaml frontend/survey-ui/package.json
git commit -m "v1.0.1: tu mensaje aquí"
```

### Opción 3: Hook pre-commit automático

El proyecto incluye un hook de Git que incrementa automáticamente la versión patch antes de cada commit. Esto asegura que cada commit tenga una nueva versión.

## Formato de Versión

- **Semantic Versioning**: `MAJOR.MINOR.PATCH`
  - **MAJOR**: Cambios incompatibles con versiones anteriores
  - **MINOR**: Nuevas funcionalidades compatibles hacia atrás
  - **PATCH**: Correcciones de bugs compatibles hacia atrás

- **Flutter Build Number**: Se incrementa automáticamente con cada cambio de versión

## Ejemplos

```bash
# Commit normal (incrementa patch automáticamente)
./git-commit.sh "Agregar validación de email"

# Commit con incremento minor
./git-commit.sh minor "Agregar nueva sección de reportes"

# Commit con incremento major
./git-commit.sh major "Refactorizar arquitectura del backend"
```

## Ver Versión Actual

```bash
cat VERSION
```

## Notas

- El hook pre-commit se ejecuta automáticamente antes de cada commit
- Si no quieres incrementar la versión, puedes hacer commit con `--no-verify` para saltar el hook
- Los archivos de versión se actualizan automáticamente en todos los componentes del proyecto

