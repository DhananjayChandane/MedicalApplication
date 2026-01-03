# Medical Store Web Application

A comprehensive medical store management system with user authentication and payment tracking functionality.

## Features

### Core Features
- **User Authentication**: Secure login and signup with password hashing (SHA-256)
- **Medical Owner Dashboard**: Comprehensive management interface with statistics
- **Payment Tracking**: Record patient payments with complete medicine details
- **Payment History**: View, search, filter, edit, and delete transaction records
- **Mobile Responsive**: Seamless experience across all devices
- **Clean Medical UI**: Professional and intuitive interface
- **Form Validation**: Client and server-side validation for data integrity

### Advanced Features

#### 📊 Dashboard Analytics
- **Real-time Statistics Cards**:
  - Today's Revenue & Sales
  - Total Patients Count
  - Low Stock Alerts
- **Visual Charts**:
  - Top Selling Medicines (Bar Chart)
  - Payment Mode Distribution
- **Quick Insights**: Recent transactions and alerts

#### 💊 Medicine Inventory Management
- Add, edit, and delete medicines
- Track stock quantities with automatic deduction
- Low stock alerts (< 10 units)
- Medicine categories (Tablet, Syrup, Injection, etc.)
- Expiry date tracking
- Price management
- Autocomplete for quick medicine selection

#### 👥 Patient Management
- Create patient profiles with contact details
- Store medical history
- Quick patient lookup with autocomplete
- Edit and delete patient records
- Track patient purchase history

#### 🔍 Search & Filter
- Search payments by patient or medicine name
- Filter by payment mode (Cash, Card, UPI, Online)
- Date range filtering
- Real-time search results

#### 📤 Export & Reports
- Export payment history to CSV
- Download complete transaction records
- Ready for Excel import

#### ✏️ Edit & Delete
- Edit payment records
- Update medicine inventory
- Modify patient information
- Delete records with confirmation

#### 🔒 Enhanced Security
- Password hashing with SHA-256
- JWT token support (configured)
- Input sanitization
- SQL injection prevention
- Session management ready

#### 📱 Offline Support
- Service Worker implementation
- Cache static assets
- Work offline capability
- Auto-sync when online

#### 🎨 User Experience
- Tab-based navigation (Dashboard, Payments, Medicines, Patients)
- Modal dialogs for editing
- Toast notifications
- Loading states
- Color-coded stock status
- Responsive tables

## Technology Stack

### Frontend
- HTML5
- CSS3 (Mobile Responsive)
- JavaScript (Vanilla JS with Fetch API)

### Backend
- Python Flask
- SQLite Database
- Flask-CORS for cross-origin requests

## Project Structure

```
medical application/
│
├── app.py                      # Flask backend server
├── requirements.txt            # Python dependencies
├── medical_store.db           # SQLite database (auto-created)
│
└── static/
    ├── login.html             # Login page
    ├── signup.html            # Signup page
    ├── dashboard.html         # Medical owner dashboard
    ├── styles.css             # Global styles
    ├── login.js               # Login functionality
    ├── signup.js              # Signup functionality
    └── dashboard.js           # Dashboard functionality
```

## Installation & Setup

### Prerequisites
- Python 3.7 or higher
- pip (Python package manager)

### Step 1: Install Dependencies

Open PowerShell/Command Prompt in the project directory and run:

```bash
pip install -r requirements.txt
```

### Step 2: Run the Application

```bash
python app.py
```

The server will start at `http://localhost:5000`

### Step 3: Access the Application

Open your web browser and navigate to:
```
http://localhost:5000
```

You'll be redirected to the login page. First, create an account using the signup page.

## Usage Guide

### 1. Sign Up
- Click "Sign up here" on the login page
- Enter a username (minimum 3 characters, alphanumeric)
- Enter a password (minimum 6 characters)
- Confirm your password
- Click "Sign Up"

### 2. Login
- Enter your username and password
- Click "Login"
- You'll be redirected to the dashboard

### 3. Dashboard Overview
The dashboard shows:
- **Statistics Cards**: Today's revenue, sales count, total patients, low stock alerts
- **Charts**: Top selling medicines and payment mode distribution
- **Low Stock Alerts**: Medicines that need restocking

### 4. Add Payment Record
Navigate to the "Payments" tab:
- **Patient Name**: Enter or select from existing patients (autocomplete)
- **Medicine Name**: Enter or select from inventory (autocomplete with auto-pricing)
- **Quantity**: Number of units sold
- **Amount**: Automatically filled from medicine price or enter manually
- **Payment Mode**: Cash, Card, UPI, or Online
- Click "Add Payment" to save

Note: If medicine is selected from inventory, stock will automatically be deducted.

### 5. Search & Filter Payments
- Use the search box to find by patient or medicine name
- Filter by payment mode
- Select date range for specific period
- Click "Export CSV" to download all records
- Click "Refresh" to reload data

### 6. Manage Medicines
Navigate to the "Medicines" tab:

**Add Medicine**:
- Enter medicine name, category, price
- Set initial stock quantity
- Optional: Add expiry date and description
- Click "Add Medicine"

**Edit/Delete Medicine**:
- Click "Edit" to update medicine details
- Click "Delete" to remove (with confirmation)
- Stock status is color-coded:
  - Red: Low stock (< 10)
  - Yellow: Medium stock (10-50)
  - Green: Good stock (> 50)

### 7. Manage Patients
Navigate to the "Patients" tab:

**Add Patient**:
- Enter patient name (required)
- Optional: Phone, email, address
- Add medical history notes
- Click "Add Patient"

**Edit/Delete Patient**:
- Click "Edit" to update patient information
- Click "Delete" to remove patient record

### 8. Edit Records
- Click "Edit" button on any record
- Modal dialog opens with current data
- Update fields and click "Update"
- Changes are saved immediately

### 9. View Payment History
The payment history table displays:
- Date and time of transaction
- Patient and medicine names
- Quantity and amount
- Payment mode (color-coded badges)
- Action buttons (Edit/Delete)

## API Endpoints

### Authentication
**POST /api/signup** - Create a new user account
```json
{
  "username": "string",
  "password": "string"
}
```

**POST /api/login** - Authenticate user
```json
{
  "username": "string",
  "password": "string"
}
```

### Payments
**POST /api/add-payment** - Add a new payment record
```json
{
  "user_id": "integer",
  "patient_name": "string",
  "medicine_name": "string",
  "medicine_id": "integer (optional)",
  "quantity": "integer",
  "amount": "float",
  "payment_mode": "string"
}
```

**GET /api/payment-history/{user_id}** - Get all payment history

**GET /api/search-payments/{user_id}** - Search and filter payments
Query parameters: `search`, `payment_mode`, `start_date`, `end_date`

**PUT /api/update-payment/{payment_id}** - Update a payment record

**DELETE /api/delete-payment/{payment_id}** - Delete a payment record

**GET /api/export-csv/{user_id}** - Export payment history to CSV

### Medicines
**GET /api/medicines?user_id={user_id}** - Get all medicines

**POST /api/add-medicine** - Add a new medicine
```json
{
  "user_id": "integer",
  "name": "string",
  "category": "string",
  "price": "float",
  "stock_quantity": "integer",
  "expiry_date": "string",
  "description": "string"
}
```

**PUT /api/update-medicine/{medicine_id}** - Update medicine details

**DELETE /api/delete-medicine/{medicine_id}** - Delete a medicine

**GET /api/low-stock-alerts/{user_id}** - Get medicines with low stock

### Patients
**GET /api/patients?user_id={user_id}** - Get all patients

**POST /api/add-patient** - Add a new patient
```json
{
  "user_id": "integer",
  "name": "string",
  "phone": "string",
  "email": "string",
  "address": "string",
  "medical_history": "string"
}
```

**PUT /api/update-patient/{patient_id}** - Update patient details

**DELETE /api/delete-patient/{patient_id}** - Delete a patient

### Analytics
**GET /api/dashboard-stats/{user_id}** - Get comprehensive dashboard statistics

## Database Schema

### users table
- id (INTEGER PRIMARY KEY)
- username (TEXT UNIQUE)
- password (TEXT - hashed)
- email (TEXT)
- role (TEXT - default: 'owner')
- created_at (TIMESTAMP)

### patients table
- id (INTEGER PRIMARY KEY)
- user_id (INTEGER FOREIGN KEY)
- name (TEXT)
- phone (TEXT)
- email (TEXT)
- address (TEXT)
- medical_history (TEXT)
- created_at (TIMESTAMP)

### medicines table
- id (INTEGER PRIMARY KEY)
- user_id (INTEGER FOREIGN KEY)
- name (TEXT)
- category (TEXT)
- price (REAL)
- stock_quantity (INTEGER)
- expiry_date (TEXT)
- description (TEXT)
- created_at (TIMESTAMP)

### payments table
- id (INTEGER PRIMARY KEY)
- user_id (INTEGER FOREIGN KEY)
- patient_id (INTEGER FOREIGN KEY)
- patient_name (TEXT)
- medicine_id (INTEGER FOREIGN KEY)
- medicine_name (TEXT)
- quantity (INTEGER)
- amount (REAL)
- payment_mode (TEXT)
- created_at (TIMESTAMP)

### stock_alerts table
- id (INTEGER PRIMARY KEY)
- user_id (INTEGER FOREIGN KEY)
- medicine_id (INTEGER FOREIGN KEY)
- alert_threshold (INTEGER - default: 10)
- is_active (BOOLEAN)
- created_at (TIMESTAMP)

## Security Features

- Password hashing using SHA-256
- Client-side form validation
- Server-side validation
- SQL injection prevention using parameterized queries
- CORS enabled for API access

## Converting to Android APK

To convert this web application into an Android APK using WebView:

### Option 1: Using Android Studio

1. **Install Android Studio**
   - Download from: https://developer.android.com/studio

2. **Create a new Android project**
   - Choose "Empty Activity"
   - Set package name: `com.yourname.medicalstore`

3. **Add Internet Permission** in `AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

4. **Modify MainActivity.java**:
```java
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends AppCompatActivity {
    private WebView webView;
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        
        webView = findViewById(R.id.webview);
        webView.setWebViewClient(new WebViewClient());
        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setDomStorageEnabled(true);
        
        // Replace with your server IP address
        webView.loadUrl("http://YOUR_SERVER_IP:5000");
    }
}
```

5. **Update activity_main.xml**:
```xml
<WebView
    android:id="@+id/webview"
    android:layout_width="match_parent"
    android:layout_height="match_parent" />
```

6. **Build APK**
   - Go to Build > Build Bundle(s) / APK(s) > Build APK(s)

### Option 2: Using Online Tools

**Apache Cordova / PhoneGap**
```bash
npm install -g cordova
cordova create MedicalStore com.yourname.medicalstore MedicalStore
cd MedicalStore
cordova platform add android
cordova build android
```

**Website 2 APK Builder** (Quick method)
- Visit: https://appsgeyser.com or https://gonative.io
- Enter your web app URL
- Customize settings
- Download APK

### Important Notes for APK Conversion:

1. **Host the Flask Server**:
   - Deploy your Flask app to a cloud server (Heroku, PythonAnywhere, AWS)
   - Update the API_BASE_URL in JavaScript files to use the deployed server URL

2. **Update API URLs**:
   In `login.js`, `signup.js`, and `dashboard.js`, change:
   ```javascript
   const API_BASE_URL = 'http://localhost:5000/api';
   ```
   to:
   ```javascript
   const API_BASE_URL = 'https://your-server-url.com/api';
   ```

3. **Enable HTTPS**:
   - For production, use HTTPS instead of HTTP
   - Most app stores require HTTPS for security

4. **Test on Different Devices**:
   - The responsive design works on mobile browsers
   - Test thoroughly before building APK

## Deployment Options

### Option 1: PythonAnywhere (Free)
1. Sign up at https://www.pythonanywhere.com
2. Upload your files
3. Set up a web app with Flask
4. Configure WSGI file

### Option 2: Heroku
```bash
# Install Heroku CLI
heroku login
heroku create medical-store-app
git push heroku main
```

### Option 3: Local Network Access
To access from mobile devices on the same network:
1. Find your computer's IP address:
   - Windows: `ipconfig` (look for IPv4 Address)
   - Mac/Linux: `ifconfig`
2. Access from mobile: `http://YOUR_IP:5000`

## Troubleshooting

### Issue: Server not starting
- Check if Python is installed: `python --version`
- Ensure all dependencies are installed: `pip install -r requirements.txt`

### Issue: Can't connect from mobile
- Check firewall settings
- Ensure mobile and computer are on same network
- Use computer's IP address, not localhost

### Issue: Database errors
- Delete `medical_store.db` and restart the app (it will recreate)

### Issue: CORS errors
- Flask-CORS is already configured in app.py
- If issues persist, check browser console for specific errors

## Future Enhancements

- **Email Notifications**: Send receipts and low stock alerts via email
- **SMS Integration**: Send appointment reminders to patients
- **Barcode Scanning**: Quick medicine lookup with barcode scanner
- **Prescription Management**: Upload and store prescriptions
- **Multi-user Roles**: Admin, Manager, and Cashier roles with permissions
- **Advanced Analytics**: Monthly/yearly reports with graphs
- **Backup & Restore**: Database backup and restore functionality
- **Print Invoices**: Generate printable receipts
- **WhatsApp Integration**: Send updates via WhatsApp Business API
- **Inventory Reorder**: Automatic purchase orders when stock is low

## License

This project is open source and available for educational purposes.

## Support

For issues or questions, please check the troubleshooting section or review the code comments.

---

**Created with ❤️ for Medical Store Management**
