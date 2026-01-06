#!/usr/bin/env python3
"""
Script para generar iconos de Android desde el logo
"""
from PIL import Image
import os

# Ruta del logo original
LOGO_PATH = '/home/vps/Documentos/survey-app/logo/logo_survey.png'

# Ruta base de los iconos de Android
ANDROID_RES_PATH = '/home/vps/Documentos/survey-app/survey_mobile/android/app/src/main/res'

# Tamaños de iconos para Android
ICON_SIZES = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192,
}

def make_square(img, bg_color=(255, 255, 255, 255)):
    """Hace la imagen cuadrada añadiendo padding"""
    width, height = img.size
    max_dim = max(width, height)
    
    # Crear imagen cuadrada con fondo
    square_img = Image.new('RGBA', (max_dim, max_dim), bg_color)
    
    # Calcular posición para centrar
    x = (max_dim - width) // 2
    y = (max_dim - height) // 2
    
    # Pegar la imagen original centrada
    square_img.paste(img, (x, y), img if img.mode == 'RGBA' else None)
    
    return square_img

def generate_icons():
    # Abrir la imagen original
    print(f"Abriendo logo: {LOGO_PATH}")
    img = Image.open(LOGO_PATH)
    
    # Convertir a RGBA si es necesario
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    print(f"Tamaño original: {img.size}")
    
    # Hacer la imagen cuadrada (fondo blanco)
    img = make_square(img, bg_color=(255, 255, 255, 255))
    print(f"Tamaño después de cuadrar: {img.size}")
    
    # Usar LANCZOS compatible con versiones antiguas de Pillow
    try:
        resample = Image.Resampling.LANCZOS
    except AttributeError:
        resample = Image.LANCZOS
    
    # Generar cada tamaño
    for folder, size in ICON_SIZES.items():
        output_dir = os.path.join(ANDROID_RES_PATH, folder)
        
        # Crear directorio si no existe
        os.makedirs(output_dir, exist_ok=True)
        
        # Redimensionar con alta calidad
        resized = img.resize((size, size), resample)
        
        # Guardar como ic_launcher.png
        output_path = os.path.join(output_dir, 'ic_launcher.png')
        resized.save(output_path, 'PNG', optimize=True)
        print(f"✓ Generado: {output_path} ({size}x{size})")
        
        # También guardar ic_launcher_round.png (mismo icono para simplicidad)
        round_path = os.path.join(output_dir, 'ic_launcher_round.png')
        resized.save(round_path, 'PNG', optimize=True)
        print(f"✓ Generado: {round_path} ({size}x{size})")
    
    # Generar icono para web/playstore (512x512)
    playstore_size = 512
    playstore_img = img.resize((playstore_size, playstore_size), resample)
    playstore_path = os.path.join(ANDROID_RES_PATH, '..', 'ic_launcher-playstore.png')
    playstore_img.save(playstore_path, 'PNG', optimize=True)
    print(f"✓ Generado: {playstore_path} ({playstore_size}x{playstore_size})")
    
    print("\n✅ Todos los iconos generados exitosamente!")

if __name__ == '__main__':
    generate_icons()

