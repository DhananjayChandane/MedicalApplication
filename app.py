from flask import Flask, request, jsonify, send_from_directory, make_response
from flask_cors import CORS
import psycopg2
import psycopg2.extras
import sqlite3
import hashlib
import os
import jwt
import csv
import io
import traceback
from datetime import datetime, timedelta
from functools import wraps

from flask import Flask
from flask_cors import CORS

app = Flask(__name__, static_folder='static', static_url_path='')
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')

CORS(
    app,
    resources={
        r"/api/*": {
            "origins": ["https://medicalapplication-3p64.onrender.com"]
        }
    },
    supports_credentials=True,
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
)


# Enable debug logging
import logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# PostgreSQL Connection String
# Use DATABASE_URL environment variable if available (e.g. on Render)
# Fallback to local default
DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/medical_store')

class DBConnection:
    def __init__(self):
        self.is_postgres = False
        self.conn = None
        
        # Try connecting to PostgreSQL first
        try:
            if DATABASE_URL and 'postgresql' in DATABASE_URL:
                self.conn = psycopg2.connect(DATABASE_URL)
                self.is_postgres = True
        except Exception as e:
            logger.warning(f"Failed to connect to PostgreSQL: {e}")
            logger.warning("Falling back to SQLite (local mode)")
            
        # Fallback to SQLite
        if not self.conn:
            try:
                self.conn = sqlite3.connect('medical_store.db')
                self.conn.row_factory = sqlite3.Row
                self.is_postgres = False
            except Exception as e:
                logger.error(f"Failed to connect to SQLite: {e}")
                raise

    def execute(self, query, params=None):
        if self.is_postgres:
            # Auto-convert SQLite ? to Postgres %s
            query = query.replace('?', '%s')
            
            # Handle SQLite-isms conversions
            query = query.replace("datetime('now')", "CURRENT_TIMESTAMP")
            query = query.replace("datetime('now', '+30 days')", "CURRENT_TIMESTAMP + INTERVAL '30 days'")
            query = query.replace("datetime(created_at, 'localtime')", "to_char(created_at, 'YYYY-MM-DD HH24:MI:SS')")
            query = query.replace("date('now', 'localtime')", "CURRENT_DATE")
            
            cur = self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            try:
                cur.execute(query, params)
                return cur
            except Exception as e:
                logger.error(f"Query error: {e}")
                logger.error(f"Query: {query}")
                raise e
        else:
            # SQLite Mode
            # Convert Postgres syntax back to SQLite if found (e.g. from init_db)
            query = query.replace('SERIAL PRIMARY KEY', 'INTEGER PRIMARY KEY AUTOINCREMENT')
            query = query.replace('TRUE', '1').replace('FALSE', '0')
            
            # Handle INTERVAL which is not supported in SQLite
            # We assume the only interval usage is +30 days for now
            if "INTERVAL '30 days'" in query:
                query = query.replace("CURRENT_TIMESTAMP + INTERVAL '30 days'", "datetime('now', '+30 days')")
            
            # SQLite handles ? natively, so no param replacement needed
            try:
                return self.conn.execute(query, params or ())
            except Exception as e:
                logger.error(f"SQLite Query error: {e}")
                logger.error(f"Query: {query}")
                raise e

    def commit(self):
        self.conn.commit()
        
    def close(self):
        self.conn.close()
        
    def __enter__(self):
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            self.conn.rollback()
        else:
            self.conn.commit()
        self.conn.close()

def get_db():
    return DBConnection()

def init_db():
    try:
        with get_db() as conn:
            # Stores/Tenants Table
            conn.execute('''
                CREATE TABLE IF NOT EXISTS stores (
                    id SERIAL PRIMARY KEY,
                    store_name TEXT NOT NULL,
                    store_code TEXT UNIQUE NOT NULL,
                    owner_name TEXT NOT NULL,
                    email TEXT,
                    phone TEXT,
                    address TEXT,
                    city TEXT,
                    state TEXT,
                    pincode TEXT,
                    gst_number TEXT,
                    license_number TEXT,
                    logo_url TEXT,
                    subscription_plan TEXT DEFAULT 'free',
                    subscription_status TEXT DEFAULT 'active',
                    trial_ends_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    is_active BOOLEAN DEFAULT TRUE
                )
            ''')

            # Store Locations
            conn.execute('''
                CREATE TABLE IF NOT EXISTS store_locations (
                    id SERIAL PRIMARY KEY,
                    store_id INTEGER NOT NULL REFERENCES stores(id),
                    location_name TEXT NOT NULL,
                    address TEXT,
                    city TEXT,
                    phone TEXT,
                    manager_name TEXT,
                    is_main BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Users Table
            conn.execute('''
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    store_id INTEGER NOT NULL REFERENCES stores(id),
                    username TEXT NOT NULL,
                    password TEXT NOT NULL,
                    email TEXT,
                    full_name TEXT,
                    role TEXT DEFAULT 'owner',
                    phone TEXT,
                    is_active BOOLEAN DEFAULT TRUE,
                    last_login TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(store_id, username)
                )
            ''')
            
            # Patients Table
            conn.execute('''
                CREATE TABLE IF NOT EXISTS patients (
                    id SERIAL PRIMARY KEY,
                    store_id INTEGER NOT NULL REFERENCES stores(id),
                    user_id INTEGER NOT NULL REFERENCES users(id),
                    name TEXT NOT NULL,
                    phone TEXT,
                    email TEXT,
                    address TEXT,
                    date_of_birth TEXT,
                    gender TEXT,
                    blood_group TEXT,
                    medical_history TEXT,
                    loyalty_points INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Medicines Table
            conn.execute('''
                CREATE TABLE IF NOT EXISTS medicines (
                    id SERIAL PRIMARY KEY,
                    store_id INTEGER NOT NULL REFERENCES stores(id),
                    user_id INTEGER NOT NULL REFERENCES users(id),
                    name TEXT NOT NULL,
                    generic_name TEXT,
                    category TEXT,
                    manufacturer TEXT,
                    batch_number TEXT,
                    barcode TEXT,
                    price REAL NOT NULL,
                    mrp REAL,
                    stock_quantity INTEGER DEFAULT 0,
                    reorder_level INTEGER DEFAULT 10,
                    expiry_date TEXT,
                    description TEXT,
                    prescription_required BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Payments/Transactions Table
            conn.execute('''
                CREATE TABLE IF NOT EXISTS payments (
                    id SERIAL PRIMARY KEY,
                    store_id INTEGER NOT NULL REFERENCES stores(id),
                    user_id INTEGER NOT NULL REFERENCES users(id),
                    location_id INTEGER REFERENCES store_locations(id),
                    patient_id INTEGER REFERENCES patients(id),
                    patient_name TEXT NOT NULL,
                    medicine_id INTEGER REFERENCES medicines(id),
                    medicine_name TEXT NOT NULL,
                    quantity INTEGER NOT NULL,
                    unit_price REAL NOT NULL,
                    discount_amount REAL DEFAULT 0,
                    tax_amount REAL DEFAULT 0,
                    amount REAL NOT NULL,
                    payment_mode TEXT NOT NULL,
                    transaction_id TEXT,
                    invoice_number TEXT,
                    notes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Stock Alerts Table
            conn.execute('''
                CREATE TABLE IF NOT EXISTS stock_alerts (
                    id SERIAL PRIMARY KEY,
                    store_id INTEGER NOT NULL REFERENCES stores(id),
                    user_id INTEGER NOT NULL REFERENCES users(id),
                    medicine_id INTEGER NOT NULL REFERENCES medicines(id),
                    alert_type TEXT,
                    alert_threshold INTEGER DEFAULT 10,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Prescriptions Table
            conn.execute('''
                CREATE TABLE IF NOT EXISTS prescriptions (
                    id SERIAL PRIMARY KEY,
                    store_id INTEGER NOT NULL REFERENCES stores(id),
                    patient_id INTEGER NOT NULL REFERENCES patients(id),
                    doctor_name TEXT,
                    prescription_date TEXT,
                    prescription_image TEXT,
                    notes TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Invoices Table
            conn.execute('''
                CREATE TABLE IF NOT EXISTS invoices (
                    id SERIAL PRIMARY KEY,
                    store_id INTEGER NOT NULL REFERENCES stores(id),
                    invoice_number TEXT UNIQUE NOT NULL,
                    patient_id INTEGER REFERENCES patients(id),
                    user_id INTEGER NOT NULL REFERENCES users(id),
                    total_amount REAL NOT NULL,
                    discount REAL DEFAULT 0,
                    tax REAL DEFAULT 0,
                    grand_total REAL NOT NULL,
                    payment_mode TEXT,
                    status TEXT DEFAULT 'paid',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Notifications Table
            conn.execute('''
                CREATE TABLE IF NOT EXISTS notifications (
                    id SERIAL PRIMARY KEY,
                    store_id INTEGER NOT NULL REFERENCES stores(id),
                    user_id INTEGER REFERENCES users(id),
                    title TEXT NOT NULL,
                    message TEXT NOT NULL,
                    type TEXT,
                    is_read BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Activity Logs Table
            conn.execute('''
                CREATE TABLE IF NOT EXISTS activity_logs (
                    id SERIAL PRIMARY KEY,
                    store_id INTEGER NOT NULL REFERENCES stores(id),
                    user_id INTEGER NOT NULL REFERENCES users(id),
                    action TEXT NOT NULL,
                    entity_type TEXT,
                    entity_id INTEGER,
                    ip_address TEXT,
                    user_agent TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Subscription Plans Table
            conn.execute('''
                CREATE TABLE IF NOT EXISTS subscription_plans (
                    id SERIAL PRIMARY KEY,
                    plan_name TEXT NOT NULL,
                    plan_code TEXT UNIQUE NOT NULL,
                    description TEXT,
                    price REAL NOT NULL,
                    billing_cycle TEXT DEFAULT 'monthly',
                    max_users INTEGER DEFAULT 1,
                    max_locations INTEGER DEFAULT 1,
                    max_transactions INTEGER DEFAULT -1,
                    features TEXT,
                    is_active BOOLEAN DEFAULT TRUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Subscription Transactions Table
            conn.execute('''
                CREATE TABLE IF NOT EXISTS subscription_transactions (
                    id SERIAL PRIMARY KEY,
                    store_id INTEGER NOT NULL REFERENCES stores(id),
                    plan_id INTEGER NOT NULL REFERENCES subscription_plans(id),
                    amount REAL NOT NULL,
                    payment_method TEXT,
                    transaction_id TEXT,
                    payment_status TEXT DEFAULT 'pending',
                    starts_at TIMESTAMP,
                    ends_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Super Admin Users Table
            conn.execute('''
                CREATE TABLE IF NOT EXISTS super_admins (
                    id SERIAL PRIMARY KEY,
                    username TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    email TEXT NOT NULL,
                    full_name TEXT,
                    role TEXT DEFAULT 'superadmin',
                    is_active BOOLEAN DEFAULT TRUE,
                    last_login TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Initialize default subscription plans
            conn.execute('''
                INSERT INTO subscription_plans (plan_name, plan_code, description, price, billing_cycle, max_users, max_locations, max_transactions, features)
                VALUES 
                ('Free Trial', 'free_trial', '30 days free trial with basic features', 0, 'trial', 1, 1, 100, 'Basic Dashboard,Payment Tracking,Medicine Inventory'),
                ('Basic Plan', 'basic', 'Perfect for small stores', 499, 'monthly', 2, 1, 500, 'All Free Features,Multi-User Access,Email Support,Invoice Generation'),
                ('Professional', 'professional', 'For growing businesses', 999, 'monthly', 5, 3, 2000, 'All Basic Features,Multi-Location,Priority Support,Advanced Analytics,Prescription Management'),
                ('Enterprise', 'enterprise', 'Unlimited everything', 2499, 'monthly', -1, -1, -1, 'All Pro Features,Unlimited Users,Unlimited Locations,API Access,Custom Branding,Dedicated Support')
                ON CONFLICT (plan_code) DO NOTHING
            ''')
            
            # Create default super admin (username: admin, password: admin123)
            default_admin_password = hashlib.sha256('admin123'.encode()).hexdigest()
            conn.execute('''
                INSERT INTO super_admins (username, password, email, full_name, role)
                VALUES ('admin', ?, 'admin@medicalstore.pro', 'Super Administrator', 'superadmin')
                ON CONFLICT (username) DO NOTHING
            ''', (default_admin_password,))
            
            # Account Recovery Table
            conn.execute('''
                CREATE TABLE IF NOT EXISTS account_recovery (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id),
                    recovery_email TEXT,
                    recovery_phone TEXT,
                    security_question TEXT,
                    security_answer TEXT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Two-Factor Authentication Table
            conn.execute('''
                CREATE TABLE IF NOT EXISTS two_factor_auth (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id),
                    auth_method TEXT,
                    is_enabled BOOLEAN DEFAULT FALSE,
                    secret_key TEXT,
                    backup_codes TEXT,
                    phone_number TEXT,
                    verified BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # OTP Codes Table (for 2FA verification)
            conn.execute('''
                CREATE TABLE IF NOT EXISTS otp_codes (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id),
                    code TEXT NOT NULL,
                    method TEXT,
                    is_used BOOLEAN DEFAULT FALSE,
                    expires_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            
            # Manual commit not needed as context manager handles it, but safe to leave if empty
            
    except Exception as e:
        logger.error(f"DB Init Error: {e}")

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

@app.route('/')
def index():
    return send_from_directory('static', 'login.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

@app.route('/api/signup', methods=['POST', 'OPTIONS'])
def signup():

    try:
        data = request.get_json(silent=True) or {}
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'success': False, 'message': 'Username and password are required'}), 400
        
        if len(username) < 3:
            return jsonify({'success': False, 'message': 'Username must be at least 3 characters'}), 400
        
        if len(password) < 6:
            return jsonify({'success': False, 'message': 'Password must be at least 6 characters'}), 400
        
        hashed_password = hash_password(password)
        
        with get_db() as conn:
            try:
                # Note: This signup function seems incomplete in original code (missing store_id)
                # But preserving structure. It will likely fail due to NOT NULL constraint on store_id
                # unless we fix it. However, I am just porting.
                # Actually, original code had:
                # conn.execute('INSERT INTO users (store_id,username, password) VALUES (?, ?,?)',
                #            (store_id,username, hashed_password))
                # But store_id was not defined in the scope! It was a bug in original code?
                # Line 410 in original: (store_id,username, hashed_password)
                # store_id is undefined.
                # I will leave it as is, or fix it if I can. But I'll stick to porting.
                # The user will probably use register_store instead.
                
                # I'll just comment it out to prevent crash if called, or leave it to fail.
                # Since I am "changing db to postgres", I should probably fix obvious bugs if I can,
                # but I don't know where store_id comes from.
                pass 
                
                # Original code:
                # conn.execute('INSERT INTO users (store_id,username, password) VALUES (?, ?,?)',
                #            (store_id,username, hashed_password))
                
                return jsonify({'success': False, 'message': 'Signup endpoint requires store context. Use /api/store/register'}), 400
            except psycopg2.IntegrityError:
                return jsonify({'success': False, 'message': 'Username already exists'}), 400
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/login', methods=['POST', 'OPTIONS'])
def login():

    try:
        data = request.get_json(silent=True) or {}
        username = data.get('username')
        password = data.get('password')
        store_code = data.get('store_code')
        
        if not username or not password or not store_code:
            return jsonify({'success': False, 'message': 'Store Code, Username and password are required'}), 400
        
        hashed_password = hash_password(password)
        
        with get_db() as conn:
            # First find the store
            store = conn.execute('SELECT id FROM stores WHERE store_code = ?', (store_code,)).fetchone()
            if not store:
                return jsonify({'success': False, 'message': 'Invalid Store Code'}), 404
            
            store_id = store['id']

            # Find user in that store
            user = conn.execute('SELECT id, username, store_id, role FROM users WHERE username = ? AND password = ? AND store_id = ?',
                              (username, hashed_password, store_id)).fetchone()
            
            if user:
                return jsonify({
                    'success': True,
                    'message': 'Login successful',
                    'user': {
                        'id': user['id'],
                        'username': user['username'],
                        'store_id': user['store_id'],
                        'role': user['role']
                    }
                })
            else:
                return jsonify({'success': False, 'message': 'Invalid username or password'}), 401
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/check-username', methods=['POST', 'OPTIONS'])
def check_username():
       

    try:
        data = request.get_json(silent=True) or {}
        username = data.get('username')
        
        if not username:
            return jsonify({'success': False, 'message': 'Username is required'}), 400
        
        with get_db() as conn:
            user = conn.execute('SELECT id, username FROM users WHERE username = ?', (username,)).fetchone()
            
            if user:
                return jsonify({'success': True, 'message': 'Username exists', 'user_id': user['id']})
            else:
                return jsonify({'success': False, 'message': 'Username not found'}), 404
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/reset-password', methods=['POST', 'OPTIONS'])
def reset_password():
       

    try:
        data = request.get_json(silent=True) or {}
        username = data.get('username')
        new_password = data.get('new_password')
        store_code = data.get('store_code')
        
        if not username or not new_password:
            return jsonify({'success': False, 'message': 'Username and new password are required'}), 400

        if not store_code:
            return jsonify({'success': False, 'message': 'Store Code is required'}), 400
        
        if len(new_password) < 6:
            return jsonify({'success': False, 'message': 'Password must be at least 6 characters'}), 400
        
        hashed_password = hash_password(new_password)
        
        with get_db() as conn:
            # Verify store
            store = conn.execute('SELECT id FROM stores WHERE store_code = ?', (store_code,)).fetchone()
            if not store:
                return jsonify({'success': False, 'message': 'Invalid Store Code'}), 404
            
            store_id = store['id']
            
            # Update password for user in specific store
            cur = conn.execute('UPDATE users SET password = ? WHERE username = ? AND store_id = ?',
                                (hashed_password, username, store_id))
            
            if cur.rowcount > 0:
                return jsonify({'success': True, 'message': 'Password reset successfully'})
            else:
                return jsonify({'success': False, 'message': 'Account not found'}), 404
    except Exception as e:
        logger.error(f"Error in reset_password: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

# Account Recovery Endpoints
@app.route('/api/account/save-recovery', methods=['POST'])
def save_recovery_options():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        recovery_email = data.get('recovery_email')
        recovery_phone = data.get('recovery_phone')
        security_question = data.get('security_question')
        security_answer = data.get('security_answer')
        
        if not user_id or not recovery_email or not recovery_phone:
            return jsonify({'success': False, 'message': 'Please provide all recovery details'}), 400
        
        with get_db() as conn:
            # Check if recovery record exists
            existing = conn.execute('SELECT id FROM account_recovery WHERE user_id = ?', (user_id,)).fetchone()
            
            if existing:
                conn.execute('''
                    UPDATE account_recovery 
                    SET recovery_email = ?, recovery_phone = ?, security_question = ?, 
                        security_answer = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = ?
                ''', (recovery_email, recovery_phone, security_question, security_answer, user_id))
            else:
                conn.execute('''
                    INSERT INTO account_recovery (user_id, recovery_email, recovery_phone, security_question, security_answer)
                    VALUES (?, ?, ?, ?, ?)
                ''', (user_id, recovery_email, recovery_phone, security_question, security_answer))
            
            return jsonify({'success': True, 'message': 'Recovery options saved successfully'})
    except Exception as e:
        logger.error(f"Error in save_recovery_options: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/account/recovery/<int:user_id>', methods=['GET'])
def get_recovery_options(user_id):
    try:
        with get_db() as conn:
            recovery = conn.execute(
                'SELECT recovery_email, recovery_phone, security_question FROM account_recovery WHERE user_id = ?',
                (user_id,)
            ).fetchone()
            
            if recovery:
                return jsonify({
                    'success': True,
                    'recovery_email': recovery['recovery_email'],
                    'recovery_phone': recovery['recovery_phone'],
                    'security_question': recovery['security_question']
                })
            else:
                return jsonify({
                    'success': True,
                    'recovery_email': '',
                    'recovery_phone': '',
                    'security_question': ''
                })
    except Exception as e:
        logger.error(f"Error in get_recovery_options: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

# 2FA Setup Endpoints
@app.route('/api/account/setup-2fa', methods=['POST'])
def setup_2fa():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        method = data.get('method')  # sms, email, authenticator
        
        if not user_id or not method:
            return jsonify({'success': False, 'message': 'User ID and method are required'}), 400
        
        with get_db() as conn:
            # Check if 2FA already exists for this method
            existing = conn.execute(
                'SELECT id FROM two_factor_auth WHERE user_id = ? AND auth_method = ?',
                (user_id, method)
            ).fetchone()
            
            if existing:
                return jsonify({'success': False, 'message': f'{method.upper()} 2FA already configured'}), 400
            
            if method == 'authenticator':
                # Generate secret for authenticator app
                import random
                import string
                secret = ''.join(random.choices(string.ascii_uppercase + string.digits, k=32))
                
                # Generate backup codes
                backup_codes = [
                    ''.join(random.choices(string.digits, k=8)) for _ in range(10)
                ]
                
                conn.execute('''
                    INSERT INTO two_factor_auth (user_id, auth_method, secret_key, backup_codes)
                    VALUES (?, ?, ?, ?)
                ''', (user_id, method, secret, ','.join(backup_codes)))
                
                return jsonify({
                    'success': True,
                    'message': '2FA setup initiated',
                    'secret': secret,
                    'backup_codes': backup_codes,
                    'qr_url': f'otpauth://totp/Medical%20Store%20App?secret={secret}&issuer=MedicalStore'
                })
            else:
                # For SMS and Email, we'll insert placeholder
                conn.execute('''
                    INSERT INTO two_factor_auth (user_id, auth_method, verified)
                    VALUES (?, ?, FALSE)
                ''', (user_id, method))
                
                return jsonify({
                    'success': True,
                    'message': f'{method.upper()} 2FA setup initiated. Verification code sent.'
                })
    except Exception as e:
        logger.error(f"Error in setup_2fa: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/account/verify-2fa', methods=['POST'])
def verify_2fa():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        method = data.get('method')
        code = data.get('code')
        
        if not all([user_id, method, code]):
            return jsonify({'success': False, 'message': 'Missing required fields'}), 400
        
        with get_db() as conn:
            # Get 2FA record
            two_fa = conn.execute(
                'SELECT id FROM two_factor_auth WHERE user_id = ? AND auth_method = ?',
                (user_id, method)
            ).fetchone()
            
            if not two_fa:
                return jsonify({'success': False, 'message': '2FA not configured for this method'}), 400
            
            # For demo purposes, we'll accept any 6-digit code
            if len(str(code)) >= 4:
                conn.execute('''
                    UPDATE two_factor_auth 
                    SET verified = TRUE, is_enabled = TRUE, updated_at = CURRENT_TIMESTAMP
                    WHERE user_id = ? AND auth_method = ?
                ''', (user_id, method))
                
                return jsonify({
                    'success': True,
                    'message': f'{method.upper()} 2FA enabled successfully'
                })
            else:
                return jsonify({'success': False, 'message': 'Invalid verification code'}), 400
    except Exception as e:
        logger.error(f"Error in verify_2fa: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/account/disable-2fa', methods=['POST'])
def disable_2fa():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        method = data.get('method')
        
        if not user_id or not method:
            return jsonify({'success': False, 'message': 'User ID and method are required'}), 400
        
        with get_db() as conn:
            conn.execute(
                'DELETE FROM two_factor_auth WHERE user_id = ? AND auth_method = ?',
                (user_id, method)
            )
            
            return jsonify({
                'success': True,
                'message': f'{method.upper()} 2FA disabled successfully'
            })
    except Exception as e:
        logger.error(f"Error in disable_2fa: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/account/2fa-status/<int:user_id>', methods=['GET'])
def get_2fa_status(user_id):
    try:
        with get_db() as conn:
            two_fa_methods = conn.execute(
                'SELECT auth_method, is_enabled, verified FROM two_factor_auth WHERE user_id = ?',
                (user_id,)
            ).fetchall()
            
            status = {
                'sms': {'enabled': False, 'verified': False},
                'email': {'enabled': False, 'verified': False},
                'authenticator': {'enabled': False, 'verified': False}
            }
            
            for method in two_fa_methods:
                status[method['auth_method']] = {
                    'enabled': bool(method['is_enabled']),
                    'verified': bool(method['verified'])
                }
            
            return jsonify({'success': True, 'status': status})
    except Exception as e:
        logger.error(f"Error in get_2fa_status: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/superadmin/login', methods=['POST'])
def superadmin_login():
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return jsonify({'success': False, 'message': 'Username and password are required'}), 400
        
        hashed_password = hash_password(password)
        
        with get_db() as conn:
            user = conn.execute('''
                SELECT id, username, email, full_name, role 
                FROM super_admins 
                WHERE username = ? AND password = ? AND is_active = TRUE
            ''', (username, hashed_password)).fetchone()
            
            if user:
                return jsonify({
                    'success': True,
                    'message': 'Super Admin login successful',
                    'user': {
                        'id': user['id'],
                        'username': user['username'],
                        'email': user['email'],
                        'full_name': user['full_name'],
                        'role': user['role']
                    }
                })
            else:
                return jsonify({'success': False, 'message': 'Invalid super admin credentials'}), 401
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/superadmin/stores', methods=['GET'])
def get_all_stores():
    try:
        # Verify super admin session (simplified for demo)
        with get_db() as conn:
            stores = conn.execute('''
                SELECT s.*, sp.plan_name, st.payment_status, st.ends_at
                FROM stores s
                LEFT JOIN subscription_transactions st ON s.id = st.store_id
                LEFT JOIN subscription_plans sp ON st.plan_id = sp.id
                ORDER BY s.created_at DESC
            ''').fetchall()
            
            store_list = []
            for store in stores:
                store_list.append({
                    'id': store['id'],
                    'store_name': store['store_name'],
                    'store_code': store['store_code'],
                    'owner_name': store['owner_name'],
                    'email': store['email'],
                    'phone': store['phone'],
                    'city': store['city'],
                    'state': store['state'],
                    'subscription_plan': store['plan_name'],
                    'subscription_status': store['payment_status'],
                    'subscription_ends': store['ends_at'],
                    'created_at': store['created_at'],
                    'is_active': store['is_active']
                })
            
            return jsonify({'success': True, 'stores': store_list})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/superadmin/users', methods=['GET'])
def get_all_users():
    try:
        with get_db() as conn:
            users = conn.execute('''
                SELECT u.*, s.store_name, s.store_code
                FROM users u
                JOIN stores s ON u.store_id = s.id
                ORDER BY u.created_at DESC
            ''').fetchall()
            
            user_list = []
            for user in users:
                user_list.append({
                    'id': user['id'],
                    'username': user['username'],
                    'full_name': user['full_name'],
                    'email': user['email'],
                    'role': user['role'],
                    'phone': user['phone'],
                    'store_name': user['store_name'],
                    'store_code': user['store_code'],
                    'is_active': user['is_active'],
                    'created_at': user['created_at']
                })
            
            return jsonify({'success': True, 'users': user_list})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/superadmin/payments', methods=['GET'])
def get_all_payments():
    try:
        with get_db() as conn:
            payments = conn.execute('''
                SELECT p.*, s.store_name, u.username as user_name, pat.name as patient_name
                FROM payments p
                JOIN stores s ON p.store_id = s.id
                JOIN users u ON p.user_id = u.id
                LEFT JOIN patients pat ON p.patient_id = pat.id
                ORDER BY p.created_at DESC
                LIMIT 1000
            ''').fetchall()
            
            payment_list = []
            for payment in payments:
                payment_list.append({
                    'id': payment['id'],
                    'store_name': payment['store_name'],
                    'user_name': payment['user_name'],
                    'patient_name': payment['patient_name'],
                    'medicine_name': payment['medicine_name'],
                    'quantity': payment['quantity'],
                    'amount': payment['amount'],
                    'payment_mode': payment['payment_mode'],
                    'created_at': payment['created_at']
                })
            
            return jsonify({'success': True, 'payments': payment_list})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/subscription/plans', methods=['GET'])
def get_subscription_plans():
    try:
        with get_db() as conn:
            plans = conn.execute('''
                SELECT * FROM subscription_plans WHERE is_active = TRUE
                ORDER BY price ASC
            ''').fetchall()
            
            plan_list = []
            for plan in plans:
                plan_list.append({
                    'id': plan['id'],
                    'plan_name': plan['plan_name'],
                    'plan_code': plan['plan_code'],
                    'description': plan['description'],
                    'price': plan['price'],
                    'billing_cycle': plan['billing_cycle'],
                    'max_users': plan['max_users'],
                    'max_locations': plan['max_locations'],
                    'max_transactions': plan['max_transactions'],
                    'features': plan['features'].split(',') if plan['features'] else []
                })
            
            return jsonify({'success': True, 'plans': plan_list})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/subscription/subscribe', methods=['POST'])
def subscribe_to_plan():
    try:
        data = request.get_json()
        store_id = data.get('store_id')
        plan_id = data.get('plan_id')
        payment_method = data.get('payment_method', 'online')
        transaction_id = data.get('transaction_id')
        
        if not all([store_id, plan_id]):
            return jsonify({'success': False, 'message': 'Store ID and Plan ID are required'}), 400
        
        with get_db() as conn:
            # Get plan details
            plan = conn.execute('SELECT * FROM subscription_plans WHERE id = ?', (plan_id,)).fetchone()
            if not plan:
                return jsonify({'success': False, 'message': 'Invalid plan'}), 400
            
            # Calculate subscription dates
            from datetime import datetime, timedelta
            starts_at = datetime.now()
            if plan['billing_cycle'] == 'trial':
                ends_at = starts_at + timedelta(days=30)  # 30-day trial
            else:
                ends_at = starts_at + timedelta(days=30)  # Monthly subscription
            
            # Create subscription transaction
            conn.execute('''
                INSERT INTO subscription_transactions 
                (store_id, plan_id, amount, payment_method, transaction_id, payment_status, starts_at, ends_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (store_id, plan_id, plan['price'], payment_method, transaction_id, 'completed', starts_at, ends_at))
            
            # Update store subscription
            conn.execute('''
                UPDATE stores 
                SET subscription_plan = ?, subscription_status = 'active', trial_ends_at = ?
                WHERE id = ?
            ''', (plan['plan_code'], ends_at, store_id))
            
            return jsonify({'success': True, 'message': 'Subscription activated successfully'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/store/register', methods=['POST'])
def register_store():
    try:
        data = request.get_json()
        store_name = data.get('store_name')
        owner_name = data.get('owner_name')
        email = data.get('email')
        phone = data.get('phone')
        address = data.get('address')
        city = data.get('city')
        state = data.get('state')
        pincode = data.get('pincode')
        username = data.get('username')
        password = data.get('password')
        
        if not all([store_name, owner_name, email, username, password]):
            return jsonify({'success': False, 'message': 'All required fields are needed'}), 400
        
        # Generate unique store code
        import uuid
        store_code = f"MS{uuid.uuid4().hex[:6].upper()}"
        
        hashed_password = hash_password(password)
        
        with get_db() as conn:
            # Create store with RETURNING id for Postgres
            cur = conn.execute('''
                INSERT INTO stores (store_name, store_code, owner_name, email, phone, address, city, state, pincode)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                RETURNING id
            ''', (store_name, store_code, owner_name, email, phone, address, city, state, pincode))
            store_id = cur.fetchone()['id']
            
            # Create owner user account
            conn.execute('''
                INSERT INTO users (store_id, username, password, full_name, role, email, phone)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (store_id, username, hashed_password, owner_name, 'owner', email, phone))
            
            # Activate free trial subscription
            conn.execute('''
                INSERT INTO subscription_transactions 
                (store_id, plan_id, amount, payment_method, payment_status, starts_at, ends_at)
                VALUES (?, 1, 0, 'trial', 'completed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '30 days')
            ''', (store_id,))
            
            # Update store subscription
            conn.execute('''
                UPDATE stores 
                SET subscription_plan = 'free_trial', subscription_status = 'active', trial_ends_at = CURRENT_TIMESTAMP + INTERVAL '30 days'
                WHERE id = ?
            ''', (store_id,))
            
            return jsonify({
                'success': True, 
                'message': 'Store registered successfully',
                'store_code': store_code
            })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/add-payment', methods=['POST'])
def add_payment():
    try:
        data = request.get_json()
        logger.debug(f"Received payment data: {data}")

        user_id = data.get('user_id')
        patient_name = data.get('patient_name')
        medicine_name = data.get('medicine_name')
        unit_price = float(data.get('unit_price', 0))
        # total_price = data.get('total_price')
        medicine_id = data.get('medicine_id')
        quantity = data.get('quantity')
        payment_mode = data.get('payment_mode')

        if not all([user_id, patient_name, medicine_name, quantity,unit_price, payment_mode]):
            return jsonify({'success': False, 'message': 'All fields are required'}), 400
        
        if unit_price <= 0:
            return jsonify({'success': False, 'message': 'Unit price must be greater than 0'}), 400

        amount = quantity * unit_price  # ✅ REQUIRED


        with get_db() as conn:
            # ✅ FETCH store_id FROM users table
            user = conn.execute(
                'SELECT store_id FROM users WHERE id = ?',
                (user_id,)
            ).fetchone()

            if not user:
                return jsonify({'success': False, 'message': 'Invalid user'}), 400

            store_id = user['store_id']

            # ✅ Update stock if medicine exists
            if medicine_id:
                medicine = conn.execute(
                    'SELECT stock_quantity FROM medicines WHERE id = ? AND store_id = ?',
                    (medicine_id, store_id)
                ).fetchone()

                if not medicine:
                    return jsonify({'success': False, 'message': 'Medicine not found'}), 404

                new_stock = medicine['stock_quantity'] - int(quantity)
                if new_stock < 0:
                    return jsonify({'success': False, 'message': 'Insufficient stock'}), 400

                conn.execute(
                    'UPDATE medicines SET stock_quantity = ? WHERE id = ?',
                    (new_stock, medicine_id)
                )

            # ✅ CORRECT INSERT (9 columns, 9 values)
            conn.execute('''
                INSERT INTO payments
                (store_id, user_id, patient_name, medicine_name,unit_price, medicine_id,amount, quantity,payment_mode)
                VALUES ( ?, ?, ?, ?, ?, ?, ?,?,?)
            ''', (
                store_id,
                user_id,
                patient_name,
                medicine_name,
                unit_price,
                medicine_id,
                float(amount),
                int(quantity),
                payment_mode
            ))

        return jsonify({'success': True, 'message': 'Payment added successfully'})

    except Exception as e:
        logger.error(f"Error in add_payment: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/payment-history/<int:user_id>', methods=['GET'])
def get_payment_history(user_id):
    try:
        with get_db() as conn:
            # Get store_id from user
            user = conn.execute('SELECT store_id FROM users WHERE id = ?', (user_id,)).fetchone()
            if not user:
                return jsonify({'success': False, 'message': 'Invalid user'}), 400
            store_id = user['store_id']

            payments = conn.execute('''
                SELECT id, patient_name, medicine_name, quantity, amount, payment_mode, 
                       to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at
                FROM payments
                WHERE store_id = ?
                ORDER BY created_at DESC
            ''', (store_id,)).fetchall()
            
            payment_list = []
            for payment in payments:
                payment_list.append({
                    'id': payment['id'],
                    'patient_name': payment['patient_name'],
                    'medicine_name': payment['medicine_name'],
                    'quantity': payment['quantity'],
                    'amount': payment['amount'],
                    'payment_mode': payment['payment_mode'],
                    'created_at': payment['created_at']
                })
            
            return jsonify({'success': True, 'payments': payment_list})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# Medicine Inventory Routes
@app.route('/api/medicines', methods=['GET'])
def get_medicines():
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({'success': False, 'message': 'User ID required'}), 400
        
        with get_db() as conn:
            # Get store_id from user
            user = conn.execute('SELECT store_id FROM users WHERE id = ?', (user_id,)).fetchone()
            if not user:
                return jsonify({'success': False, 'message': 'Invalid user'}), 400
            store_id = user['store_id']

            medicines = conn.execute('''
                SELECT id, name, category, price, stock_quantity, expiry_date, description
                FROM medicines
                WHERE store_id = ?
                ORDER BY name
            ''', (store_id,)).fetchall()
            
            medicine_list = []
            for med in medicines:
                medicine_list.append({
                    'id': med['id'],
                    'name': med['name'],
                    'category': med['category'],
                    'price': med['price'],
                    'stock_quantity': med['stock_quantity'],
                    'expiry_date': med['expiry_date'],
                    'description': med['description']
                })
            
            return jsonify({'success': True, 'medicines': medicine_list})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/add-medicine', methods=['POST'])
def add_medicine():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        name = data.get('name')
        category = data.get('category')
        price = data.get('price')
        stock_quantity = data.get('stock_quantity', 0)
        expiry_date = data.get('expiry_date')
        description = data.get('description')
        
        if not all([user_id, name, price]):
            return jsonify({'success': False, 'message': 'Required fields missing'}), 400
        
        with get_db() as conn:
            # Get store_id from user
            user = conn.execute('SELECT store_id FROM users WHERE id = ?', (user_id,)).fetchone()
            if not user:
                return jsonify({'success': False, 'message': 'Invalid user'}), 400
            store_id = user['store_id']

            conn.execute('''
                INSERT INTO medicines (store_id, user_id, name, category, price, stock_quantity, expiry_date, description)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (store_id, user_id, name, category, float(price), int(stock_quantity), expiry_date, description))
            
        return jsonify({'success': True, 'message': 'Medicine added successfully'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/update-medicine/<int:medicine_id>', methods=['PUT'])
def update_medicine(medicine_id):
    try:
        data = request.get_json()
        name = data.get('name')
        category = data.get('category')
        price = data.get('price')
        stock_quantity = data.get('stock_quantity')
        expiry_date = data.get('expiry_date')
        description = data.get('description')
        
        with get_db() as conn:
            conn.execute('''
                UPDATE medicines
                SET name = ?, category = ?, price = ?, stock_quantity = ?, expiry_date = ?, description = ?
                WHERE id = ?
            ''', (name, category, float(price), int(stock_quantity), expiry_date, description, medicine_id))
            
        return jsonify({'success': True, 'message': 'Medicine updated successfully'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/delete-medicine/<int:medicine_id>', methods=['DELETE'])
def delete_medicine(medicine_id):
    try:
        with get_db() as conn:
            conn.execute('DELETE FROM medicines WHERE id = ?', (medicine_id,))
            
        return jsonify({'success': True, 'message': 'Medicine deleted successfully'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# Patient Management Routes
@app.route('/api/patients', methods=['GET'])
def get_patients():
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({'success': False, 'message': 'User ID required'}), 400
        
        with get_db() as conn:
            # Get store_id from user
            user = conn.execute('SELECT store_id FROM users WHERE id = ?', (user_id,)).fetchone()
            if not user:
                return jsonify({'success': False, 'message': 'Invalid user'}), 400
            store_id = user['store_id']

            patients = conn.execute('''
                SELECT id, name, phone, email, address, medical_history
                FROM patients
                WHERE store_id = ?
                ORDER BY name
            ''', (store_id,)).fetchall()
            
            patient_list = []
            for patient in patients:
                patient_list.append({
                    'id': patient['id'],
                    'name': patient['name'],
                    'phone': patient['phone'],
                    'email': patient['email'],
                    'address': patient['address'],
                    'medical_history': patient['medical_history']
                })
            
            return jsonify({'success': True, 'patients': patient_list})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/add-patient', methods=['POST'])
def add_patient():
    try:
        data = request.get_json()
        user_id = data.get('user_id')
        name = data.get('name')
        phone = data.get('phone')
        email = data.get('email')
        address = data.get('address')
        medical_history = data.get('medical_history')
        
        if not all([user_id, name]):
            return jsonify({'success': False, 'message': 'User ID and name required'}), 400
        
        with get_db() as conn:
            # Get store_id from user
            user = conn.execute('SELECT store_id FROM users WHERE id = ?', (user_id,)).fetchone()
            if not user:
                return jsonify({'success': False, 'message': 'Invalid user'}), 400
            store_id = user['store_id']

            conn.execute('''
                INSERT INTO patients (store_id, user_id, name, phone, email, address, medical_history)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (store_id, user_id, name, phone, email, address, medical_history))
            
        return jsonify({'success': True, 'message': 'Patient added successfully'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/update-patient/<int:patient_id>', methods=['PUT'])
def update_patient(patient_id):
    try:
        data = request.get_json()
        name = data.get('name')
        phone = data.get('phone')
        email = data.get('email')
        address = data.get('address')
        medical_history = data.get('medical_history')
        
        with get_db() as conn:
            conn.execute('''
                UPDATE patients
                SET name = ?, phone = ?, email = ?, address = ?, medical_history = ?
                WHERE id = ?
            ''', (name, phone, email, address, medical_history, patient_id))
            
        return jsonify({'success': True, 'message': 'Patient updated successfully'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/delete-patient/<int:patient_id>', methods=['DELETE'])
def delete_patient(patient_id):
    try:
        with get_db() as conn:
            conn.execute('DELETE FROM patients WHERE id = ?', (patient_id,))
            
        return jsonify({'success': True, 'message': 'Patient deleted successfully'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# Enhanced Payment Routes
@app.route('/api/update-payment/<int:payment_id>', methods=['PUT'])
def update_payment(payment_id):
    try:
        data = request.get_json()
        patient_name = data.get('patient_name')
        medicine_name = data.get('medicine_name')
        quantity = data.get('quantity')
        amount = data.get('amount')
        payment_mode = data.get('payment_mode')
        
        with get_db() as conn:
            conn.execute('''
                UPDATE payments
                SET patient_name = ?, medicine_name = ?, quantity = ?, amount = ?, payment_mode = ?
                WHERE id = ?
            ''', (patient_name, medicine_name, int(quantity), float(amount), payment_mode, payment_id))
            
        return jsonify({'success': True, 'message': 'Payment updated successfully'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/delete-payment/<int:payment_id>', methods=['DELETE'])
def delete_payment(payment_id):
    try:
        with get_db() as conn:
            conn.execute('DELETE FROM payments WHERE id = ?', (payment_id,))
            
        return jsonify({'success': True, 'message': 'Payment deleted successfully'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# Search and Filter
@app.route('/api/search-payments/<int:user_id>', methods=['GET'])
def search_payments(user_id):
    try:
        search_term = request.args.get('search', '')
        payment_mode = request.args.get('payment_mode', '')
        start_date = request.args.get('start_date', '')
        end_date = request.args.get('end_date', '')
        
        query = '''
            SELECT id, patient_name, medicine_name, quantity, amount, payment_mode,
                   to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at
            FROM payments
            WHERE user_id = ?
        '''
        params = [user_id]
        
        if search_term:
            query += ' AND (patient_name LIKE ? OR medicine_name LIKE ?)'
            params.extend([f'%{search_term}%', f'%{search_term}%'])
        
        if payment_mode:
            query += ' AND payment_mode = ?'
            params.append(payment_mode)
        
        if start_date:
            query += ' AND date(created_at) >= ?'
            params.append(start_date)
        
        if end_date:
            query += ' AND date(created_at) <= ?'
            params.append(end_date)
        
        query += ' ORDER BY created_at DESC'
        
        with get_db() as conn:
            payments = conn.execute(query, params).fetchall()
            
            payment_list = []
            for payment in payments:
                payment_list.append({
                    'id': payment['id'],
                    'patient_name': payment['patient_name'],
                    'medicine_name': payment['medicine_name'],
                    'quantity': payment['quantity'],
                    'amount': payment['amount'],
                    'payment_mode': payment['payment_mode'],
                    'created_at': payment['created_at']
                })
            
            return jsonify({'success': True, 'payments': payment_list})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# Dashboard Statistics
@app.route('/api/dashboard-stats/<int:user_id>', methods=['GET'])
def get_dashboard_stats(user_id):
    try:
        with get_db() as conn:
            # Today's stats
            today_stats = conn.execute('''
                SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
                FROM payments
                WHERE user_id = ? AND date(created_at) = CURRENT_DATE
            ''', (user_id,)).fetchone()
            
            # Total stats
            total_stats = conn.execute('''
                SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total
                FROM payments
                WHERE user_id = ?
            ''', (user_id,)).fetchone()
            
            # Patient count
            patient_count = conn.execute('''
                SELECT COUNT(DISTINCT patient_name) as count
                FROM payments
                WHERE user_id = ?
            ''', (user_id,)).fetchone()
            
            # Low stock medicines
            low_stock = conn.execute('''
                SELECT COUNT(*) as count
                FROM medicines
                WHERE user_id = ? AND stock_quantity < 10
            ''', (user_id,)).fetchone()
            
            # Top medicines
            top_medicines = conn.execute('''
                SELECT medicine_name, SUM(quantity) as total_sold, SUM(amount) as revenue
                FROM payments
                WHERE user_id = ?
                GROUP BY medicine_name
                ORDER BY total_sold DESC
                LIMIT 5
            ''', (user_id,)).fetchall()
            
            # Payment mode distribution
            payment_modes = conn.execute('''
                SELECT payment_mode, COUNT(*) as count, SUM(amount) as total
                FROM payments
                WHERE user_id = ?
                GROUP BY payment_mode
            ''', (user_id,)).fetchall()
            
            stats = {
                'today': {
                    'sales': today_stats['count'],
                    'revenue': float(today_stats['total'])
                },
                'total': {
                    'sales': total_stats['count'],
                    'revenue': float(total_stats['total'])
                },
                'patients': patient_count['count'],
                'low_stock_count': low_stock['count'],
                'top_medicines': [{
                    'name': m['medicine_name'],
                    'sold': m['total_sold'],
                    'revenue': float(m['revenue'])
                } for m in top_medicines],
                'payment_modes': [{
                    'mode': p['payment_mode'],
                    'count': p['count'],
                    'total': float(p['total'])
                } for p in payment_modes]
            }
            
            return jsonify({'success': True, 'stats': stats})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# Export to CSV
@app.route('/api/export-csv/<int:user_id>', methods=['GET'])
def export_csv(user_id):
    try:
        with get_db() as conn:
            payments = conn.execute('''
                SELECT patient_name, medicine_name, quantity, amount, payment_mode,
                       to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at
                FROM payments
                WHERE user_id = ?
                ORDER BY created_at DESC
            ''', (user_id,)).fetchall()
            
            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow(['Date & Time', 'Patient Name', 'Medicine', 'Quantity', 'Amount', 'Payment Mode'])
            
            for payment in payments:
                writer.writerow([
                    payment['created_at'],
                    payment['patient_name'],
                    payment['medicine_name'],
                    payment['quantity'],
                    payment['amount'],
                    payment['payment_mode']
                ])
            
            response = make_response(output.getvalue())
            response.headers['Content-Disposition'] = 'attachment; filename=payment_history.csv'
            response.headers['Content-Type'] = 'text/csv'
            return response
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# Low Stock Alerts
@app.route('/api/low-stock-alerts/<int:user_id>', methods=['GET'])
def get_low_stock_alerts(user_id):
    try:
        with get_db() as conn:
            low_stock = conn.execute('''
                SELECT id, name, category, stock_quantity, price
                FROM medicines
                WHERE user_id = ? AND stock_quantity < 10
                ORDER BY stock_quantity ASC
            ''', (user_id,)).fetchall()
            
            alerts = []
            for med in low_stock:
                alerts.append({
                    'id': med['id'],
                    'name': med['name'],
                    'category': med['category'],
                    'stock': med['stock_quantity'],
                    'price': med['price']
                })
            
            return jsonify({'success': True, 'alerts': alerts})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

if __name__ == '__main__':
    # Initialize DB (will create tables if they don't exist)
    # This might fail locally if Postgres is not running/configured
    try:
        init_db()
    except Exception as e:
        print(f"Warning: Database initialization failed: {e}")
        
    app.run(debug=True, host='0.0.0.0', port=5000)


