/**
 * 📊 FMT TRACKER PRO - ULTIMATE MASTER LOGIC (FINAL)
 * ---------------------------------------------------
 * 🛡️ Security: Hybrid Input (Keyboard for Desktop, Touch for Mobile)
 * 📈 Graph: Fixed Aspect Ratio, Sharper Lines, No Stretch
 * 🔄 Refresh: 720deg Smooth Spin Animation
 * 📱 Responsiveness: Full Mobile Support
 */

// 🌐 1. CONFIGURATION & CONSTANTS
const API_URL = "Y2V4ZS9tMjMtbV82V0otYmJrVzgxblNtUDljOV9HNHAtVnU0ZEV5VGFjZzMzV0ZiY1ZEVHhZaGo3MWRwaGQ2X3RiV3FKbnpiY3lmS0Evcy9zb3JjYW0vbW9jLmVsZ29vZy50cGlyY3MvLzpzcHR0aA==";

// 🛠️ DOM UTILITIES
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

// --- 📦 GLOBAL STATE MANAGEMENT ---
let allEntries = [];
let branchChart = null;
let centralChart = null;
let notifTimes = JSON.parse(localStorage.getItem('fmt_notifs')) || [];
let notifEnabled = JSON.parse(localStorage.getItem('fmt_notif_status')) === true;
let autoPinVerify = JSON.parse(localStorage.getItem('fmt_pin_auto')) !== false; // Default true
let lastCheckedMinute = -1;

// Helper to get stored PIN
const getSavedPin = () => localStorage.getItem('fmt_pin') || "000000";


// 📣 2. NOTIFICATION & TOASTS 📣

function showToast(msg, type = "default") {
    const t = $('#statusToast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'toast show';
    if (type === "success") t.classList.add('success');
    else if (type === "error") t.classList.add('error');
    else t.classList.add('default');
    
    setTimeout(() => t.classList.remove('show'), 3000);
}

function format12hr(time24) {
    if (!time24) return "N/A";
    let [hrs, mins] = time24.split(':');
    hrs = parseInt(hrs);
    const period = hrs >= 12 ? 'PM' : 'AM';
    hrs = hrs % 12 || 12;
    return `${hrs}:${mins} ${period}`;
}


// 🔐 3. SECURITY & PIN MANAGEMENT 🔐

// Render visual dots for PIN input
function handlePinInput(val) {
    const dots = $$('.v-dot');
    const isVisible = $('#pinViewToggle') ? $('#pinViewToggle').checked : false;
    
    dots.forEach((dot, i) => {
        dot.innerHTML = ""; // Clear previous content
        if (i < val.length) {
            dot.classList.add('has-val');
            dot.textContent = isVisible ? val[i] : "●"; 
        } else {
            dot.classList.remove('has-val');
            dot.textContent = "";
        }
        dot.classList.toggle('current', i === val.length); 
    });

    if (autoPinVerify && val.length === 6) {
        processPin(val);
    }
}

// Handle Keypad Presses (Virtual & Physical)
function handleKeyPress(key) {
    const input = $('#pinInput');
    let currentVal = input.value;

    if (key === 'BACK' || key === 'Backspace') {
        input.value = currentVal.slice(0, -1);
    } else if (key === 'ENTER' || key === 'Enter') {
        processPin(currentVal);
        return;
    } else if (/^[0-9]$/.test(key)) {
        if (currentVal.length < 6) {
            input.value = currentVal + key;
        }
    }
    
    handlePinInput(input.value);
}

// PIN verification and lock animation
function triggerParticles(container) {
    const existingParticles = container.querySelector('.particles');
    if (existingParticles) existingParticles.remove();

    const particlesContainer = document.createElement('div');
    particlesContainer.className = 'particles';
    container.appendChild(particlesContainer);

    for (let i = 0; i < 15; i++) {
        const p = document.createElement('span');
        p.className = 'particle';
        
        const angle = Math.random() * Math.PI * 2;
        const distance = 60 + Math.random() * 80; 
        const x = Math.cos(angle) * distance + "px";
        const y = Math.sin(angle) * distance + "px";
        
        p.style.setProperty('--p-x', x);
        p.style.setProperty('--p-y', y);
        
        const size = 6 + Math.random() * 8 + "px";
        p.style.width = size;
        p.style.height = size;
        particlesContainer.appendChild(p);
    }
}

function processPin(val) {
    const lockBtn = document.querySelector('.btn-lock');
    if (val.length < 6) {
        showToast("দয়া করে ৬ ডিজিট পূর্ণ করুন", "error");
        return;
    }
    
    if (val === getSavedPin()) {
        triggerParticles(lockBtn); 
        lockBtn.classList.add('unlocked');
        showToast("সফলভাবে লগইন হয়েছে", "success");

        setTimeout(() => {
            $('#pinGate').classList.add('hidden');
            $('#app').classList.remove('hidden');
            fetchData();
            requestNotifPermission();
        }, 1200); // Cinematic delay to show animation
    } else {
        showToast("ভুল পিন! আবার চেষ্টা করুন", "error");
        lockBtn.classList.add('error-shake');
        
        if(navigator.vibrate) navigator.vibrate([80, 50, 80]); 

        setTimeout(() => {
            lockBtn.classList.remove('error-shake');
            $('#pinInput').value = "";
            handlePinInput("");
        }, 500); 
    }
}


// Focus Input on Desktop Click
const pinWrapper = document.querySelector('.pin-box-wrapper');
if (pinWrapper) {
    pinWrapper.addEventListener('click', () => {
        const input = document.getElementById('pinInput');
        if(input) input.focus();
    });
}

// Toggle Visibility of PIN
window.toggleLockPinView = () => {
    const input = $('#pinInput');
    handlePinInput(input.value); 
};

// Toggle Password Field Type (Settings)
window.togglePass = (id) => {
    const input = $(`#${id}`);
    const btn = input.nextElementSibling.querySelector('i');
    input.type = input.type === "password" ? "text" : "password";
    btn.className = input.type === "password" ? "fas fa-eye" : "fas fa-eye-slash";
};

// Change User PIN Logic
async function changePin() {
    const oldPin = $('#oldPinSet').value;
    const newPin = $('#newPinSet').value;
    const confirmPin = $('#confirmPinSet').value;

    if (oldPin !== getSavedPin()) return showToast("বর্তমান পিন সঠিক নয়", "error");
    if (newPin.length !== 6 || !/^\d+$/.test(newPin)) return showToast("নতুন পিন শুধুমাত্র ৬ ডিজিটের সংখ্যা হতে হবে", "error");
    if (newPin !== confirmPin) return showToast("নতুন পিন দুটি মেলেনি", "error");

    localStorage.setItem('fmt_pin', newPin);
    showToast("পিন সফলভাবে পরিবর্তন হয়েছে", "success");
    $('#oldPinSet').value = ""; $('#newPinSet').value = ""; $('#confirmPinSet').value = "";
}


// 📡 4. DATA FETCHING ENGINE 📡

async function fetchData() {
    try {
        const url = atob(API_URL).split("").reverse().join("");
        const res = await fetch(url);
        if (!res.ok) throw new Error("Network response was not ok");
        
        const data = await res.json();

        // Process Data: Add Serial, Sort by Date
        allEntries = data.filter(d => d.date).map((entry, index) => ({
            ...entry,
            serial: index + 1
        })).sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // Populate Year Filter Dynamically
        const years = [...new Set(allEntries.map(d => d.date.split('-')[0]))];
        if ($('#yearSelect')) {
            const currentVal = $('#yearSelect').value;
            $('#yearSelect').innerHTML = '<option value="">সব বছর</option>' + 
                years.map(y => `<option value="${y}" ${y === currentVal ? 'selected' : ''}>${y}</option>`).join('');
        }
        
        renderDashboard();
    } catch (e) {
        console.error(e);
        showToast("ডাটা লোড করতে সমস্যা হয়েছে", "error");
    }
}


// 📊 5. DASHBOARD & CHARTS 📊

function renderDashboard() {
    let data = [...allEntries];
    
    // Apply Filters
    const year = $('#yearSelect')?.value;
    const month = $('#monthSelect')?.value;
    const start = $('#startDate')?.value;
    const end = $('#endDate')?.value;

    if (year) data = data.filter(d => d.date.startsWith(year));
    if (month) data = data.filter(d => d.date.split('-')[1] === month);
    if (start) data = data.filter(d => new Date(d.date) >= new Date(start));
    if (end) data = data.filter(d => new Date(d.date) <= new Date(end));

    updateTable(data);
    updateSummary(data);
    updateCharts(data);
}

function updateTable(data) {
    const tbody = $('#tableRows');
    if (!tbody) return;
    tbody.innerHTML = data.length ? "" : '<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--text-muted);">কোন রিপোর্ট পাওয়া যায়নি</td></tr>';

    // Show latest on top for table
    [...data].reverse().forEach((d) => {
        tbody.innerHTML += `
            <tr>
                <td><span class="sn-badge">${d.serial}</span></td>
                <td>
                    <div class="table-date-cell">
                        <span>${d.date}</span>
                        <div class="table-time-row">
                            <i class="far fa-clock"></i><span class="time-text">${d.time || 'N/A'}</span>
                        </div>
                    </div>
                </td>
                <td class="fw-800">${d.branch}</td>
                <td class="fw-800">${d.central}</td>
            </tr>`;
    });
}

function updateSummary(data) {
    if (!data.length) {
        ['#sumLastDate', '#sumBranch', '#sumCentral', '#sumBestBranch', '#sumBestCentral'].forEach(id => {
            if($(id)) $(id).textContent = "-";
        });
        if($('#sumTotal')) $('#sumTotal').textContent = "0";
        return;
    }

    const last = data[data.length - 1];
    const bValues = allEntries.map(d => parseInt(d.branch)); 
    const cValues = allEntries.map(d => parseInt(d.central));

    const setVal = (id, val) => { if ($(id)) $(id).textContent = val; };
    setVal('#sumLastDate', last.date);
    setVal('#sumBranch', last.branch);
    setVal('#sumCentral', last.central);
    setVal('#sumBestBranch', Math.min(...bValues));
    setVal('#sumBestCentral', Math.min(...cValues));
    setVal('#sumTotal', data.length);
}

// 📈 SMART CHART LOGIC (Fixed for Aspect Ratio & Stretch)
function updateCharts(data) {
    if (!window.Chart) return;
    const labels = data.map(d => `R-${d.serial}`);

    const chartOptions = {
        responsive: true, 
        maintainAspectRatio: false, // Allows CSS to control the shape
        layout: {
            padding: { top: 10, bottom: 10, left: 10, right: 10 }
        },
        scales: {
            y: { 
                reverse: false,
                beginAtZero: false,
                grid: { color: 'rgba(0,0,0,0.05)', drawBorder: false },
                ticks: { font: { family: 'Inter', size: 11 } }
            },
            x: { 
                grid: { display: false },
                ticks: { 
                    autoSkip: true,
                    maxTicksLimit: 12, // Prevents overcrowding on x-axis
                    maxRotation: 0,
                    font: { family: 'Inter', size: 10 } 
                }
            }
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#1e293b',
                titleColor: '#fff',
                bodyColor: '#cbd5e1',
                displayColors: false,
                callbacks: {
                    title: (ctx) => `রিপোর্ট নম্বর: ${ctx[0].label.replace('R-', '')}`,
                    label: (ctx) => `মেরিট পজিশন: ${ctx.raw}`
                }
            }
        }
    };

    // Render Branch Chart
    if (branchChart) branchChart.destroy();
    branchChart = new Chart($('#branchChart'), {
        type: 'line',
        data: { labels, datasets: [{ 
            data: data.map(d => d.branch), 
            borderColor: '#6366f1', borderWidth: 2.5, pointRadius: 4, pointHoverRadius: 6,
            tension: 0.2, // Sharper lines to prevent flattening look
            fill: true,
            backgroundColor: 'rgba(99, 102, 241, 0.1)'
        }] },
        options: chartOptions
    });

    // Render Central Chart
    if (centralChart) centralChart.destroy();
    centralChart = new Chart($('#centralChart'), {
        type: 'line',
        data: { labels, datasets: [{ 
            data: data.map(d => d.central), 
            borderColor: '#10b981', borderWidth: 2.5, pointRadius: 4, pointHoverRadius: 6,
            tension: 0.2, 
            fill: true,
            backgroundColor: 'rgba(16, 185, 129, 0.1)'
        }] },
        options: chartOptions
    });
}


// 🧩 6. MODALS & POPUPS 🧩

function openModal(html) {
    const modal = $('#standardModal');
    const content = $('#modalContent');
    content.className = "reset-popup-premium"; 
    content.innerHTML = html;
    modal.classList.remove('hidden');
}

function closeModal() { $('#standardModal').classList.add('hidden'); }

// Step 1: Warning
function showResetStep1() {
    openModal(`
        <div class="reset-top-banner">
            <div class="reset-icon-anim"><i class="fas fa-trash-alt"></i></div>
            <h3>সতর্কবার্তা</h3>
        </div>
        <div class="reset-body">
            <ul class="warning-points">
                <li>অ্যাপের সকল সেটিংস ও পারমিশন স্থায়ীভাবে মুছে যাবে। (সীটে সেভ করা ডাটা মুছে যাবে না)</li>
                <li>আপনার সিকিউরিটি পিন রিসেট হয়ে ডিফল্ট পিন সেট হয়ে যাবে।</li>
                <li>এই প্রক্রিয়াটি সম্পন্ন হলে আর পূর্বাবস্থায় ফিরিয়ে আনা যাবে না।</li>
            </ul>
            <div class="divider-line"></div>
            <div class="input-reset-wrapper">
                <label>নিশ্চিত করতে বড় হাতের অক্ষরে "RESET" লিখুন</label>
                <input type="text" id="confirmText" placeholder="RESET" autocomplete="off">
            </div>
            <div class="reset-footer">
                <button class="btn-reset-cancel" onclick="closeModal()">বাতিল</button>
                <button class="btn-reset-confirm" onclick="showResetStep2()">পরবর্তী ধাপ</button>
            </div>
        </div>
    `);
}

// Step 2: PIN Verification
function showResetStep2() {
    if ($('#confirmText')?.value !== 'RESET') return showToast("সঠিকভাবে RESET শব্দটি লিখুন", "error");
    openModal(`
        <div class="reset-top-banner">
            <div class="reset-icon-anim" style="color:#6366f1; background:#eef2ff;"><i class="fas fa-shield-alt"></i></div>
            <h3 style="color:#6366f1;">নিরাপত্তা যাচাই</h3>
        </div>
        <div class="reset-body">
            <p style="text-align:center; font-size:13px; color:var(--text-muted); margin-bottom:20px;">
                চূড়ান্ত অনুমোদনের জন্য আপনার বর্তমান পিন কোডটি দিন।
            </p>
            <div class="input-reset-wrapper">
                <input type="password" id="confirmPin" placeholder="••••••" maxlength="6" style="letter-spacing:5px; font-size:18px;">
            </div>
            <div class="reset-footer">
                <button class="btn-reset-cancel" onclick="showResetStep1()">পিছনে</button>
                <button class="btn-reset-confirm" style="background:#1f2937;" onclick="finalReset()">মুছে ফেলুন</button>
            </div>
        </div>
    `);
}

function finalReset() {
    if ($('#confirmPin')?.value === getSavedPin()) {
        localStorage.clear();
        showToast("সিস্টেম রিসেট করা হয়েছে", "success");
        setTimeout(() => location.reload(), 1500);
    } else {
        showToast("ভুল পিন কোড!", "error");
    }
}

// Reminder Deletion Confirmation
window.confirmDelRem = (i) => {
    const timeRaw = notifTimes[i];
    const timeDisplay = format12hr(timeRaw);
    openModal(`
        <div style="padding:25px; text-align:center;"> 
            <i class="fas fa-bell-slash" style="font-size:30px; color:#f59e0b; margin-bottom:15px;"></i> 
            <h3 style="margin:0 0 10px;">রিমাইন্ডার মুছুন?</h3> 
            <p style="font-size:13px; color:#64748b; margin-bottom:20px;">আপনি কি (${timeDisplay}) এর রিমাইন্ডারটি মুছে ফেলতে চান?</p> 
            <div class="reset-footer"> 
                <button class="btn-reset-cancel" onclick="closeModal()">না</button> 
                <button class="btn-reset-confirm" style="background:#f59e0b;" onclick="deleteReminder(${i})">হ্যাঁ</button> 
            </div>
        </div>`);
};

function deleteReminder(i) {
    notifTimes.splice(i, 1);
    localStorage.setItem('fmt_notifs', JSON.stringify(notifTimes));
    renderReminders();
    closeModal();
    showToast("রিমাইন্ডার মুছে ফেলা হয়েছে", "success");
}


// 🔔 7. NOTIFICATIONS SYSTEM 🔔

async function requestNotifPermission() {
    if ("Notification" in window && Notification.permission !== "granted") {
        await Notification.requestPermission();
    }
}

function checkNotifications() {
    if (!notifEnabled || notifTimes.length === 0) return;
    const now = new Date();
    const currentTime = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');
    const currentMinute = now.getHours() * 60 + now.getMinutes();
    
    if (currentMinute === lastCheckedMinute) return;
    lastCheckedMinute = currentMinute;

    if (notifTimes.includes(currentTime)) {
        new Notification("FMT Tracker Pro", {
            body: `আপনার রিপোর্ট চেক করার সময় হয়েছে (${format12hr(currentTime)})।`,
            icon: "https://cdn-icons-png.flaticon.com/512/3119/3119338.png"
        });
    }
}
setInterval(checkNotifications, 10000);


// ⚙️ 8. INITIALIZATION & EVENTS ⚙️

function syncTheme(isDark) {
    document.body.classList.toggle('dark-theme', isDark);
    localStorage.setItem('fmt_theme', isDark ? 'dark' : 'light');
    if ($('#darkToggleSet')) $('#darkToggleSet').checked = isDark;
}

function updatePinSettingsUI() {
    const toggle = $('#pinAutoToggleSet');
    if (toggle) toggle.checked = autoPinVerify;
}

function setupEvents() {
    // 1. PIN & Keypad Events
    $$('.key-btn').forEach(btn => {
        btn.onclick = (e) => {
            if(navigator.vibrate) navigator.vibrate(20);
            handleKeyPress(btn.dataset.key);
        };
    });

    // Keyboard support for PIN (Physical Keyboard)
    const pinInput = $('#pinInput');
    if(pinInput) {
        pinInput.addEventListener('input', (e) => {
            handlePinInput(e.target.value);
        });
        
        // Ensure manual focus management for desktop hidden input
        pinInput.addEventListener('blur', () => {
             // Optional: Force focus back if needed, but usually better to leave user control
        });
    }

    document.addEventListener('keydown', (e) => {
        if (!$('#pinGate').classList.contains('hidden')) {
            // For desktop, we primarily rely on the hidden input, but direct keys can act as backup
             const input = $('#pinInput');
             if(document.activeElement !== input) {
                 input.focus();
             }
             if(e.key === 'Enter') processPin(input.value);
        }
    });

    // Pin Settings
    const pinAutoTgl = $('#pinAutoToggleSet');
    if (pinAutoTgl) {
        pinAutoTgl.onchange = (e) => {
            autoPinVerify = e.target.checked;
            localStorage.setItem('fmt_pin_auto', autoPinVerify);
            updatePinSettingsUI();
            showToast(autoPinVerify ? "অটো পিন ভেরিফাই চালু" : "ম্যানুয়াল পিন ভেরিফাই চালু");
        };
    }

    if ($('#pinViewToggle')) {
        $('#pinViewToggle').onchange = toggleLockPinView;
    }
    
    // Theme Toggles
    if ($('#pinThemeToggle')) $('#pinThemeToggle').onclick = () => syncTheme(!document.body.classList.contains('dark-theme'));
    $('#themeToggle').onclick = () => syncTheme(!document.body.classList.contains('dark-theme'));
    if ($('#darkToggleSet')) $('#darkToggleSet').onchange = (e) => syncTheme(e.target.checked);

    // 2. Navigation & Tabs
    $$('.tabBtn, .m-nav-link').forEach(btn => {
        btn.onclick = () => {
            const target = btn.dataset.target;
            $$('.tab-item').forEach(t => t.classList.toggle('hidden', t.id !== target));
            $$('.tabBtn').forEach(b => b.classList.toggle('active', b.dataset.target === target));
            $$('.m-nav-link').forEach(b => b.classList.toggle('active', b.dataset.target === target));
            $('#filterBar').classList.toggle('hidden', target !== 'tabTable' && target !== 'tabGraph');
            
            const titleMap = { 'tabInput': 'ডাটা এন্ট্রি', 'tabTable': 'রিপোর্ট শিট', 'tabGraph': 'বিশ্লেষণ', 'tabPin': 'সেটিংস' };
            $('#viewTitle').textContent = titleMap[target] || "ড্যাশবোর্ড";
            
            if (window.innerWidth < 768) $('#sidebar').classList.add('collapsed');
            if (target === 'tabGraph') updateCharts([...allEntries]);
        };
    });

    // 3. Filters & Data
    ['yearSelect', 'monthSelect', 'startDate', 'endDate'].forEach(id => {
        if ($('#' + id)) $('#' + id).onchange = renderDashboard;
    });

    $('#resetFilters').onclick = () => {
        ['yearSelect', 'monthSelect', 'startDate', 'endDate'].forEach(id => { if ($('#' + id)) $('#' + id).value = ""; });
        renderDashboard();
        showToast("ফিল্টার রিসেট করা হয়েছে");
    };

// 🔄 4. Refresh Button Animation & Success Message
const refreshBtn = document.getElementById('refreshDataBtn');

if (refreshBtn) {
    refreshBtn.addEventListener('click', async function() {
        const icon = this.querySelector('i');
        
        if (icon) {
            // ১. এনিমেশন শুরু (infinite লুপ দিলে ভালো হয় যতক্ষণ ডাটা লোড হচ্ছে)
            icon.classList.add('spinning');
            
            try {
                // ২. ডাটা ফেচ হওয়া পর্যন্ত অপেক্ষা করবে
                await fetchData(); 

                // ৩. ডাটা চলে আসার পর এনিমেশন ক্লাস রিমুভ করা
                icon.classList.remove('spinning');
                showToast("ডাটা রিফ্রেশ করা হয়েছে", "success");

            } catch (error) {
                icon.classList.remove('spinning');
                showToast("ডাটা রিফ্রেশ করতে সমস্যা হয়েছে", "error");
            }
        }
    });
}



    // 5. Notifications
    $('#addTimeBtn').onclick = () => {
        const t = $('#notifTime').value;
        if (!t) return showToast("সময় নির্বাচন করুন", "error");
        if (notifTimes.includes(t)) return showToast("এই সময়টি আগে থেকেই আছে", "error");
        notifTimes.push(t);
        localStorage.setItem('fmt_notifs', JSON.stringify(notifTimes));
        renderReminders();
        showToast(`নতুন রিমাইন্ডার যোগ হয়েছে (${format12hr(t)})`, "success");
    };
    
    const nToggle = $('#notifEnableToggle');
    if (nToggle) {
        nToggle.checked = notifEnabled;
        nToggle.onchange = (e) => {
            notifEnabled = e.target.checked;
            localStorage.setItem('fmt_notif_status', notifEnabled);
            showToast(notifEnabled ? "নোটিফিকেশন চালু" : "নোটিফিকেশন বন্ধ");
            if(notifEnabled) requestNotifPermission();
        };
    }

    // 6. Settings Buttons
    $('#changePinBtn').onclick = changePin;
    $('#factoryResetBtn').onclick = showResetStep1;
    if($('#closeSidebar')) $('#closeSidebar').onclick = () => $('#sidebar').classList.add('collapsed');
    if($('#mainLogo')) $('#mainLogo').onclick = () => $('#sidebar').classList.toggle('collapsed');
}

function renderReminders() {
    const list = $('#notifList');
    if (!list) return;
    list.innerHTML = notifTimes.length ? notifTimes.sort().map((t, i) => `
        <div class="rem-item"> 
            <span class="rem-time"><i class="far fa-clock"></i> ${format12hr(t)}</span> 
            <button onclick="confirmDelRem(${i})" class="del-rem"><i class="fas fa-trash-can"></i></button> 
        </div>`).join('') : '<p class="empty-msg">কোন রিমাইন্ডার সেট করা নেই</p>';
}

function updateDateDisplay() {
    const now = new Date();
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    if ($('#dateSub')) $('#dateSub').textContent = now.toLocaleDateString('bn-BD', options);
}

// 🚀 APP STARTUP
document.addEventListener('DOMContentLoaded', () => {
    updatePinSettingsUI();
    setupEvents();
    renderReminders();
    updateDateDisplay();
    
    // Load Theme
    if (localStorage.getItem('fmt_theme') === 'dark') syncTheme(true);
    
    // Initial Focus for Desktop
    if(window.innerWidth > 992) {
        const input = $('#pinInput');
        if(input) input.focus();
    }
});
