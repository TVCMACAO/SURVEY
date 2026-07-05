from django.test import TestCase, override_settings
from rest_framework.test import APIClient


@override_settings(
    DEBUG=True,
    SECRET_KEY='test-secret-key-for-unit-tests-only',
    MONGO_URI='mongodb://localhost:27017/',
)
class HealthCheckTests(TestCase):
    def test_health_returns_ok(self):
        client = APIClient()
        response = client.get('/api/health/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'status': 'ok'})


@override_settings(
    DEBUG=True,
    SECRET_KEY='test-secret-key-for-unit-tests-only',
    MONGO_URI='mongodb://localhost:27017/',
)
class ReferenceLookupFilterTests(TestCase):
    def test_filter_reference_row_limits_columns(self):
        from surveys.views import _filter_reference_row

        survey = {
            'reference_key_column': 'doc',
            'reference_mapping': {'q1': 'nombre', 'q2': 'email'},
        }
        row = {'doc': '123', 'nombre': 'Ana', 'email': 'a@test.com', 'extra': 'secret'}
        filtered = _filter_reference_row(row, survey)
        self.assertIn('doc', filtered)
        self.assertIn('nombre', filtered)
        self.assertIn('email', filtered)
        self.assertNotIn('extra', filtered)


@override_settings(
    DEBUG=True,
    SECRET_KEY='test-secret-key-for-unit-tests-only',
    MONGO_URI='mongodb://localhost:27017/',
)
class AuthenticationRequiredTests(TestCase):
    def test_surveys_list_requires_auth(self):
        client = APIClient()
        response = client.get('/api/surveys/')
        self.assertEqual(response.status_code, 401)
