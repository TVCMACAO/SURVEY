#!/bin/bash
set -e

# Collect static files
python manage.py collectstatic --noinput

# Start Gunicorn
exec gunicorn survey_project.wsgi:application --bind 0.0.0.0:8000

