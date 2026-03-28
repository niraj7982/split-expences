// --- State & Defaults ---
let appData = {
    friends: [],
    expenses: []
};

let currentUser = null;
let registeredUsers = JSON.parse(localStorage.getItem('splitpro_users')) || [];
let currentOtp = null; // Store the generated OTP
let isEmailVerified = false;

// Utils
const generateId = () => Math.random().toString(36).substr(2, 9);
const formatMoney = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
};
// PDF Friendly (no symbol issues)
const formatPdfMoney = (amount) => {
    return "Rs. " + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// --- DOM Elements ---
const views = {
    dashboard: document.getElementById('dashboard-view'),
    expenses: document.getElementById('expenses-view'),
    friends: document.getElementById('friends-view')
};
const navItems = document.querySelectorAll('.nav-item');
const pageTitle = document.getElementById('page-title');

// UI State for Expense Modal
let currentSplitType = 'equal'; // 'equal' or 'exact'

// --- Authentication Logic ---
function checkAuth() {
    const sessionUser = localStorage.getItem('splitpro_current_user');
    if (sessionUser) {
        currentUser = JSON.parse(sessionUser);
        loadUserData(); // Load this user's data
        showApp();
    } else {
        showAuth();
    }
}

function showAuth() {
    document.getElementById('auth-view').style.display = 'flex';
    document.getElementById('app-view').style.display = 'none';
}

function showApp() {
    document.getElementById('auth-view').style.display = 'none';
    document.getElementById('app-view').style.display = 'block';
    renderFriends();
    updateDashboard();
}

// For this simple demo, we simulate persistence by using localStorage.
// In a real app, this would fetch from a database.
// We will store specific appData per "Account" (simulated by email key).
function loadUserData() {
    const data = localStorage.getItem(`splitpro_data_${currentUser.email}`);
    if (data) {
        appData = JSON.parse(data);
    } else {
        // Init fresh data for new user
        appData = { friends: [], expenses: [] };
        // Add "Self"
        appData.friends.push({ id: currentUser.id, name: `${currentUser.name} (You)`, balance: 0 });
        saveUserData();
    }
}

function saveUserData() {
    localStorage.setItem(`splitpro_data_${currentUser.email}`, JSON.stringify(appData));
}

function toggleAuthMode(mode) {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');

    if (mode === 'signup') {
        loginForm.style.display = 'none';
        signupForm.style.display = 'block';
        signupForm.reset();
        resetSignupState();
    } else {
        signupForm.style.display = 'none';
        loginForm.style.display = 'block';
        loginForm.reset();
    }
}

function resetSignupState() {
    isEmailVerified = false;
    currentOtp = null;
    document.getElementById('otp-group').style.display = 'none';
    document.getElementById('signup-email').disabled = false;
    document.getElementById('verify-btn').disabled = false;
    document.getElementById('verify-btn').innerText = 'Verify';

    const submitBtn = document.getElementById('signup-submit-btn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.5';
        submitBtn.style.cursor = 'not-allowed';
    }
}

function sendOtp(mode = 'signup') {
    let email, btnId, otpGroupId, otpInputId;

    if (mode === 'signup') {
        email = document.getElementById('signup-email').value.trim();
        btnId = 'verify-btn';
        otpGroupId = 'otp-group';
        otpInputId = 'signup-otp';
    } else {
        email = document.getElementById('forgot-email').value.trim();
        btnId = 'forgot-verify-btn';
        otpGroupId = 'forgot-otp-group';
        otpInputId = 'forgot-otp';
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!email) return alert('Please enter an email address first.');
    if (!emailRegex.test(email)) return alert('Invalid Email Format!');

    const userExists = registeredUsers.find(u => u.email === email);

    if (mode === 'signup' && userExists) {
        return alert('This email is already registered. Please Log In.');
    }
    if (mode === 'recovery' && !userExists) {
        return alert('This email is NOT registered. Please check details or Sign Up.');
    }

    // Generate random code
    currentOtp = Math.floor(1000 + Math.random() * 9000).toString();

    // --- EmailJS Integration ---
    const serviceID = "YOUR_SERVICE_ID";
    const templateID = "YOUR_TEMPLATE_ID";
    const templateParams = {
        to_email: email,
        otp_code: currentOtp
    };

    const btn = document.getElementById(btnId);

    if (serviceID === "YOUR_SERVICE_ID") {
        // Simulation / Fallback
        alert(`[SIMULATION] Verification Code for ${email}: ${currentOtp}`);
        document.getElementById(otpGroupId).style.display = 'block';
        document.getElementById(otpInputId).focus();
    } else {
        // Real Send
        btn.innerText = 'Sending...';
        btn.disabled = true;

        emailjs.send(serviceID, templateID, templateParams)
            .then(function (response) {
                alert(`Code sent to ${email}. Check inbox.`);
                document.getElementById(otpGroupId).style.display = 'block';
                document.getElementById(otpInputId).focus();
                btn.innerText = 'Resend';
                btn.disabled = false;
            }, function (error) {
                alert('Failed to send email. Falling back to simulation.');
                alert(`[SIMULATION] Code: ${currentOtp}`);
                document.getElementById(otpGroupId).style.display = 'block';
                document.getElementById(otpInputId).focus();
                btn.innerText = 'Verify';
                btn.disabled = false;
            });
    }
}

function verifyOtp(mode = 'signup') {
    let inputOtp, otpGroupId, btnId, emailId;

    if (mode === 'signup') {
        inputOtp = document.getElementById('signup-otp').value.trim();
        otpGroupId = 'otp-group';
        btnId = 'verify-btn';
        emailId = 'signup-email';
    } else {
        inputOtp = document.getElementById('forgot-otp').value.trim();
        otpGroupId = 'forgot-otp-group';
        btnId = 'forgot-verify-btn';
        emailId = 'forgot-email';
    }

    if (inputOtp === currentOtp) {
        isEmailVerified = true;
        alert('Email Verified Successfully!');

        // Lock fields
        document.getElementById(emailId).disabled = true;
        document.getElementById(btnId).innerText = 'Verified';
        document.getElementById(btnId).disabled = true;
        document.getElementById(otpGroupId).style.display = 'none';

        if (mode === 'signup') {
            const submitBtn = document.getElementById('signup-submit-btn');
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
            submitBtn.style.cursor = 'pointer';
        } else {
            // Show new password field for recovery
            document.getElementById('new-password-group').style.display = 'block';
            const submitBtn = document.getElementById('reset-submit-btn');
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
            submitBtn.style.cursor = 'pointer';
        }

    } else {
        alert('Incorrect Code.');
    }
}

function handleResetPassword(e) {
    e.preventDefault();
    if (!isEmailVerified) return alert('Please verify email first.');

    const email = document.getElementById('forgot-email').value.trim();
    const newPass = document.getElementById('new-password').value.trim();

    if (!newPass) return alert('Enter a new password');

    const userIndex = registeredUsers.findIndex(u => u.email === email);
    if (userIndex !== -1) {
        registeredUsers[userIndex].password = newPass;
        localStorage.setItem('splitpro_users', JSON.stringify(registeredUsers));
        alert('Password Reset Successfully! Please Log In.');
        toggleAuthMode('login');
    } else {
        alert('User not found.');
    }
}

function handleSignup(e) {
    e.preventDefault();

    if (!isEmailVerified) {
        return alert('Please verify your email address first.');
    }

    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value.trim();

    if (!name || !password) return alert('Please fill in Name and Password.');

    const newUser = { id: generateId(), name, email, password };
    registeredUsers.push(newUser);
    localStorage.setItem('splitpro_users', JSON.stringify(registeredUsers));

    // Auto login
    currentUser = newUser;
    localStorage.setItem('splitpro_current_user', JSON.stringify(currentUser));
    loadUserData();
    alert('Account created! Welcome.');
    showApp();
}

function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();

    const user = registeredUsers.find(u => u.email === email && u.password === password);

    if (user) {
        currentUser = user;
        localStorage.setItem('splitpro_current_user', JSON.stringify(currentUser));
        loadUserData();
        showApp();
    } else {
        alert('Invalid email or password');
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('splitpro_current_user');
    showAuth();
}

// --- Navigation ---
navItems.forEach(item => {
    item.addEventListener('click', () => {
        const tab = item.dataset.tab;
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        Object.values(views).forEach(view => view.classList.remove('active'));
        views[tab].classList.add('active');
        pageTitle.innerText = tab.charAt(0).toUpperCase() + tab.slice(1);
    });
});

// --- Modal Logic ---
function openModal(id) {
    document.getElementById(id).classList.add('open');
    if (id === 'expense-modal') {
        populateExpenseForm();
        currentSplitType = 'equal'; // default
        updateSplitUI();
    }
}
function closeModal(id) {
    document.getElementById(id).classList.remove('open');
}

// --- Friend Logic ---
function submitFriend() {
    const nameInput = document.getElementById('friend-name-input');
    const name = nameInput.value.trim();

    if (!name) return alert('Please enter a name');

    // Edit or Add
    const editingId = nameInput.dataset.editingId;
    if (editingId) {
        const friend = appData.friends.find(f => f.id === editingId);
        if (friend) friend.name = name;
        delete nameInput.dataset.editingId;
        document.querySelector('#friend-modal h3').innerText = 'Add New Friend';
        document.querySelector('#friend-modal .btn-primary').innerText = 'Add Friend';
    } else {
        const newFriend = { id: generateId(), name: name, balance: 0 };
        appData.friends.push(newFriend);
    }

    nameInput.value = '';
    closeModal('friend-modal');
    saveUserData();
    renderFriends();
    renderExpenses(); // Refreshes names in list
    updateDashboard();
}

function editFriend(id) {
    const friend = appData.friends.find(f => f.id === id);
    if (!friend) return;

    document.querySelector('#friend-modal h3').innerText = 'Edit Friend';
    document.querySelector('#friend-modal .btn-primary').innerText = 'Save Changes';
    const input = document.getElementById('friend-name-input');
    input.value = friend.name;
    input.dataset.editingId = id;
    openModal('friend-modal');
}

function renderFriends() {
    const grid = document.getElementById('friends-grid');
    grid.innerHTML = '';
    appData.friends.forEach(friend => {
        const el = document.createElement('div');
        el.className = 'friend-card';
        // Allow editing logic
        el.innerHTML = `
            <button class="edit-btn" onclick="editFriend('${friend.id}')"><i class="ph ph-pencil-simple"></i></button>
            <div class="friend-avatar">${friend.name.charAt(0).toUpperCase()}</div>
            <h3>${friend.name}</h3>
            <p style="color: ${friend.balance >= 0 ? 'var(--success)' : 'var(--danger)'}; margin-top: 8px;">
                ${friend.balance >= 0 ? 'Owed ' + formatMoney(friend.balance) : 'Owes ' + formatMoney(Math.abs(friend.balance))}
            </p>
        `;
        grid.appendChild(el);
    });
}

// --- Expense Logic ---
function toggleCustomCategory() {
    const select = document.getElementById('expense-category');
    const input = document.getElementById('custom-category-input');
    input.style.display = (select.value === 'custom') ? 'block' : 'none';
}

function toggleSplitType() {
    currentSplitType = currentSplitType === 'equal' ? 'exact' : 'equal';
    updateSplitUI();
}

function updateSplitUI() {
    const btn = document.getElementById('split-toggle-btn');
    const label = document.getElementById('split-type-label');
    const inputs = document.querySelectorAll('.split-amount-input');

    if (currentSplitType === 'equal') {
        label.innerText = 'Equally';
        btn.innerText = 'Switch to Unequal';
        inputs.forEach(input => input.style.display = 'none');
    } else {
        label.innerText = 'Unequally (exact amounts)';
        btn.innerText = 'Switch to Equal';
        inputs.forEach(input => input.style.display = 'block');
    }
    validateSplitTotal();
}

function populateExpenseForm() {
    const payerSelect = document.getElementById('expense-payer');
    const splitContainer = document.getElementById('expense-split-users');

    payerSelect.innerHTML = appData.friends.map(f => `<option value="${f.id}">${f.name}</option>`).join('');

    splitContainer.innerHTML = appData.friends.map(f => `
        <label class="checkbox-item">
            <div style="display:flex; align-items:center; gap:8px;">
                <input type="checkbox" value="${f.id}" class="split-checkbox" onchange="validateSplitTotal()" checked>
                <span>${f.name}</span>
            </div>
            <input type="number" class="split-amount-input" data-id="${f.id}" placeholder="0.00" oninput="validateSplitTotal()">
        </label>
    `).join('');
}

function validateSplitTotal() {
    const msg = document.getElementById('split-validation-msg');
    if (currentSplitType === 'equal') {
        msg.style.display = 'none';
        return true;
    }
    const totalAmount = parseFloat(document.getElementById('expense-amount').value) || 0;
    const inputs = document.querySelectorAll('.split-amount-input');
    let currentSum = 0;
    inputs.forEach(input => {
        const checkbox = input.parentElement.querySelector('.split-checkbox');
        if (checkbox.checked) currentSum += parseFloat(input.value) || 0;
    });

    if (Math.abs(totalAmount - currentSum) > 0.05) {
        msg.style.display = 'block';
        msg.innerText = `Total split (${currentSum.toFixed(2)}) must match expense ($${totalAmount.toFixed(2)})`;
        return false;
    } else {
        msg.style.display = 'none';
        return true;
    }
}


function submitExpense() {
    const desc = document.getElementById('expense-desc').value.trim();
    const amount = parseFloat(document.getElementById('expense-amount').value);

    // Category
    let category = document.getElementById('expense-category').value;
    if (category === 'custom') category = document.getElementById('custom-category-input').value.trim() || 'General';

    const payerId = document.getElementById('expense-payer').value;
    const splitCheckboxes = document.querySelectorAll('.split-checkbox:checked');
    const selectedIds = Array.from(splitCheckboxes).map(cb => cb.value);

    if (!desc || isNaN(amount) || amount <= 0 || selectedIds.length === 0) {
        return alert('Please fill in description and valid amount.');
    }

    let splitDetails = [];
    if (currentSplitType === 'equal') {
        const splitAmount = amount / selectedIds.length;
        splitDetails = selectedIds.map(id => ({ userId: id, amount: splitAmount }));
    } else {
        if (!validateSplitTotal()) return alert('Please ensure exact split amounts match total.');
        splitDetails = selectedIds.map(id => {
            const input = document.querySelector(`.split-amount-input[data-id="${id}"]`);
            return { userId: id, amount: parseFloat(input.value) || 0 };
        });
    }

    const expense = {
        id: generateId(),
        desc, amount, category, payerId, splitDetails,
        date: new Date()
    };
    appData.expenses.push(expense);
    closeModal('expense-modal');

    // Clean inputs
    document.getElementById('expense-desc').value = '';
    document.getElementById('expense-amount').value = '';

    saveUserData();
    updateDashboard();
    renderExpenses();
    renderFriends();
}

function renderExpenses() {
    const list = document.getElementById('expenses-list');
    if (appData.expenses.length === 0) {
        list.innerHTML = `<div class="empty-state"><i class="ph ph-receipt"></i><p>No expenses yet</p></div>`;
        return;
    }
    list.innerHTML = appData.expenses.slice().reverse().map(exp => {
        const payer = appData.friends.find(f => f.id === exp.payerId)?.name || 'Unknown';
        return `
            <div class="expense-item">
                <div>
                    <h4 style="font-size: 16px; margin-bottom: 4px;">${exp.desc}</h4>
                    <span style="font-size: 12px; color: var(--text-secondary);">${payer} paid for ${exp.splitDetails.length} people • ${exp.category}</span>
                </div>
                <div style="font-weight: 600; font-size: 18px;">${formatMoney(exp.amount)}</div>
            </div>`;
    }).join('');
}

// --- Algorithm & Stats ---
function recalculateBalances() {
    appData.friends.forEach(f => f.balance = 0);
    appData.expenses.forEach(exp => {
        const payer = appData.friends.find(f => f.id === exp.payerId);
        if (payer) payer.balance += exp.amount;
        exp.splitDetails.forEach(split => {
            const debtor = appData.friends.find(f => f.id === split.userId);
            if (debtor) debtor.balance -= split.amount;
        });
    });
}

function calculateSettlements() {
    let debtors = [];
    let creditors = [];
    appData.friends.forEach(f => {
        if (f.balance < -0.01) debtors.push({ ...f });
        if (f.balance > 0.01) creditors.push({ ...f });
    });
    debtors.sort((a, b) => a.balance - b.balance);
    creditors.sort((a, b) => b.balance - a.balance);

    let settlements = [];
    let d = 0, c = 0;
    while (d < debtors.length && c < creditors.length) {
        let debtor = debtors[d];
        let creditor = creditors[c];
        let amount = Math.min(Math.abs(debtor.balance), creditor.balance);

        settlements.push({
            fromId: debtor.id,
            from: debtor.name,
            toId: creditor.id,
            to: creditor.name,
            amount: amount
        });
        debtor.balance += amount;
        creditor.balance -= amount;

        if (Math.abs(debtor.balance) < 0.01) d++;
        if (creditor.balance < 0.01) c++;
    }
    return settlements;
}

function updateDashboard() {
    recalculateBalances();
    const settlements = calculateSettlements();
    const container = document.getElementById('settlement-list');

    if (settlements.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="ph ph-check-circle"></i><p>All settled up!</p></div>`;
    } else {
        container.innerHTML = settlements.map(s => `
            <div class="settlement-item">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="background: rgba(239, 68, 68, 0.2); color: var(--danger); padding: 8px; border-radius: 50%;">
                        <i class="ph ph-arrow-right"></i>
                    </div>
                    <div>
                        <span style="font-weight: 600; color: var(--text-primary);">${s.from}</span>
                        <span style="color: var(--text-secondary);"> pays </span>
                        <span style="font-weight: 600; color: var(--text-primary);">${s.to}</span>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="font-weight: 700; color: var(--success);">${formatMoney(s.amount)}</div>
                    <button class="btn-xs btn-primary" title="Mark as Paid" onclick="settleDebt('${s.fromId}', '${s.toId}', ${s.amount})">
                        <i class="ph ph-check"></i>
                    </button>
                </div>
            </div>`).join('');
    }

    // Totals
    const totalPositive = appData.friends.reduce((sum, f) => f.balance > 0 ? sum + f.balance : sum, 0);
    const totalNegative = appData.friends.reduce((sum, f) => f.balance < 0 ? sum + f.balance : sum, 0);
    const totalExpense = appData.expenses.reduce((sum, exp) => sum + exp.amount, 0);

    document.getElementById('total-owed').innerText = formatMoney(totalPositive);
    document.getElementById('total-debt').innerText = formatMoney(Math.abs(totalNegative));
    document.getElementById('total-expense-display').innerText = formatMoney(totalExpense);
}

function triggerSimplification() {
    document.querySelector('[data-tab="dashboard"]').click();
    document.getElementById('settlement-list').scrollIntoView({ behavior: 'smooth' });
}

// --- PDF Generate ---
function downloadReport() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(99, 102, 241);
    doc.text("SplitPro Expenses Report", 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);

    // Balances
    doc.setFontSize(14); doc.setTextColor(0);
    doc.text("Current Balances", 14, 40);
    const balanceData = appData.friends.map(f => [
        f.name, f.balance >= 0 ? `+${formatPdfMoney(f.balance)}` : `-${formatPdfMoney(Math.abs(f.balance))}`
    ]);
    doc.autoTable({ startY: 45, head: [['Friend', 'Net Balance']], body: balanceData, theme: 'grid', headStyles: { fillColor: [51, 65, 85] } });

    // Settlements
    let finalY = doc.lastAutoTable.finalY + 15;
    doc.text("Settlement Plan", 14, finalY);
    const settlements = calculateSettlements();
    const settlementData = settlements.length ? settlements.map(s => [s.from, s.to, formatPdfMoney(s.amount)]) : [['All settled up!', '', '']];
    doc.autoTable({ startY: finalY + 5, head: [['Payer', 'Receiver', 'Amount']], body: settlementData, theme: 'striped', headStyles: { fillColor: [239, 68, 68] } });

    // History
    finalY = doc.lastAutoTable.finalY + 15;
    doc.text("Expense History", 14, finalY);
    const expenseData = appData.expenses.map(exp => {
        const payer = appData.friends.find(f => f.id === exp.payerId)?.name || 'Unknown';
        return [exp.desc, exp.category, payer, formatPdfMoney(exp.amount), new Date(exp.date).toLocaleDateString()];
    });
    doc.autoTable({ startY: finalY + 5, head: [['Description', 'Category', 'Paid By', 'Amount', 'Date']], body: expenseData, theme: 'striped', headStyles: { fillColor: [99, 102, 241] } });

    doc.save("SplitPro_Report.pdf");
}

// --- Settlement Logic ---
function settleDebt(fromId, toId, amount) {
    const fromUser = appData.friends.find(f => f.id === fromId);
    const toUser = appData.friends.find(f => f.id === toId);

    if (!fromUser || !toUser) return;

    if (confirm(`Mark that ${fromUser.name} paid ${toUser.name} ${formatMoney(amount)}?`)) {
        // Create Settlement Expense
        const settlementExpense = {
            id: generateId(),
            desc: `Payment from ${fromUser.name} to ${toUser.name}`,
            amount: amount,
            category: 'Settlement',
            payerId: fromId,
            splitDetails: [{ userId: toId, amount: amount }], // 100% to creditor
            date: new Date()
        };

        appData.expenses.push(settlementExpense);
        saveUserData();
        updateDashboard();
        renderExpenses();
        renderFriends();
    }
}

function markAllSettled() {
    if (appData.expenses.length === 0) {
        return alert('No expenses to settle!');
    }

    if (confirm('Are you sure you want to delete ALL expenses and reset everything? This action cannot be undone.')) {
        appData.expenses = [];
        recalculateBalances(); // Will reset all balances to 0
        saveUserData();
        updateDashboard();
        renderExpenses();
        renderFriends();
        alert('All data reset.');
    }
}


// Start
checkAuth();
