#!/bin/bash
# Script para instalar Java

echo "☕ Instalando OpenJDK 17..."
echo ""
echo "Este script requiere permisos de administrador."
echo "Se te pedirá tu contraseña."
echo ""

sudo apt-get update
sudo apt-get install -y openjdk-17-jdk

# Configurar JAVA_HOME
JAVA_HOME="/usr/lib/jvm/java-17-openjdk-amd64"
if [ -d "$JAVA_HOME" ]; then
    export JAVA_HOME
    export PATH=$PATH:$JAVA_HOME/bin
    
    # Agregar a .bashrc
    if ! grep -q "JAVA_HOME" ~/.bashrc 2>/dev/null; then
        echo "" >> ~/.bashrc
        echo "# Java" >> ~/.bashrc
        echo "export JAVA_HOME=$JAVA_HOME" >> ~/.bashrc
        echo "export PATH=\$PATH:\$JAVA_HOME/bin" >> ~/.bashrc
    fi
    
    echo ""
    echo "✅ Java instalado y configurado"
    echo "📝 JAVA_HOME: $JAVA_HOME"
    echo ""
    echo "🔍 Verificando instalación:"
    java -version
    echo ""
    echo "📝 Para usar en esta sesión, ejecuta:"
    echo "   source ~/.bashrc"
    echo "   # O manualmente:"
    echo "   export JAVA_HOME=$JAVA_HOME"
    echo "   export PATH=\$PATH:\$JAVA_HOME/bin"
else
    echo "⚠️  No se pudo encontrar JAVA_HOME. Buscando..."
    JAVA_HOME=$(dirname $(dirname $(readlink -f $(which java 2>/dev/null) 2>/dev/null))) 2>/dev/null || JAVA_HOME=""
    if [ -n "$JAVA_HOME" ] && [ -d "$JAVA_HOME" ]; then
        echo "✅ JAVA_HOME encontrado: $JAVA_HOME"
        export JAVA_HOME
        export PATH=$PATH:$JAVA_HOME/bin
    else
        echo "❌ No se pudo configurar JAVA_HOME automáticamente"
        echo "   Por favor, configúralo manualmente después de verificar la instalación"
    fi
fi
