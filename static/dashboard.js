const API_BASE_URL = "https://medicalapplication-3p64.onrender.com//api";

let currentUser = null;
let allPayments = [];
let allMedicines = [];
let allPatients = [];
let selectedMedicineId = null;

// Check if user is logged in
function checkAuth() {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
        window.location.href = 'login.html';
        return null;
    }
    return JSON.parse(userStr);
}

// Initialize dashboard
window.addEventListener('DOMContentLoaded', () => {
    currentUser = checkAuth();
    if (currentUser) {
        // Update welcome message after ensuring DOM is loaded
        const updateWelcomeMessage = () => {
            const welcomeElement = document.getElementById('welcomeUser');
            if (welcomeElement) {
                welcomeElement.textContent = `Welcome, ${currentUser.username}`;
            }
        };
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', updateWelcomeMessage);
        } else {
            updateWelcomeMessage();
        }
        
        loadDashboardStats();
        loadPaymentHistory();
        loadMedicines();
        loadPatients();
        loadLowStockAlerts();
        
        // Force page to be fresh (prevent cached version)
        if (performance.navigation.type === 1) {
            // Page was reloaded, ensure latest UI
            setTimeout(() => {
                window.scrollTo(0, 0);
            }, 100);
        }
    } else {
        // Redirect to login if not authenticated
        window.location.href = 'login.html';
    }
});

// Add page visibility listener to refresh data when user comes back to page
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        // Page is visible again, refresh data
        if (currentUser) {
            loadDashboardStats();
            loadPaymentHistory();
            loadMedicines();
            loadPatients();
            loadLowStockAlerts();
        }
    }
});

// Logout function
function logout() {
    localStorage.removeItem('user');
    // Clear any cached data
    if ('caches' in window) {
        caches.keys().then(names => {
            names.forEach(name => caches.delete(name));
        });
    }
    // Force clear browser cache for this page
    window.location.href = 'login.html';
}

// Tab Navigation
function showTab(tabName, event) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName + 'Tab').classList.add('active');
    
    // Add active to clicked button if event is provided
    if (event && event.target) {
        event.target.classList.add('active');
    } else {
        // Fallback: find the button that matches the tab
        const buttons = document.querySelectorAll('.tab-btn');
        for (let button of buttons) {
            if (button.innerHTML.toLowerCase().includes(tabName.toLowerCase())) {
                button.classList.add('active');
                break;
            }
        }
    }
}

// Dashboard Statistics
async function loadDashboardStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/dashboard-stats/${currentUser.id}`);
        const data = await response.json();
        
        if (data.success) {
            const stats = data.stats;
            
            // Update stat cards
            document.getElementById('todayRevenue').textContent = `₹${stats.today.revenue.toFixed(2)}`;
            document.getElementById('todaySales').textContent = stats.today.sales;
            document.getElementById('totalPatients').textContent = stats.patients;
            document.getElementById('lowStockCount').textContent = stats.low_stock_count;
            
            // Render top medicines chart
            renderTopMedicinesChart(stats.top_medicines);
            
            // Render payment mode chart
            renderPaymentModeChart(stats.payment_modes);
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Render Top Medicines Chart
function renderTopMedicinesChart(medicines) {
    const container = document.getElementById('topMedicinesChart');
    container.innerHTML = '';
    
    if (!medicines || medicines.length === 0) {
        container.innerHTML = '<p class="no-data">No data available</p>';
        return;
    }
    
    const maxSold = Math.max(...medicines.map(m => m.sold));
    
    medicines.forEach(med => {
        const percentage = (med.sold / maxSold) * 100;
        const bar = document.createElement('div');
        bar.className = 'chart-bar';
        bar.innerHTML = `
            <div class="chart-label">${med.name}</div>
            <div class="chart-bar-container">
                <div class="chart-bar-fill" style="width: ${percentage}%">
                    ${med.sold} units
                </div>
            </div>
        `;
        container.appendChild(bar);
    });
}

// Render Payment Mode Chart
function renderPaymentModeChart(modes) {
    const container = document.getElementById('paymentModeChart');
    container.innerHTML = '';
    
    if (!modes || modes.length === 0) {
        container.innerHTML = '<p class="no-data">No data available</p>';
        return;
    }
    
    const maxAmount = Math.max(...modes.map(m => m.total));
    
    modes.forEach(mode => {
        const percentage = (mode.total / maxAmount) * 100;
        const bar = document.createElement('div');
        bar.className = 'chart-bar';
        bar.innerHTML = `
            <div class="chart-label">${mode.mode}</div>
            <div class="chart-bar-container">
                <div class="chart-bar-fill" style="width: ${percentage}%">
                    ₹${mode.total.toFixed(2)}
                </div>
            </div>
        `;
        container.appendChild(bar);
    });
}

// Load Low Stock Alerts
async function loadLowStockAlerts() {
    try {
        const response = await fetch(`${API_BASE_URL}/low-stock-alerts/${currentUser.id}`);
        const data = await response.json();
        
        const tableBody = document.getElementById('lowStockTableBody');
        
        if (data.success && data.alerts.length > 0) {
            tableBody.innerHTML = '';
            
            data.alerts.forEach(alert => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${alert.name}</td>
                    <td>${alert.category || 'N/A'}</td>
                    <td class="stock-low">${alert.stock}</td>
                    <td>₹${alert.price.toFixed(2)}</td>
                    <td>
                        <button class="btn-edit" onclick="editMedicine(${alert.id})">Restock</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        } else {
            tableBody.innerHTML = '<tr><td colspan="5" class="no-data">No low stock alerts</td></tr>';
        }
    } catch (error) {
        console.error('Error loading alerts:', error);
    }
}

// Payment Form Validation and Submission
function validatePaymentForm(patientName, medicineName, quantity, amount, paymentMode) {
    let isValid = true;
    
    const errorFields = ['patientNameError', 'medicineNameError', 'quantityError', 'amountError', 'paymentModeError'];
    const inputFields = ['patientName', 'medicineName', 'quantity', 'amount', 'paymentMode'];
    
    errorFields.forEach(field => {
        document.getElementById(field).textContent = '';
    });
    
    inputFields.forEach(field => {
        document.getElementById(field).classList.remove('error');
    });
    
    if (!patientName || patientName.trim() === '') {
        document.getElementById('patientNameError').textContent = 'Patient name is required';
        document.getElementById('patientName').classList.add('error');
        isValid = false;
    }
    
    if (!medicineName || medicineName.trim() === '') {
        document.getElementById('medicineNameError').textContent = 'Medicine name is required';
        document.getElementById('medicineName').classList.add('error');
        isValid = false;
    }
    
    if (!quantity || quantity <= 0) {
        document.getElementById('quantityError').textContent = 'Quantity must be greater than 0';
        document.getElementById('quantity').classList.add('error');
        isValid = false;
    }
    
    if (!amount || amount <= 0) {
        document.getElementById('amountError').textContent = 'Amount must be greater than 0';
        document.getElementById('amount').classList.add('error');
        isValid = false;
    }
    
    if (!paymentMode || paymentMode === '') {
        document.getElementById('paymentModeError').textContent = 'Please select a payment mode';
        document.getElementById('paymentMode').classList.add('error');
        isValid = false;
    }
    
    return isValid;
}

function showAlert(message, type, alertId = 'paymentAlert') {
    const alert = document.getElementById(alertId);
    alert.textContent = message;
    alert.className = `alert ${type}`;
    alert.style.display = 'block';
    
    setTimeout(() => {
        alert.style.display = 'none';
    }, 5000);
}

document.getElementById('paymentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const patientName = document.getElementById('patientName').value.trim();
    const medicineName = document.getElementById('medicineName').value.trim();
    const quantity = parseInt(document.getElementById('quantity').value);
    const amount = parseFloat(document.getElementById('amount').value);
    const paymentMode = document.getElementById('paymentMode').value;
    const unitPrice = amount; // amount field contains unit price per medicine
    const totalPrice = amount * quantity;
    
    if (!validatePaymentForm(patientName, medicineName, quantity, amount, paymentMode)) {
        return;
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Adding...';
    
    try {
        const response = await fetch(`${API_BASE_URL}/add-payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: currentUser.id,
                patient_name: patientName,
                medicine_name: medicineName,
                medicine_id: selectedMedicineId,
                quantity: quantity,
                unit_price: unitPrice,     
                total_price: totalPrice, 
                payment_mode: paymentMode
            }),
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('Payment added successfully!', 'success');
            document.getElementById('paymentForm').reset();
            selectedMedicineId = null;
            loadPaymentHistory();
            loadDashboardStats();
            loadMedicines();
        } else {
            showAlert(data.message || 'Failed to add payment', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Connection error. Please check if the server is running.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Add Payment';
    }
});

// Load Payment History
async function loadPaymentHistory() {
    try {
        const response = await fetch(`${API_BASE_URL}/payment-history/${currentUser.id}`);
        const data = await response.json();
        
        if (data.success) {
            allPayments = data.payments;
            displayPayments(allPayments);
        }
    } catch (error) {
        console.error('Error loading payment history:', error);
    }
}

function displayPayments(payments) {
    const tableBody = document.getElementById('paymentTableBody');
    
    if (payments.length > 0) {
        tableBody.innerHTML = '';
        
        payments.forEach(payment => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${payment.created_at}</td>
                <td>${payment.patient_name}</td>
                <td>${payment.medicine_name}</td>
                <td>${payment.quantity}</td>
                <td>₹${(payment.amount || 0).toFixed(2)}</td>
                <td><span class="badge badge-${payment.payment_mode.toLowerCase()}">${payment.payment_mode}</span></td>
                <td>
                    <div class="action-btns">
                        <button class="btn-edit" onclick="editPayment(${payment.id})">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn-delete" onclick="deletePayment(${payment.id})">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        });
    } else {
        tableBody.innerHTML = '<tr><td colspan="7" class="no-data">No payment records found</td></tr>';
    }
}

// Filter Payments
function filterPayments() {
    const searchTerm = document.getElementById('searchPayment').value.toLowerCase();
    const paymentMode = document.getElementById('filterPaymentMode').value;
    const startDate = document.getElementById('filterStartDate').value;
    const endDate = document.getElementById('filterEndDate').value;
    
    let filtered = allPayments.filter(payment => {
        const matchesSearch = payment.patient_name.toLowerCase().includes(searchTerm) || 
                            payment.medicine_name.toLowerCase().includes(searchTerm);
        const matchesMode = !paymentMode || payment.payment_mode === paymentMode;
        
        let matchesDate = true;
        if (startDate || endDate) {
            const paymentDate = payment.created_at.split(' ')[0];
            if (startDate) matchesDate = matchesDate && paymentDate >= startDate;
            if (endDate) matchesDate = matchesDate && paymentDate <= endDate;
        }
        
        return matchesSearch && matchesMode && matchesDate;
    });
    
    displayPayments(filtered);
}

// Edit Payment
function editPayment(id) {
    const payment = allPayments.find(p => p.id === id);
    if (!payment) return;
    
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <form id="editPaymentForm">
            <div class="form-group">
                <label>Patient Name</label>
                <input type="text" id="editPatientName" value="${payment.patient_name}" required>
            </div>
            <div class="form-group">
                <label>Medicine Name</label>
                <input type="text" id="editMedicineName" value="${payment.medicine_name}" required>
            </div>
            <div class="form-group">
                <label>Quantity</label>
                <input type="number" id="editQuantity" value="${payment.quantity}" min="1" required>
            </div>
            <div class="form-group">
                <label>Amount</label>
                <input type="number" id="editAmount" value="${payment.amount}" min="0" step="0.01" required>
            </div>
            <div class="form-group">
                <label>Payment Mode</label>
                <select id="editPaymentMode" required>
                    <option value="Cash" ${payment.payment_mode === 'Cash' ? 'selected' : ''}>Cash</option>
                    <option value="Card" ${payment.payment_mode === 'Card' ? 'selected' : ''}>Card</option>
                    <option value="UPI" ${payment.payment_mode === 'UPI' ? 'selected' : ''}>UPI</option>
                    <option value="Online" ${payment.payment_mode === 'Online' ? 'selected' : ''}>Online</option>
                </select>
            </div>
            <button type="submit" class="btn btn-primary">Update Payment</button>
        </form>
    `;
    
    document.getElementById('modalTitle').textContent = 'Edit Payment';
    document.getElementById('editModal').classList.add('show');
    
    // Add event listener to the dynamically created form
    const editForm = document.getElementById('editPaymentForm');
    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await updatePayment(id);
        });
    }
}

async function updatePayment(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/update-payment/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                patient_name: document.getElementById('editPatientName').value,
                medicine_name: document.getElementById('editMedicineName').value,
                quantity: document.getElementById('editQuantity').value,
                amount: document.getElementById('editAmount').value,
                payment_mode: document.getElementById('editPaymentMode').value
                 
            })
        });
        
        const data = await response.json();
        if (data.success) {
            closeModal();
            loadPaymentHistory();
            loadDashboardStats();
            showAlert('Payment updated successfully!', 'success');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function deletePayment(id) {
    if (!confirm('Are you sure you want to delete this payment record?')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/delete-payment/${id}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        if (data.success) {
            loadPaymentHistory();
            loadDashboardStats();
            showAlert('Payment deleted successfully!', 'success');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Export to CSV
function exportToCSV() {
    window.open(`${API_BASE_URL}/export-csv/${currentUser.id}`, '_blank');
}

// Medicine Management
async function loadMedicines() {
    try {
        const response = await fetch(`${API_BASE_URL}/medicines?user_id=${currentUser.id}`);
        const data = await response.json();
        
        if (data.success) {
            allMedicines = data.medicines;
            displayMedicines(allMedicines);
            updateMedicineList();
        }
    } catch (error) {
        console.error('Error loading medicines:', error);
    }
}

function displayMedicines(medicines) {
    const tableBody = document.getElementById('medicineTableBody');
    
    if (medicines.length > 0) {
        tableBody.innerHTML = '';
        
        medicines.forEach(med => {
            const stockClass = med.stock_quantity < 10 ? 'stock-low' : 
                             med.stock_quantity < 50 ? 'stock-medium' : 'stock-good';
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${med.name}</td>
                <td>${med.category || 'N/A'}</td>
                <td>₹${med.price.toFixed(2)}</td>
                <td class="${stockClass}">${med.stock_quantity}</td>
                <td>${med.expiry_date || 'N/A'}</td>
                <td>
                    <div class="action-btns">
                        <button class="btn-edit" onclick="editMedicine(${med.id})">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn-delete" onclick="deleteMedicine(${med.id})">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        });
    } else {
        tableBody.innerHTML = '<tr><td colspan="6" class="no-data">No medicines found</td></tr>';
    }
}

function updateMedicineList() {
    const datalist = document.getElementById('medicineList');
    datalist.innerHTML = '';
    
    allMedicines.forEach(med => {
        const option = document.createElement('option');
        option.value = med.name;
        option.dataset.id = med.id;
        option.dataset.price = med.price;
        datalist.appendChild(option);
    });
}

// Add event listener for medicine name auto-fill after DOM loads
window.addEventListener('DOMContentLoaded', () => {
    const medicineNameInput = document.getElementById('medicineName');
    if (medicineNameInput) {
        medicineNameInput.addEventListener('input', (e) => {
            const selectedMedicine = allMedicines.find(m => m.name === e.target.value);
            if (selectedMedicine) {
                selectedMedicineId = selectedMedicine.id;
                document.getElementById('amount').value = selectedMedicine.price;
            } else {
                selectedMedicineId = null;
            }
        });
    }
});

// Add event listener for medicine form after DOM loads
window.addEventListener('DOMContentLoaded', () => {
    const medicineForm = document.getElementById('medicineForm');
    if (medicineForm) {
        medicineForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = e.target.querySelector('button[type="submit"]');
            if (submitBtn) submitBtn.disabled = true;
            
            try {
                const response = await fetch(`${API_BASE_URL}/add-medicine`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: currentUser.id,
                        name: document.getElementById('medName').value,
                        category: document.getElementById('medCategory').value,
                        price: document.getElementById('medPrice').value,
                        stock_quantity: document.getElementById('medStock').value,
                        expiry_date: document.getElementById('medExpiry').value,
                        description: document.getElementById('medDescription').value
                    })
                });
                
                const data = await response.json();
                if (data.success) {
                    showAlert('Medicine added successfully!', 'success', 'medicineAlert');
                    document.getElementById('medicineForm').reset();
                    loadMedicines();
                    loadLowStockAlerts();
                } else {
                    showAlert(data.message, 'error', 'medicineAlert');
                }
            } catch (error) {
                showAlert('Error adding medicine', 'error', 'medicineAlert');
            } finally {
                if (submitBtn) submitBtn.disabled = false;
            }
        });
    }
});

function editMedicine(id) {
    const medicine = allMedicines.find(m => m.id === id);
    if (!medicine) return;
    
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <form id="editMedicineForm">
            <div class="form-group">
                <label>Medicine Name</label>
                <input type="text" id="editMedName" value="${medicine.name}" required>
            </div>
            <div class="form-group">
                <label>Category</label>
                <input type="text" id="editMedCategory" value="${medicine.category || ''}">
            </div>
            <div class="form-group">
                <label>Price</label>
                <input type="number" id="editMedPrice" value="${medicine.price}" min="0" step="0.01" required>
            </div>
            <div class="form-group">
                <label>Stock Quantity</label>
                <input type="number" id="editMedStock" value="${medicine.stock_quantity}" min="0" required>
            </div>
            <div class="form-group">
                <label>Expiry Date</label>
                <input type="date" id="editMedExpiry" value="${medicine.expiry_date || ''}">
            </div>
            <div class="form-group">
                <label>Description</label>
                <input type="text" id="editMedDescription" value="${medicine.description || ''}">
            </div>
            <button type="submit" class="btn btn-primary">Update Medicine</button>
        </form>
    `;
    
    document.getElementById('modalTitle').textContent = 'Edit Medicine';
    document.getElementById('editModal').classList.add('show');
    
    // Add event listener to the dynamically created form
    const editForm = document.getElementById('editMedicineForm');
    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await updateMedicine(id);
        });
    }
}

async function updateMedicine(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/update-medicine/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: document.getElementById('editMedName').value,
                category: document.getElementById('editMedCategory').value,
                price: document.getElementById('editMedPrice').value,
                stock_quantity: document.getElementById('editMedStock').value,
                expiry_date: document.getElementById('editMedExpiry').value,
                description: document.getElementById('editMedDescription').value
            })
        });
        
        const data = await response.json();
        if (data.success) {
            closeModal();
            loadMedicines();
            loadDashboardStats();
            loadLowStockAlerts();
            showAlert('Medicine updated successfully!', 'success', 'medicineAlert');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function deleteMedicine(id) {
    if (!confirm('Are you sure you want to delete this medicine?')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/delete-medicine/${id}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        if (data.success) {
            loadMedicines();
            loadLowStockAlerts();
            showAlert('Medicine deleted successfully!', 'success', 'medicineAlert');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Patient Management
async function loadPatients() {
    try {
        const response = await fetch(`${API_BASE_URL}/patients?user_id=${currentUser.id}`);
        const data = await response.json();
        
        if (data.success) {
            allPatients = data.patients;
            displayPatients(allPatients);
            updatePatientList();
        }
    } catch (error) {
        console.error('Error loading patients:', error);
    }
}

function displayPatients(patients) {
    const tableBody = document.getElementById('patientTableBody');
    
    if (patients.length > 0) {
        tableBody.innerHTML = '';
        
        patients.forEach(patient => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${patient.name}</td>
                <td>${patient.phone || 'N/A'}</td>
                <td>${patient.email || 'N/A'}</td>
                <td>${patient.address || 'N/A'}</td>
                <td>
                    <div class="action-btns">
                        <button class="btn-edit" onclick="editPatient(${patient.id})">Edit</button>
                        <button class="btn-delete" onclick="deletePatient(${patient.id})">Delete</button>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        });
    } else {
        tableBody.innerHTML = '<tr><td colspan="5" class="no-data">No patients found</td></tr>';
    }
}

function updatePatientList() {
    const datalist = document.getElementById('patientList');
    datalist.innerHTML = '';
    
    allPatients.forEach(patient => {
        const option = document.createElement('option');
        option.value = patient.name;
        datalist.appendChild(option);
    });
}

// Add event listener for patient form after DOM loads
window.addEventListener('DOMContentLoaded', () => {
    const patientForm = document.getElementById('patientForm');
    if (patientForm) {
        patientForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = e.target.querySelector('button[type="submit"]');
            if (submitBtn) submitBtn.disabled = true;
            
            try {
                const response = await fetch(`${API_BASE_URL}/add-patient`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: currentUser.id,
                        name: document.getElementById('patName').value,
                        phone: document.getElementById('patPhone').value,
                        email: document.getElementById('patEmail').value,
                        address: document.getElementById('patAddress').value,
                        medical_history: document.getElementById('patHistory').value
                    })
                });
                
                const data = await response.json();
                if (data.success) {
                    showAlert('Patient added successfully!', 'success', 'patientAlert');
                    document.getElementById('patientForm').reset();
                    loadPatients();
                } else {
                    showAlert(data.message, 'error', 'patientAlert');
                }
            } catch (error) {
                showAlert('Error adding patient', 'error', 'patientAlert');
            } finally {
                if (submitBtn) submitBtn.disabled = false;
            }
        });
    }
});

function editPatient(id) {
    const patient = allPatients.find(p => p.id === id);
    if (!patient) return;
    
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <form id="editPatientForm">
            <div class="form-group">
                <label>Patient Name</label>
                <input type="text" id="editPatName" value="${patient.name}" required>
            </div>
            <div class="form-group">
                <label>Phone</label>
                <input type="tel" id="editPatPhone" value="${patient.phone || ''}">
            </div>
            <div class="form-group">
                <label>Email</label>
                <input type="email" id="editPatEmail" value="${patient.email || ''}">
            </div>
            <div class="form-group">
                <label>Address</label>
                <input type="text" id="editPatAddress" value="${patient.address || ''}">
            </div>
            <div class="form-group">
                <label>Medical History</label>
                <textarea id="editPatHistory" rows="3">${patient.medical_history || ''}</textarea>
            </div>
            <button type="submit" class="btn btn-primary">Update Patient</button>
        </form>
    `;
    
    document.getElementById('modalTitle').textContent = 'Edit Patient';
    document.getElementById('editModal').classList.add('show');
    
    // Add event listener to the dynamically created form
    const editForm = document.getElementById('editPatientForm');
    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await updatePatient(id);
        });
    }
}

async function updatePatient(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/update-patient/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: document.getElementById('editPatName').value,
                phone: document.getElementById('editPatPhone').value,
                email: document.getElementById('editPatEmail').value,
                address: document.getElementById('editPatAddress').value,
                medical_history: document.getElementById('editPatHistory').value
            })
        });
        
        const data = await response.json();
        if (data.success) {
            closeModal();
            loadPatients();
            showAlert('Patient updated successfully!', 'success', 'patientAlert');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function deletePatient(id) {
    if (!confirm('Are you sure you want to delete this patient?')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/delete-patient/${id}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        if (data.success) {
            loadPatients();
            showAlert('Patient deleted successfully!', 'success', 'patientAlert');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Modal Functions
function closeModal() {
    document.getElementById('editModal').classList.remove('show');
}

// Click outside modal to close
window.onclick = function(event) {
    const modal = document.getElementById('editModal');
    if (event.target == modal) {
        closeModal();
    }
}

// Clear errors on input
const inputFields = ['patientName', 'medicineName', 'quantity', 'amount', 'paymentMode'];
const errorFields = ['patientNameError', 'medicineNameError', 'quantityError', 'amountError', 'paymentModeError'];

inputFields.forEach((field, index) => {
    const element = document.getElementById(field);
    if (element) {
        element.addEventListener('input', () => {
            element.classList.remove('error');
            document.getElementById(errorFields[index]).textContent = '';
        });
    }
});

// ============================================
// SETTINGS MENU FUNCTIONS
// ============================================

// Initialize theme on page load
window.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('medicalStoreTheme') || 'light';
    applyTheme(savedTheme);
});

// Toggle settings menu
function toggleSettingsMenu() {
    const menu = document.getElementById('settingsMenu');
    if (menu) {
        menu.classList.toggle('active');
    }
}

// Close settings menu when clicking outside
document.addEventListener('click', (e) => {
    const menu = document.getElementById('settingsMenu');
    const settingsBtn = document.querySelector('.settings-btn');
    
    if (menu && menu.classList.contains('active') && !menu.contains(e.target) && !settingsBtn.contains(e.target)) {
        menu.classList.remove('active');
    }
});

// Also close when clicking outside on mobile
document.addEventListener('touchstart', (e) => {
    const menu = document.getElementById('settingsMenu');
    const settingsBtn = document.querySelector('.settings-btn');
    
    if (menu && menu.classList.contains('active') && !menu.contains(e.target) && !settingsBtn.contains(e.target)) {
        menu.classList.remove('active');
    }
});

// Set theme (light/dark)
function setTheme(theme) {
    applyTheme(theme);
    localStorage.setItem('medicalStoreTheme', theme);
    
    // Update active button
    document.querySelectorAll('.theme-option').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(theme + 'Btn').classList.add('active');
}

// Apply theme to body
function applyTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

// Show Developer Info Modal
function showDeveloperInfo() {
    document.getElementById('developerModal').classList.add('show');
    toggleSettingsMenu(); // Close settings menu
}

// Close Developer Info Modal
function closeDeveloperModal() {
    document.getElementById('developerModal').classList.remove('show');
}

// Toggle Notifications
function toggleNotifications() {
    const enabled = localStorage.getItem('notificationsEnabled') !== 'false';
    const newState = !enabled;
    localStorage.setItem('notificationsEnabled', newState);
    
    if (newState) {
        showAlert('Notifications enabled!', 'success', 'paymentAlert');
    } else {
        showAlert('Notifications disabled!', 'info', 'paymentAlert');
    }
    toggleSettingsMenu();
}

// Show Account Settings
function showAccountSettings() {
    // Clear any cached data to ensure fresh load
    if ('caches' in window) {
        caches.keys().then(names => {
            names.forEach(name => caches.delete(name));
        });
    }
    // Add timestamp to force reload
    window.location.href = 'account-settings.html?t=' + new Date().getTime();
}

// Show Help & Support
function showHelp() {
    alert('Help & Support\n\nFor assistance:\n📧 Email: support@medicalstore.pro\n📞 Phone: +1-800-MEDICAL\n💬 Live Chat: Available 24/7');
    toggleSettingsMenu();
}

// Export All Data
function exportAllData() {
    if (confirm('Export all data (Payments, Medicines, Patients) as CSV?')) {
        exportToCSV(); // Export payments
        alert('Data export completed!\n\nPayments, Medicines, and Patients data has been exported.');
        toggleSettingsMenu();
    }
}





