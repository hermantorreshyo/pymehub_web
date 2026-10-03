#!/usr/bin/env python3
"""
Pyme Hub · servidor de demostración (solo para desarrollo).

Sirve public/ y simula la API v0.2.0 de pymehub_api (docs/openapi.yaml) con datos
ficticios (§18), para ver y probar la interfaz sin instalar la API ni MySQL 8.4.
No forma parte de la aplicación: no se despliega y no sustituye a la API real.

Uso:
    python tools/servidor_demo.py                 # web en http://localhost:8090
    python tools/servidor_demo.py --latencia 800  # respuestas lentas (estados de carga)
    python tools/servidor_demo.py --puerto 8090 --puerto-api 8091

Solo usa la biblioteca estándar (Python 3.9+). Los datos viven en memoria:
al reiniciar el servidor vuelven al estado inicial.
"""
import argparse
import json
import re
import secrets
import sys
import threading
import time
from datetime import date, datetime, timedelta, timezone
from functools import partial
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

RAIZ = Path(__file__).resolve().parent.parent
PUBLIC = RAIZ / 'public'
CLAVE = 'demo1234'

# ---------------------------------------------------------------------------
# Datos de demostración (§18): dos empresas, una por plan
# ---------------------------------------------------------------------------
HOY = date.today()
FEATURES = {
    'ENTRADA': ['bienestar', 'formacion', 'asesor_formacion'],
    'COMPLETO': ['bienestar', 'formacion', 'asesor_formacion', 'riesgo_rotacion', 'linea_base'],
}
PRECIO = {'ENTRADA': 15.0, 'COMPLETO': 29.0}
PUESTOS = ['CONDUCTOR', 'REPARTIDOR', 'MOZO_ALMACEN', 'COORDINADOR', 'ADMINISTRATIVO', 'OTRO']
CONTRATOS = ['INDEFINIDO', 'TEMPORAL', 'ETT']
TURNOS = ['MANANA', 'TARDE', 'NOCHE', 'ROTATIVO']
MOTIVOS = ['VOLUNTARIA', 'NO_VOLUNTARIA', 'FIN_CONTRATO']
TIPOS_INCIDENCIA = ['AUSENCIA_INJUSTIFICADA', 'RETRASO', 'SINIESTRO', 'QUEJA_CLIENTE', 'RECONOCIMIENTO']
NOMBRES = ['Lucía', 'Javier', 'María', 'Jorge', 'Sara', 'Iván', 'Marta', 'Óscar', 'Noelia', 'Rubén',
           'Elena', 'Daniel', 'Paula', 'Sergio', 'Alba', 'Hugo', 'Irene', 'Adrián', 'Nerea', 'Pablo']
APELLIDOS = ['Martín Gómez', 'Ruiz Sánchez', 'Fernández Villaverde', 'Ramírez Ortega', 'López Prieto',
             'Díaz Herrero', 'Moreno Gil', 'Álvarez Calvo', 'Romero Pascual', 'Navarro Vidal',
             'Torres Lozano', 'Domínguez Marín', 'Vázquez Rubio', 'Ramos Iglesias', 'Blanco Sanz']


def ts(dias_atras=0, hora=9):
    d = datetime.now(timezone.utc) - timedelta(days=dias_atras)
    return d.replace(hour=hora, minute=15, second=0, microsecond=0).strftime('%Y-%m-%d %H:%M:%S')


EMPRESAS = {
    1: {'id': 1, 'tipo': 'PLATAFORMA', 'nombre': 'Pyme Hub', 'estado': 'ACTIVO'},
    10: {
        'id': 10, 'tipo': 'EMPRESA', 'nombre': 'Reparto Rápido Castilla S.L.', 'nombre_comercial': 'Reparto Rápido',
        'nif': 'B47123456', 'sector': 'Paquetería de última milla', 'email_contacto': 'hola@repartorapido.example',
        'telefono_contacto': '983 000 000', 'fecha_contrato_encargado': '2026-09-01', 'estado': 'ACTIVO',
        'suscripcion': {'plan': 'COMPLETO', 'ciclo_cobro': 'MENSUAL', 'precio_empleado_mes': 29.0,
                        'limite_empleados': 60, 'cuota_ia_diaria': 50, 'fecha_inicio': '2026-09-01'},
        'creado_en': '2026-09-01 08:00:00',
    },
    20: {
        'id': 20, 'tipo': 'EMPRESA', 'nombre': 'Mensajería Tajo S.L.', 'nombre_comercial': None,
        'nif': 'B45987654', 'sector': 'Mensajería', 'email_contacto': None, 'telefono_contacto': None,
        'fecha_contrato_encargado': None, 'estado': 'PILOTO',
        'suscripcion': {'plan': 'ENTRADA', 'ciclo_cobro': 'ANUAL', 'precio_empleado_mes': 15.0,
                        'limite_empleados': 20, 'cuota_ia_diaria': 50, 'fecha_inicio': '2026-09-15'},
        'creado_en': '2026-09-15 08:00:00',
    },
}

# Cuentas de demostración: email → datos (la contraseña de todas es CLAVE)
USUARIOS = {}
FICHAS = {}      # id de usuario → ficha laboral (solo empleados)
EQUIPOS = {}
INCIDENCIAS = []
_ids = {'usuario': 1000, 'equipo': 100, 'incidencia': 1}


def nuevo_id(tipo):
    _ids[tipo] += 1
    return _ids[tipo]


def alta_usuario(email, perfil, interlocutor_id, nombre, apellidos, estado='ACTIVO', ultimo=None):
    uid = nuevo_id('usuario')
    USUARIOS[uid] = {
        'id': uid, 'email': email, 'perfil': perfil, 'interlocutor_id': interlocutor_id,
        'nombre': nombre, 'apellidos': apellidos, 'estado_acceso': estado,
        'ultimo_acceso_en': ultimo, 'creado_en': '2026-09-01 08:00:00',
    }
    return uid


def alta_equipo(interlocutor_id, nombre, zona=None, responsable=None):
    eid = nuevo_id('equipo')
    EQUIPOS[eid] = {'id': eid, 'interlocutor_id': interlocutor_id, 'nombre': nombre, 'zona': zona,
                    'responsable_usuario_id': responsable, 'creado_en': '2026-09-01 08:00:00', 'borrado': False}
    return eid


def sembrar():
    alta_usuario('admin@pymehub.demo', 'ADMIN', 1, 'Herman', 'Torres', ultimo=ts(0, 8))
    gerente = alta_usuario('gerente@castilla.demo', 'GERENTE', 10, 'Ana', 'Gómez Ruiz', ultimo=ts(0, 7))
    rrhh = alta_usuario('rrhh@castilla.demo', 'RRHH', 10, 'Lucía', 'Martín Sanz', ultimo=ts(1, 16))
    alta_usuario('gerente@tajo.demo', 'GERENTE', 20, 'Pedro', 'Sanz Molina', ultimo=ts(2, 10))

    equipos_castilla = [
        alta_equipo(10, 'Zona Norte', 'Valladolid norte', rrhh),
        alta_equipo(10, 'Zona Sur', 'Valladolid sur'),
        alta_equipo(10, 'Nocturno', 'Polígono de San Cristóbal'),
        alta_equipo(10, 'Almacén', 'Nave central'),
    ]
    equipos_tajo = [alta_equipo(20, 'Toledo centro', 'Casco histórico'), alta_equipo(20, 'Talavera')]

    def plantilla(interlocutor_id, equipos, total, desfase):
        for i in range(total):
            n = (i + desfase) % len(NOMBRES)
            a = (i * 7 + desfase) % len(APELLIDOS)
            puesto = PUESTOS[0] if i % 3 == 0 else PUESTOS[(i + desfase) % 5]
            dias = 20 + (i * 97 + desfase * 13) % 2400  # antigüedades mixtas, varias < 90 días
            estado = ['ACTIVO', 'ACTIVO', 'INVITADO', 'SIN_ACCESO', 'ACTIVO', 'BLOQUEADO'][i % 6]
            con_email = estado != 'SIN_ACCESO' or i % 2 == 0
            dominio = 'castilla' if interlocutor_id == 10 else 'tajo'
            email = f'{NOMBRES[n].lower()}.{i}@{dominio}.demo'.translate(str.maketrans('áéíóúñÁÉÍÓÚÑ', 'aeiounAEIOUN'))
            uid = alta_usuario(email if con_email else None, 'EMPLEADO', interlocutor_id, NOMBRES[n], APELLIDOS[a],
                               estado=estado, ultimo=ts(i % 9, 7 + i % 10) if estado == 'ACTIVO' else None)
            FICHAS[uid] = {
                'codigo_interno': f'{"RRC" if interlocutor_id == 10 else "MT"}-{i + 1:03d}',
                'puesto': puesto,
                'tipo_contrato': CONTRATOS[0] if i % 4 in (0, 1) else CONTRATOS[(i % 4) - 1],
                'turno': 'NOCHE' if equipos[i % len(equipos)] == equipos_castilla[2] else TURNOS[i % 4 if i % 4 != 2 else 3],
                'fecha_alta': (HOY - timedelta(days=dias)).isoformat(),
                'fecha_baja': None, 'motivo_baja': None,
                'equipo_id': equipos[i % len(equipos)],
            }

    plantilla(10, equipos_castilla, 48, 0)
    plantilla(20, equipos_tajo, 15, 5)

    # Conductor de la demo del asesor (§12.6), con cuenta activa
    conductor = alta_usuario('conductor@castilla.demo', 'EMPLEADO', 10, 'Carlos', 'Rojas Pérez', ultimo=ts(0, 6))
    FICHAS[conductor] = {'codigo_interno': 'RRC-049', 'puesto': 'CONDUCTOR', 'tipo_contrato': 'TEMPORAL', 'turno': 'MANANA',
                         'fecha_alta': (HOY - timedelta(days=240)).isoformat(), 'fecha_baja': None, 'motivo_baja': None,
                         'equipo_id': equipos_castilla[0]}

    # Dos bajas laborales en Castilla para el filtro "De baja"
    empleados_castilla = [u for u in USUARIOS.values() if u['perfil'] == 'EMPLEADO' and u['interlocutor_id'] == 10]
    for u, motivo in ((empleados_castilla[5], 'VOLUNTARIA'), (empleados_castilla[11], 'FIN_CONTRATO')):
        FICHAS[u['id']].update(fecha_baja=(HOY - timedelta(days=12)).isoformat(), motivo_baja=motivo)
        u['estado_acceso'] = 'BLOQUEADO'

    # Seis meses de incidencias (LEG-012: solo ausencias injustificadas)
    notas = ['Corte de tráfico en la A-62.', None, 'Cliente satisfecho con la entrega urgente.', None,
             'Golpe leve al aparcar, sin daños personales.', 'Retraso en la recogida del almacén.']
    for k, u in enumerate(empleados_castilla[:30]):
        for j in range(k % 4):
            tipo = TIPOS_INCIDENCIA[(k + j) % 5]
            INCIDENCIAS.append({
                'id': nuevo_id('incidencia'), 'empleado_id': u['id'], 'tipo': tipo,
                'fecha': (HOY - timedelta(days=5 + (k * 11 + j * 37) % 180)).isoformat(),
                'nota': notas[(k + j) % len(notas)], 'registrada_por_id': rrhh if j % 2 else gerente,
                'creado_en': ts(5 + j, 12),
            })
    return gerente


sembrar()

# ---------------------------------------------------------------------------
# Presentación (mismos campos que la API real)
# ---------------------------------------------------------------------------

def persona(uid):
    u = USUARIOS.get(uid)
    return {'id': u['id'], 'nombre': u['nombre'], 'apellidos': u['apellidos']} if u else None


def equipo_vigente(eid, interlocutor_id):
    e = EQUIPOS.get(eid)
    return e if e and not e['borrado'] and e['interlocutor_id'] == interlocutor_id else None


def presentar_equipo(e):
    empleados = sum(1 for uid, f in FICHAS.items()
                    if f['equipo_id'] == e['id'] and not f['fecha_baja'] and uid in USUARIOS)
    return {'id': e['id'], 'nombre': e['nombre'], 'zona': e['zona'],
            'responsable': persona(e['responsable_usuario_id']), 'empleados': empleados, 'creado_en': e['creado_en']}


def presentar_empleado(uid):
    u, f = USUARIOS[uid], FICHAS[uid]
    eq = EQUIPOS.get(f['equipo_id']) if f['equipo_id'] else None
    return {
        'id': uid, 'nombre': u['nombre'], 'apellidos': u['apellidos'], 'email': u['email'],
        'estado_acceso': u['estado_acceso'], 'codigo_interno': f['codigo_interno'], 'puesto': f['puesto'],
        'tipo_contrato': f['tipo_contrato'], 'turno': f['turno'], 'fecha_alta': f['fecha_alta'],
        'fecha_baja': f['fecha_baja'], 'motivo_baja': f['motivo_baja'],
        'equipo': {'id': eq['id'], 'nombre': eq['nombre']} if eq and not eq['borrado'] else None,
        'ultimo_acceso_en': u['ultimo_acceso_en'], 'creado_en': u['creado_en'],
    }


def presentar_incidencia(i):
    return {'id': i['id'], 'empleado_id': i['empleado_id'], 'tipo': i['tipo'], 'fecha': i['fecha'], 'nota': i['nota'],
            'registrada_por': persona(i['registrada_por_id']), 'creado_en': i['creado_en']}


def empleados_activos(interlocutor_id):
    return sum(1 for uid, f in FICHAS.items() if USUARIOS[uid]['interlocutor_id'] == interlocutor_id and not f['fecha_baja'])


def presentar_empresa(e):
    return {**{k: v for k, v in e.items() if k != 'tipo'}, 'empleados_activos': empleados_activos(e['id'])}


# ---------------------------------------------------------------------------
# Errores y validación (formato de la API: { error: { code, message, details, correlation_id } })
# ---------------------------------------------------------------------------

class ApiError(Exception):
    def __init__(self, status, code, message, details=None):
        super().__init__(message)
        self.status, self.code, self.message, self.details = status, code, message, details or {}


def validacion(detalles, mensaje='Datos de entrada no válidos', status=422):
    return ApiError(status, 'PH-VAL-001', mensaje, detalles)


NO_ENCONTRADO = ApiError(404, 'PH-TENANT-001', 'Recurso no encontrado')
SIN_PERMISO = ApiError(403, 'PH-PERM-001', 'Tu perfil no permite esta acción')
EMAIL_RE = re.compile(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')
FECHA_RE = re.compile(r'^\d{4}-\d{2}-\d{2}$')


def fecha_valida(valor):
    if not isinstance(valor, str) or not FECHA_RE.match(valor):
        return None
    try:
        return date.fromisoformat(valor)
    except ValueError:
        return None


def email_en_uso(email, excepto=None):
    return any(u['email'] and u['email'].lower() == email.lower() and u['id'] != excepto for u in USUARIOS.values())


# ---------------------------------------------------------------------------
# Servidor de la API simulada
# ---------------------------------------------------------------------------
SESIONES = {}   # token de cookie → { usuario_id, csrf }
CORREL = threading.local()


class Api(BaseHTTPRequestHandler):
    server_version = 'PymeHubDemo'
    origenes = set()
    latencia = 0

    def log_message(self, fmt, *args):
        sys.stderr.write(f'  api  {self.command:6} {self.path}  →  {args[1] if len(args) > 1 else ""}\n')

    # --- respuesta ---
    def cabeceras_cors(self):
        origen = self.headers.get('Origin')
        if origen in self.origenes:
            self.send_header('Access-Control-Allow-Origin', origen)
            self.send_header('Access-Control-Allow-Credentials', 'true')
            self.send_header('Access-Control-Expose-Headers', 'X-Correlation-Id')
            self.send_header('Vary', 'Origin')

    def responder(self, status, data=None, meta=None, cookie=None):
        self.send_response(status)
        self.cabeceras_cors()
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Correlation-Id', CORREL.id)
        if cookie is not None:
            self.send_header('Set-Cookie', cookie)
        if status == 204:
            self.send_header('Content-Length', '0')
            self.end_headers()
            return
        cuerpo = {'data': data}
        if meta is not None:
            cuerpo['meta'] = meta
        raw = json.dumps(cuerpo, ensure_ascii=False).encode('utf-8')
        self.send_header('Content-Length', str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def responder_error(self, e):
        raw = json.dumps({'error': {'code': e.code, 'message': e.message, 'details': e.details,
                                    'correlation_id': CORREL.id}}, ensure_ascii=False).encode('utf-8')
        self.send_response(e.status)
        self.cabeceras_cors()
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('X-Correlation-Id', CORREL.id)
        self.send_header('Content-Length', str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    # --- petición ---
    def cuerpo_json(self):
        n = int(self.headers.get('Content-Length') or 0)
        if not n:
            return {}
        try:
            datos = json.loads(self.rfile.read(n).decode('utf-8'))
        except (ValueError, UnicodeDecodeError):
            raise validacion({}, 'El cuerpo no es JSON válido')
        if not isinstance(datos, dict):
            raise validacion({}, 'El cuerpo debe ser un objeto JSON')
        return datos

    def sesion(self):
        cookie = SimpleCookie(self.headers.get('Cookie') or '')
        token = cookie['PHDEMO'].value if 'PHDEMO' in cookie else None
        s = SESIONES.get(token)
        if not s or s['usuario_id'] not in USUARIOS:
            raise ApiError(401, 'PH-AUTH-002', 'Sesión caducada o inexistente')
        s['token'] = token
        return s

    def do_OPTIONS(self):
        CORREL.id = secrets.token_hex(8)
        self.send_response(204)
        self.cabeceras_cors()
        if self.headers.get('Origin') in self.origenes:
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token')
            self.send_header('Access-Control-Max-Age', '600')
        self.send_header('Content-Length', '0')
        self.end_headers()

    def do_GET(self): self.atender()
    def do_POST(self): self.atender()
    def do_PATCH(self): self.atender()
    def do_DELETE(self): self.atender()
    def do_PUT(self): self.atender()

    def atender(self):
        CORREL.id = secrets.token_hex(8)
        if self.latencia:
            time.sleep(self.latencia / 1000)
        url = urlparse(self.path)
        ruta = '/' + url.path.strip('/')
        consulta = {k: v[0] for k, v in parse_qs(url.query).items()}
        try:
            self.enrutar(self.command, ruta, consulta)
        except ApiError as e:
            self.responder_error(e)
        except Exception as e:  # noqa: BLE001 — se informa como PH-SYS-001, igual que la API
            sys.stderr.write(f'  ERROR {e!r}\n')
            self.responder_error(ApiError(500, 'PH-SYS-001', 'Error interno'))

    # --- rutas ---
    def enrutar(self, metodo, ruta, q):
        if ruta == '/v1/health' and metodo == 'GET':
            return self.responder(200, {'estado': 'ok', 'modo': 'demostracion'})
        if ruta == '/v1/auth/login' and metodo == 'POST':
            return self.login()
        if ruta == '/v1/auth/invitations/accept' and metodo == 'POST':
            return self.aceptar_invitacion()

        s = self.sesion()
        if metodo != 'GET' and self.headers.get('X-CSRF-Token') != s['csrf']:
            raise ApiError(403, 'PH-AUTH-003', 'Token CSRF ausente o no válido')
        yo = USUARIOS[s['usuario_id']]

        if ruta == '/v1/auth/me' and metodo == 'GET':
            return self.responder(200, self.me(yo, s))
        if ruta == '/v1/auth/logout' and metodo == 'POST':
            SESIONES.pop(s['token'], None)
            return self.responder(204, cookie='PHDEMO=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax')

        if ruta.startswith('/v1/admin/'):
            if yo['perfil'] != 'ADMIN':
                raise SIN_PERMISO
            return self.admin(metodo, ruta)

        if yo['perfil'] not in ('GERENTE', 'RRHH'):
            raise SIN_PERMISO
        tenant = yo['interlocutor_id']

        if ruta == '/v1/users':
            if yo['perfil'] != 'GERENTE':
                raise SIN_PERMISO
            if metodo == 'GET':
                filas = [{k: u[k] for k in ('id', 'perfil', 'nombre', 'apellidos', 'email', 'estado_acceso', 'ultimo_acceso_en', 'creado_en')}
                         for u in USUARIOS.values() if u['interlocutor_id'] == tenant and u['perfil'] in ('GERENTE', 'RRHH')]
                filas.sort(key=lambda u: (u['perfil'], u['apellidos'] or '', u['nombre']))
                return self.responder(200, filas, {'total': len(filas)})
            if metodo == 'POST':
                return self.crear_rrhh(tenant)
        if ruta == '/v1/teams':
            if metodo == 'GET':
                filas = sorted((presentar_equipo(e) for e in EQUIPOS.values() if e['interlocutor_id'] == tenant and not e['borrado']),
                               key=lambda e: e['nombre'])
                return self.responder(200, filas)
            if metodo == 'POST':
                return self.guardar_equipo(yo, tenant, None)
        m = re.fullmatch(r'/v1/teams/(\d+)', ruta)
        if m:
            return self.guardar_equipo(yo, tenant, int(m[1]), borrar=(metodo == 'DELETE'))
        if ruta == '/v1/employees':
            if metodo == 'GET':
                return self.listar_empleados(tenant, q)
            if metodo == 'POST':
                return self.guardar_empleado(tenant, None)
        if ruta == '/v1/employees/import' and metodo == 'POST':
            raise ApiError(501, 'PH-SYS-001', 'La importación CSV no está disponible en el servidor de demostración')
        m = re.fullmatch(r'/v1/employees/(\d+)(/invitation|/incidents)?', ruta)
        if m:
            uid = int(m[1])
            if uid not in FICHAS or USUARIOS[uid]['interlocutor_id'] != tenant:
                raise NO_ENCONTRADO
            sub = m[2]
            if sub is None and metodo == 'GET':
                return self.responder(200, presentar_empleado(uid))
            if sub is None and metodo == 'PATCH':
                return self.guardar_empleado(tenant, uid)
            if sub is None and metodo == 'DELETE':
                return self.baja_empleado(uid)
            if sub == '/invitation' and metodo == 'POST':
                return self.invitar(uid, tenant)
            if sub == '/incidents' and metodo == 'GET':
                return self.listar_incidencias(uid, q)
            if sub == '/incidents' and metodo == 'POST':
                return self.crear_incidencia(uid, yo)
        raise NO_ENCONTRADO

    # --- autenticación ---
    def me(self, u, s):
        i = EMPRESAS[u['interlocutor_id']]
        plan = i.get('suscripcion', {}).get('plan') if i['tipo'] == 'EMPRESA' else None
        return {
            'usuario': {k: u[k] for k in ('id', 'nombre', 'apellidos', 'email', 'perfil')},
            'interlocutor': {k: i[k] for k in ('id', 'tipo', 'nombre', 'estado')},
            'plan': plan, 'features': FEATURES.get(plan, []), 'csrf_token': s['csrf'],
            'sesion': {'inactividad_max_seg': 604800 if u['perfil'] == 'EMPLEADO' else 1800},
        }

    def login(self):
        b = self.cuerpo_json()
        email, clave = str(b.get('email', '')).strip().lower(), b.get('password')
        errores = {}
        if not EMAIL_RE.match(email):
            errores['email'] = 'Email no válido'
        if not isinstance(clave, str) or not clave:
            errores['password'] = 'Obligatorio'
        if errores:
            raise validacion(errores)
        u = next((x for x in USUARIOS.values() if x['email'] and x['email'].lower() == email), None)
        if not u or u['estado_acceso'] != 'ACTIVO' or clave != CLAVE:
            raise ApiError(401, 'PH-AUTH-001', 'Email o contraseña incorrectos')
        token = secrets.token_urlsafe(24)
        SESIONES[token] = {'usuario_id': u['id'], 'csrf': secrets.token_hex(16)}
        u['ultimo_acceso_en'] = ts(0, datetime.now(timezone.utc).hour)
        return self.responder(200, self.me(u, SESIONES[token]),
                              cookie=f'PHDEMO={token}; Path=/; HttpOnly; SameSite=Lax')

    def aceptar_invitacion(self):
        b = self.cuerpo_json()
        token, clave = str(b.get('token', '')), b.get('password')
        errores = {}
        if len(token) < 20:
            errores['token'] = 'No válido'
        if not isinstance(clave, str) or len(clave) < 10:
            errores['password'] = 'Mínimo 10 caracteres'
        if b.get('acepta_privacidad') is not True:
            errores['acepta_privacidad'] = 'Debes aceptar el aviso de privacidad'
        if errores:
            raise validacion(errores)
        if token.startswith('caducada'):
            raise ApiError(410, 'PH-AUTH-005', 'Invitación caducada o ya utilizada')
        invitado = next((u for u in USUARIOS.values() if u['estado_acceso'] == 'INVITADO' and u['email']), None)
        if invitado:
            invitado['estado_acceso'] = 'ACTIVO'
        return self.responder(200, {'email': invitado['email'] if invitado else 'conductor@castilla.demo',
                                    'mensaje': 'Cuenta activada. Ya puedes iniciar sesión.'})

    # --- plataforma ---
    def admin(self, metodo, ruta):
        empresas = [e for e in EMPRESAS.values() if e['tipo'] == 'EMPRESA']
        if ruta == '/v1/admin/metrics' and metodo == 'GET':
            por_estado = {}
            for e in empresas:
                por_estado[e['estado']] = por_estado.get(e['estado'], 0) + 1
            por_plan = []
            for e in empresas:
                s, n = e['suscripcion'], empleados_activos(e['id'])
                por_plan.append({'plan': s['plan'], 'ciclo_cobro': s['ciclo_cobro'], 'empresas': 1,
                                 'empleados': n, 'mrr_teorico': round(n * PRECIO[s['plan']], 2)})
            return self.responder(200, {'empresas_por_estado': [{'estado': k, 'total': v} for k, v in por_estado.items()],
                                        'por_plan': por_plan})
        if ruta == '/v1/admin/tenants' and metodo == 'GET':
            filas = sorted((presentar_empresa(e) for e in empresas), key=lambda e: e['nombre'])
            return self.responder(200, filas, {'total': len(filas)})
        m = re.fullmatch(r'/v1/admin/tenants/(\d+)', ruta)
        if m and metodo == 'GET':
            e = EMPRESAS.get(int(m[1]))
            if not e or e['tipo'] != 'EMPRESA':
                raise NO_ENCONTRADO
            gestion = [{k: u[k] for k in ('id', 'perfil', 'nombre', 'apellidos', 'email', 'estado_acceso')}
                       for u in USUARIOS.values() if u['interlocutor_id'] == e['id'] and u['perfil'] in ('GERENTE', 'RRHH')]
            return self.responder(200, {**presentar_empresa(e), 'usuarios_gestion': gestion})
        raise ApiError(501, 'PH-SYS-001', 'Operación no disponible en el servidor de demostración')

    # --- organización ---
    def crear_rrhh(self, tenant):
        b = self.cuerpo_json()
        errores = {}
        nombre, email = str(b.get('nombre') or '').strip(), str(b.get('email') or '').strip()
        if len(nombre) < 2:
            errores['nombre'] = 'Mínimo 2 caracteres'
        if not EMAIL_RE.match(email):
            errores['email'] = 'Email no válido'
        if errores:
            raise validacion(errores)
        if email_en_uso(email):
            raise validacion({'email': 'Duplicado'}, 'Ese email ya tiene una cuenta', 409)
        uid = alta_usuario(email, 'RRHH', tenant, nombre, b.get('apellidos'), estado='INVITADO')
        u = USUARIOS[uid]
        return self.responder(201, {**{k: u[k] for k in ('id', 'perfil', 'nombre', 'apellidos', 'email', 'estado_acceso')},
                                    'invitacion': self.enlace()})

    def enlace(self):
        return {'enlace': f'http://localhost:{Static.puerto}/#/invitacion/{secrets.token_urlsafe(32)}',
                'expira_en': (datetime.now(timezone.utc) + timedelta(hours=72)).strftime('%Y-%m-%dT%H:%M:%SZ')}

    def guardar_equipo(self, yo, tenant, eid, borrar=False):
        if yo['perfil'] != 'GERENTE':
            raise SIN_PERMISO
        equipo = equipo_vigente(eid, tenant) if eid else None
        if eid and not equipo:
            raise NO_ENCONTRADO
        if borrar:
            if presentar_equipo(equipo)['empleados'] > 0:
                raise validacion({'equipo': 'Tiene empleados de alta'}, 'El equipo tiene empleados de alta', 409)
            equipo['borrado'] = True
            return self.responder(204)
        b = self.cuerpo_json()
        errores = {}
        if eid is None or 'nombre' in b:
            nombre = str(b.get('nombre') or '').strip()
            if not 2 <= len(nombre) <= 80:
                errores['nombre'] = 'Entre 2 y 80 caracteres'
            elif any(e['nombre'].lower() == nombre.lower() and e['id'] != eid
                     for e in EQUIPOS.values() if e['interlocutor_id'] == tenant and not e['borrado']):
                raise validacion({'nombre': 'Ya existe un equipo con ese nombre'}, 'Nombre de equipo duplicado', 409)
        resp = b.get('responsable_usuario_id')
        if resp is not None and (resp not in USUARIOS or USUARIOS[resp]['interlocutor_id'] != tenant):
            errores['responsable_usuario_id'] = 'Usuario no válido'
        if errores:
            raise validacion(errores)
        if equipo is None:
            equipo = EQUIPOS[alta_equipo(tenant, b['nombre'].strip(), b.get('zona'), resp)]
            status = 201
        else:
            for k in ('nombre', 'zona', 'responsable_usuario_id'):
                if k in b:
                    equipo[k] = b[k].strip() if isinstance(b[k], str) else b[k]
            status = 200
        return self.responder(status, presentar_equipo(equipo))

    def listar_empleados(self, tenant, q):
        situacion = q.get('situacion', 'ALTA')
        if situacion not in ('ALTA', 'BAJA', 'TODAS'):
            raise validacion({'situacion': 'Valor no válido'})
        try:
            pagina = max(1, int(q.get('page', 1)))
            por_pagina = min(100, max(1, int(q.get('per_page', 25))))
        except ValueError:
            raise validacion({'page': 'Debe ser un número'})
        filas = [uid for uid, f in FICHAS.items() if USUARIOS[uid]['interlocutor_id'] == tenant]
        if situacion == 'ALTA':
            filas = [uid for uid in filas if not FICHAS[uid]['fecha_baja']]
        elif situacion == 'BAJA':
            filas = [uid for uid in filas if FICHAS[uid]['fecha_baja']]
        if q.get('equipo_id'):
            filas = [uid for uid in filas if str(FICHAS[uid]['equipo_id']) == q['equipo_id']]
        texto = q.get('q', '').strip().lower()
        if texto:
            def coincide(uid):
                u, f = USUARIOS[uid], FICHAS[uid]
                return texto in ' '.join(filter(None, [u['nombre'], u['apellidos'], u['email'], f['codigo_interno']])).lower()
            filas = [uid for uid in filas if coincide(uid)]
        filas.sort(key=lambda uid: ((USUARIOS[uid]['apellidos'] or '').lower(), USUARIOS[uid]['nombre'].lower()))
        trozo = filas[(pagina - 1) * por_pagina: pagina * por_pagina]
        return self.responder(200, [presentar_empleado(uid) for uid in trozo],
                              {'total': len(filas), 'page': pagina, 'per_page': por_pagina})

    def guardar_empleado(self, tenant, uid):
        b = self.cuerpo_json()
        nuevo = uid is None
        if not nuevo and FICHAS[uid]['fecha_baja']:
            raise validacion({}, 'El empleado está dado de baja: la ficha es de solo lectura', 409)
        permitidos = {'nombre', 'apellidos', 'email', 'codigo_interno', 'puesto', 'tipo_contrato', 'turno', 'fecha_alta', 'equipo_id'}
        extra = set(b) - permitidos
        errores = {k: 'Campo no permitido' for k in extra}   # SEC-006
        obligatorios = ('nombre', 'puesto', 'tipo_contrato', 'turno', 'fecha_alta')

        def presente(k):
            return nuevo or k in b

        for k in obligatorios:
            if nuevo and (b.get(k) in (None, '')):
                errores[k] = 'Obligatorio'
        if presente('nombre') and 'nombre' not in errores and not 2 <= len(str(b.get('nombre') or '').strip()) <= 80:
            errores['nombre'] = 'Entre 2 y 80 caracteres'
        for campo, valores in (('puesto', PUESTOS), ('tipo_contrato', CONTRATOS), ('turno', TURNOS)):
            if campo in b and campo not in errores and b[campo] not in valores:
                errores[campo] = 'Valor no válido'
        if 'fecha_alta' in b and 'fecha_alta' not in errores:
            f = fecha_valida(b['fecha_alta'])
            if not f:
                errores['fecha_alta'] = 'Fecha no válida (AAAA-MM-DD)'
            elif f > HOY + timedelta(days=90):
                errores['fecha_alta'] = 'No puede ser posterior a 90 días'
        email = (b.get('email') or '').strip() or None if 'email' in b else None
        if email and not EMAIL_RE.match(email):
            errores['email'] = 'Email no válido'
        if b.get('equipo_id') is not None and not equipo_vigente(b['equipo_id'], tenant):
            errores['equipo_id'] = 'Equipo no válido'
        if errores:
            raise validacion(errores)
        codigo = (b.get('codigo_interno') or '').strip() or None if 'codigo_interno' in b else None
        if codigo and any(f['codigo_interno'] == codigo and USUARIOS[i]['interlocutor_id'] == tenant and i != uid
                          for i, f in FICHAS.items()):
            raise validacion({'codigo_interno': 'Ya lo usa otra persona de la plantilla'}, 'Código interno duplicado', 409)
        if email and email_en_uso(email, excepto=uid):
            raise validacion({'email': 'Ese email ya tiene una cuenta'}, 'Email duplicado', 409)
        if not nuevo and 'email' in b and USUARIOS[uid]['estado_acceso'] not in ('SIN_ACCESO', 'INVITADO'):
            raise validacion({'email': 'No se puede cambiar el email de una cuenta activa'})
        if nuevo:
            s = EMPRESAS[tenant]['suscripcion']
            if empleados_activos(tenant) >= s['limite_empleados']:
                raise ApiError(409, 'PH-TENANT-002', 'Límite de empleados del plan alcanzado')
            uid = alta_usuario(email, 'EMPLEADO', tenant, b['nombre'].strip(), (b.get('apellidos') or '').strip() or None,
                               estado='SIN_ACCESO')
            USUARIOS[uid]['creado_en'] = ts(0, datetime.now(timezone.utc).hour)
            FICHAS[uid] = {'codigo_interno': codigo, 'puesto': b['puesto'], 'tipo_contrato': b['tipo_contrato'],
                           'turno': b['turno'], 'fecha_alta': b['fecha_alta'], 'fecha_baja': None, 'motivo_baja': None,
                           'equipo_id': b.get('equipo_id')}
            return self.responder(201, presentar_empleado(uid))
        u, f = USUARIOS[uid], FICHAS[uid]
        for k in ('nombre', 'apellidos'):
            if k in b:
                u[k] = (b[k] or '').strip() or None
        if 'email' in b:
            u['email'] = email
        for k in ('puesto', 'tipo_contrato', 'turno', 'fecha_alta', 'equipo_id'):
            if k in b:
                f[k] = b[k]
        if 'codigo_interno' in b:
            f['codigo_interno'] = codigo
        return self.responder(200, presentar_empleado(uid))

    def baja_empleado(self, uid):
        b = self.cuerpo_json()
        f = FICHAS[uid]
        if f['fecha_baja']:
            raise validacion({}, 'El empleado ya estaba de baja', 409)
        errores = {}
        fb = fecha_valida(b.get('fecha_baja'))
        if not fb:
            errores['fecha_baja'] = 'Fecha no válida'
        elif fb > HOY:
            errores['fecha_baja'] = 'No puede ser futura'
        elif fb < date.fromisoformat(f['fecha_alta']):
            errores['fecha_baja'] = 'No puede ser anterior al alta'
        if b.get('motivo_baja') not in MOTIVOS:
            errores['motivo_baja'] = 'Valor no válido'
        if errores:
            raise validacion(errores)
        f.update(fecha_baja=b['fecha_baja'], motivo_baja=b['motivo_baja'])
        USUARIOS[uid]['estado_acceso'] = 'BLOQUEADO'
        return self.responder(200, presentar_empleado(uid))

    def invitar(self, uid, tenant):
        b = self.cuerpo_json()
        u = USUARIOS[uid]
        if FICHAS[uid]['fecha_baja']:
            raise validacion({}, 'El empleado está de baja', 409)
        if not EMPRESAS[tenant]['fecha_contrato_encargado']:
            raise ApiError(403, 'PH-TENANT-003', 'Falta el contrato de encargado del tratamiento')
        if u['estado_acceso'] in ('ACTIVO', 'BLOQUEADO'):
            raise validacion({'estado_acceso': 'La cuenta ya está activa o bloqueada'})
        email = (b.get('email') or '').strip() or u['email']
        if not email:
            raise validacion({'email': 'Indica un email para invitarle'})
        if not EMAIL_RE.match(email):
            raise validacion({'email': 'Email no válido'})
        if email_en_uso(email, excepto=uid):
            raise validacion({'email': 'Ese email ya tiene una cuenta'}, 'Email duplicado', 409)
        u['email'], u['estado_acceso'] = email, 'INVITADO'
        return self.responder(201, self.enlace())

    def listar_incidencias(self, uid, q):
        filas = [i for i in INCIDENCIAS if i['empleado_id'] == uid]
        if q.get('tipo'):
            filas = [i for i in filas if i['tipo'] == q['tipo']]
        if q.get('desde'):
            filas = [i for i in filas if i['fecha'] >= q['desde']]
        if q.get('hasta'):
            filas = [i for i in filas if i['fecha'] <= q['hasta']]
        filas.sort(key=lambda i: i['fecha'], reverse=True)
        pagina = max(1, int(q.get('page', 1)))
        por_pagina = min(100, max(1, int(q.get('per_page', 25))))
        trozo = filas[(pagina - 1) * por_pagina: pagina * por_pagina]
        return self.responder(200, [presentar_incidencia(i) for i in trozo],
                              {'total': len(filas), 'page': pagina, 'per_page': por_pagina})

    def crear_incidencia(self, uid, yo):
        b = self.cuerpo_json()
        errores = {}
        if b.get('tipo') not in TIPOS_INCIDENCIA:
            errores['tipo'] = 'Valor no válido'
        f = fecha_valida(b.get('fecha'))
        if not f:
            errores['fecha'] = 'Fecha no válida'
        elif f > HOY:
            errores['fecha'] = 'No puede ser futura'
        if b.get('nota') is not None and len(str(b['nota'])) > 500:
            errores['nota'] = 'Máximo 500 caracteres'
        if errores:
            raise validacion(errores)
        i = {'id': nuevo_id('incidencia'), 'empleado_id': uid, 'tipo': b['tipo'], 'fecha': b['fecha'],
             'nota': b.get('nota') or None, 'registrada_por_id': yo['id'], 'creado_en': ts(0, datetime.now(timezone.utc).hour)}
        INCIDENCIAS.append(i)
        return self.responder(201, presentar_incidencia(i))


# ---------------------------------------------------------------------------
# Servidor de archivos estáticos (public/) con la CSP local de .htaccess
# ---------------------------------------------------------------------------

class Static(SimpleHTTPRequestHandler):
    puerto = 8090
    puerto_api = 8091
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, '.js': 'text/javascript', '.mjs': 'text/javascript',
                      '.css': 'text/css', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json',
                      '.png': 'image/png', '.webp': 'image/webp', '.html': 'text/html'}

    def log_message(self, fmt, *args):
        pass

    def end_headers(self):
        self.send_header('Content-Security-Policy', (
            "default-src 'self'; script-src 'self' https://cdnjs.cloudflare.com; style-src 'self' https://fonts.googleapis.com; "
            "font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' http://localhost:* http://127.0.0.1:*; "
            "manifest-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"))
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def do_GET(self):
        # La configuración de la demo apunta a la API simulada, sin tocar public/js/config.js
        if urlparse(self.path).path == '/js/config.js':
            raw = (f"// Generado por tools/servidor_demo.py\n"
                   f"export const config = {{ apiUrl: 'http://localhost:{self.puerto_api}' }};\n").encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'text/javascript; charset=utf-8')
            self.send_header('Content-Length', str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)
            return
        super().do_GET()


def main():
    p = argparse.ArgumentParser(description='Servidor de demostración de Pyme Hub (web + API simulada).')
    p.add_argument('--puerto', type=int, default=8090, help='puerto de la web (por defecto 8090)')
    p.add_argument('--puerto-api', type=int, default=8091, help='puerto de la API simulada (por defecto 8091)')
    p.add_argument('--latencia', type=int, default=0, help='retraso de cada respuesta de la API en ms')
    args = p.parse_args()
    # La consola de Windows usa cp1252 por defecto: sin esto, las tildes del aviso fallarían
    for flujo in (sys.stdout, sys.stderr):
        if hasattr(flujo, 'reconfigure'):
            flujo.reconfigure(encoding='utf-8', errors='replace')

    Static.puerto, Static.puerto_api = args.puerto, args.puerto_api
    Api.latencia = args.latencia
    Api.origenes = {f'http://localhost:{args.puerto}', f'http://127.0.0.1:{args.puerto}'}

    web = ThreadingHTTPServer(('127.0.0.1', args.puerto), partial(Static, directory=str(PUBLIC)))
    api = ThreadingHTTPServer(('127.0.0.1', args.puerto_api), Api)
    threading.Thread(target=api.serve_forever, daemon=True).start()

    print(f"""
  Pyme Hub · servidor de demostración
  ───────────────────────────────────
  Web:  http://localhost:{args.puerto}
  API:  http://localhost:{args.puerto_api}  (simulada, datos en memoria)

  Cuentas (contraseña: {CLAVE})
    gerente@castilla.demo    Gerencia · plan Completo
    rrhh@castilla.demo       RR. HH. · plan Completo
    gerente@tajo.demo        Gerencia · plan Entrada
    conductor@castilla.demo  Empleado
    admin@pymehub.demo       Administración de la plataforma

  Invitación de prueba: http://localhost:{args.puerto}/#/invitacion/demo-invitacion-valida-000000000000
  Invitación caducada:  http://localhost:{args.puerto}/#/invitacion/caducada-000000000000000000000

  Ctrl+C para parar.
""", flush=True)
    try:
        web.serve_forever()
    except KeyboardInterrupt:
        print('\n  Servidor detenido.')


if __name__ == '__main__':
    main()
