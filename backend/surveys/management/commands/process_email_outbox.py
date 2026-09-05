"""
Procesa la cola Mongo email_outbox (OTP, PDF, test).

Uso:
  python manage.py process_email_outbox
  python manage.py process_email_outbox --once
  python manage.py process_email_outbox --interval 5 --batch 20
"""
import time

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Procesa trabajos pendientes de email_outbox (SMTP asíncrono)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--once',
            action='store_true',
            help='Procesar un lote y salir (útil para cron)',
        )
        parser.add_argument(
            '--interval',
            type=float,
            default=5.0,
            help='Segundos entre lotes en modo loop (default 5)',
        )
        parser.add_argument(
            '--batch',
            type=int,
            default=20,
            help='Máximo de trabajos por lote (default 20)',
        )

    def handle(self, *args, **options):
        from surveys.email_outbox import process_pending_jobs

        once = options.get('once', False)
        interval = max(1.0, float(options.get('interval') or 5))
        batch = max(1, int(options.get('batch') or 20))

        self.stdout.write(self.style.NOTICE(
            f'email_outbox worker started (once={once}, interval={interval}s, batch={batch})'
        ))

        while True:
            processed, succeeded = process_pending_jobs(limit=batch)
            if processed:
                self.stdout.write(
                    f'Processed {processed} job(s), {succeeded} succeeded, '
                    f'{processed - succeeded} failed/retry'
                )
            if once:
                break
            time.sleep(interval)
