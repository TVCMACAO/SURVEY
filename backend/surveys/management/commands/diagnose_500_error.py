"""
Comando de diagnóstico para errores 500 en /api/me/ y /api/surveys/
"""
from django.core.management.base import BaseCommand
from django.test import RequestFactory
from django.contrib.auth import get_user_model
from surveys.views import CurrentUserView
from surveys.serializers import UserSerializer
from surveys.mongo_user_utils import list_users_from_mongo, get_user_by_username
from surveys.mongo_user_model import MongoUser


class Command(BaseCommand):
    help = 'Diagnostica errores 500 en /api/me/ y /api/surveys/'

    def handle(self, *args, **options):
        self.stdout.write('\n=== DIAGNÓSTICO DE ERRORES 500 ===\n')
        
        # 1. Verificar usuarios en MongoDB
        self.stdout.write('1. Verificando usuarios en MongoDB...')
        try:
            users = list_users_from_mongo()
            self.stdout.write(self.style.SUCCESS(f'   ✓ Usuarios encontrados: {len(users)}'))
            for user in users:
                self.stdout.write(f'      - {user.get("username")} (rol: {user.get("role")})')
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'   ✗ Error: {str(e)}'))
        
        # 2. Probar creación de MongoUser
        self.stdout.write('\n2. Probando creación de MongoUser...')
        try:
            if users:
                test_user_doc = users[0]
                mongo_user = MongoUser(test_user_doc)
                self.stdout.write(self.style.SUCCESS(f'   ✓ MongoUser creado: {mongo_user.username}'))
                self.stdout.write(f'      - ID: {mongo_user.id}')
                self.stdout.write(f'      - Rol: {mongo_user.role}')
                self.stdout.write(f'      - Tiene _user_doc: {hasattr(mongo_user, "_user_doc")}')
            else:
                self.stdout.write(self.style.WARNING('   ⚠ No hay usuarios para probar'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'   ✗ Error creando MongoUser: {str(e)}'))
            import traceback
            self.stdout.write(traceback.format_exc())
        
        # 3. Probar serialización
        self.stdout.write('\n3. Probando serialización de usuario...')
        try:
            if users:
                test_user_doc = users[0]
                mongo_user = MongoUser(test_user_doc)
                serializer = UserSerializer(mongo_user)
                data = serializer.data
                self.stdout.write(self.style.SUCCESS(f'   ✓ Serialización exitosa'))
                self.stdout.write(f'      - Keys en data: {list(data.keys())}')
                self.stdout.write(f'      - Username: {data.get("username")}')
                self.stdout.write(f'      - Rol: {data.get("role")}')
            else:
                self.stdout.write(self.style.WARNING('   ⚠ No hay usuarios para probar'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'   ✗ Error en serialización: {str(e)}'))
            import traceback
            self.stdout.write(traceback.format_exc())
        
        # 4. Verificar conexión a MongoDB
        self.stdout.write('\n4. Verificando conexión a MongoDB...')
        try:
            from surveys.mongo_utils import get_mongo_db
            db = get_mongo_db()
            self.stdout.write(self.style.SUCCESS(f'   ✓ Conexión exitosa'))
            self.stdout.write(f'      - Base de datos: {db.name}')
            collections = db.list_collection_names()
            self.stdout.write(f'      - Colecciones: {len(collections)}')
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'   ✗ Error de conexión: {str(e)}'))
            import traceback
            self.stdout.write(traceback.format_exc())
        
        # 5. Verificar configuración de autenticación
        self.stdout.write('\n5. Verificando configuración de autenticación...')
        try:
            from django.conf import settings
            auth_backends = getattr(settings, 'AUTHENTICATION_BACKENDS', [])
            self.stdout.write(f'   Backends configurados: {len(auth_backends)}')
            for backend in auth_backends:
                self.stdout.write(f'      - {backend}')
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'   ✗ Error: {str(e)}'))
        
        # 6. Verificar logs recientes
        self.stdout.write('\n6. Verificando logs recientes...')
        try:
            import json
            log_file = '/app/debug.log'
            import os
            if os.path.exists(log_file):
                with open(log_file, 'r') as f:
                    lines = f.readlines()
                    recent_lines = lines[-20:] if len(lines) > 20 else lines
                    self.stdout.write(f'   Últimas {len(recent_lines)} líneas del log:')
                    for line in recent_lines:
                        try:
                            log_entry = json.loads(line.strip())
                            self.stdout.write(f'      [{log_entry.get("location")}] {log_entry.get("message")}')
                        except:
                            self.stdout.write(f'      {line.strip()[:100]}')
            else:
                self.stdout.write(self.style.WARNING(f'   ⚠ Archivo de log no existe: {log_file}'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'   ✗ Error leyendo logs: {str(e)}'))
        
        self.stdout.write('\n=== FIN DEL DIAGNÓSTICO ===\n')

