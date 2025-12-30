/**
 * 📊 FMT TRACKER PRO - FINAL STABLE VERSION
 * ---------------------------------------------------
 * Storage: Settings (Local Storage), Data (Google Sheet)
 * Features: Offline Settings, Online Data, Chart, Notifications
 * FIXES: 
 * 1. Data processing logic restored for robust data fetching.
 * 2. Custom Date/Time input logic verified and cleared on submit.
 * 3. Header date format updated to "Date Month, Year (Day)".
 * 4. CRITICAL FIX: Ensure 'time' payload is always sent in HH:mm (24hr) format
 * to prevent Google Apps Script from defaulting to current time.
 */

// 🌐 1. CONFIGURATION
const RAW_URL = "Y2V4ZS9tMjMtbV82V0otYmJrVzgxblNtUDljOV9HNHAtVnU0ZEV5VGFjZzMzV0ZiY1ZEVHhZaGo3MWRwaGQ2X3RiV3FKbnpiY3lmS0Evcy9zb3JjYW0vbW9jLmVsZ29vZy50cGlyY3MvLzpzcHR0aA=="; 

// 🛠️ DOM UTILITIES
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

// --- 📦 GLOBAL STATE MANAGEMENT ---
let allEntries = [];
let branchChart = null;
let centralChart = null;

// Local Storage Keys
const LS_PIN = 'fmt_pin';
const LS_THEME = 'fmt_theme';
const LS_NOTIFS = 'fmt_notifs';
const LS_NOTIF_STATUS = 'fmt_notif_status';
const LS_PIN_AUTO = 'fmt_pin_auto';

// State Variables (Loaded from Local Storage)
let notifTimes = JSON.parse(localStorage.getItem(LS_NOTIFS)) || [];
let notifEnabled = JSON.parse(localStorage.getItem(LS_NOTIF_STATUS)) === true;
let autoPinVerify = JSON.parse(localStorage.getItem(LS_PIN_AUTO)) !== false; // Default true
let lastCheckedMinute = -1;

// Encryption Helper
function decrypt(text){ return atob(text).split('').reverse().join(''); }
const getApiUrl = () => RAW_URL.includes("http") ? RAW_URL : decrypt(RAW_URL);

// PIN Helper (Local Priority -> Default "000000")
const getSavedPin = () => localStorage.getItem(LS_PIN) || "000000"; 


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

// Helper to convert 24hr time (HH:mm) for display purposes only (notifications/modals)
function format12hr(time24) {
    if (!time24) return "N/A";
    let [hrs, mins] = time24.split(':');
    hrs = parseInt(hrs);
    const period = hrs >= 12 ? 'PM' : 'AM';
    hrs = hrs % 12 || 12; 
    mins = String(mins).padStart(2, '0');
    return `${hrs}:${mins} ${period}`;
}

// FIX for Extra 2: Date Header Format
function updateDateDisplay() {
    const now = new Date();
    const dateOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    const dayOptions = { weekday: 'long' };
    
    const datePart = now.toLocaleDateString('bn-BD', dateOptions); 
    const dayPart = now.toLocaleDateString('bn-BD', dayOptions); 
    
    const dateStr = `${datePart} (${dayPart})`;

    if ($('#dateSub')) $('#dateSub').textContent = dateStr;
}


// 🔐 3. SECURITY & PIN MANAGEMENT 🔐

function handlePinInput(val) {
    const dots = $$('.v-dot');
    const isVisible = $('#pinViewToggle') ? $('#pinViewToggle').checked : false;
    
    dots.forEach((dot, i) => {
        dot.innerHTML = ""; 
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
        }, 1200); 
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

window.toggleLockPinView = () => {
    const input = $('#pinInput');
    handlePinInput(input.value); 
};

function changePin() {
    const oldPin = $('#oldPinSet').value;
    const newPin = $('#newPinSet').value;
    const confirmPin = $('#confirmPinSet').value;

    if (oldPin !== getSavedPin()) return showToast("বর্তমান পিন সঠিক নয়", "error");
    if (newPin.length !== 6 || !/^\d+$/.test(newPin)) return showToast("নতুন পিন শুধুমাত্র ৬ ডিজিটের সংখ্যা হতে হবে", "error");
    if (newPin !== confirmPin) return showToast("নতুন পিন দুটি মেলেনি", "error");

    localStorage.setItem(LS_PIN, newPin);
    showToast("পিন সফলভাবে পরিবর্তন হয়েছে", "success");
    $('#oldPinSet').value = ""; $('#newPinSet').value = ""; $('#confirmPinSet').value = "";
}


// 📡 4. DATA FETCHING & SUBMITTING 📡

async function fetchData() {
    try {
        const refreshIcon = $('#refreshDataBtn i');
        if(refreshIcon) refreshIcon.classList.add('spinning'); 

        const res = await fetch(getApiUrl());
        if (!res.ok) throw new Error("Network response was not ok");
        
        const rawData = await res.json();

        // Handle simple array response or wrapped response
        const dataArray = Array.isArray(rawData) ? rawData : (rawData.results || []);

        // Process Data: Filter, convert to number, and assign a chronological serial if missing
        allEntries = dataArray
            .filter(d => d.date) // Filter out rows without a date
            .map((entry, index) => ({
                ...entry,
                // Ensure serial exists and is a number. Use index+1 as fallback chronological serial.
                serial: Number(entry.serial) || (index + 1), 
                branch: Number(entry.branch),
                central: Number(entry.central)
            }))
            // Sort by Serial/Date (Oldest First) for chart rendering (chronological)
            .sort((a, b) => a.serial - b.serial); 
            
        // Populate Year Filter Dynamically
        const years = [...new Set(allEntries.map(d => String(d.date).split('-')[0]))].filter(y => y && y.length === 4);
        const yearSel = $('#yearSelect');
        if (yearSel) {
             const currentVal = yearSel.value;
             yearSel.innerHTML = '<option value="">সব বছর</option>' + 
                 years.sort().map(y => `<option value="${y}" ${y === currentVal ? 'selected' : ''}>${y}</option>`).join('');
        }
        
        renderDashboard();
        
        if(refreshIcon) refreshIcon.classList.remove('spinning');

    } catch (e) {
        console.error(e);
        $('#refreshDataBtn i')?.classList.remove('spinning');
        showToast("ডাটা লোড করতে সমস্যা হয়েছে", "error");
    }
}

// ** DATA SUBMISSION LOGIC (CRITICAL FIX APPLIED HERE) **
async function submitEntry() {
    const branch = $('#branchVal').value;
    const central = $('#centralVal').value;
    const useCurrent = $('#useCurrentTimeToggle').checked;
    
    if (!branch || !central) return showToast("উভয় মেরিট ইনপুট দিন", "error");

    let datePayload, timePayload;

    if (useCurrent) {
        // Auto Date/Time (Current Time)
        const now = new Date();
        // Date in YYYY-MM-DD format
        datePayload = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
        
        // FIX: Time in HH:mm (24hr) format
        timePayload = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');

    } else {
        // Manual Date/Time Logic
        datePayload = $('#manualDate').value; // YYYY-MM-DD
        timePayload = $('#manualTime').value; // HH:mm (24h)
        
        if (!datePayload || !timePayload) return showToast("তারিখ ও সময় নির্বাচন করুন", "error");
        
        // FIX: No conversion needed, sending raw 24hr time (timePayload)
    }

    const payload = {
        type: 'entry',
        branch: branch,
        central: central,
        date: datePayload,
        time: timePayload
    };

    // UI Loading State
    const submitBtn = $('#saveEntry');
    const refreshIcon = $('#refreshDataBtn i');
    const originalBtnText = submitBtn.textContent;
    
    submitBtn.classList.add('btn-loading');
    submitBtn.textContent = ""; 
    refreshIcon.classList.add('spinning');

    try {
        await fetch(getApiUrl(), {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        // FIX for Extra 1: Clear ALL Inputs on Success
        $('#branchVal').value = "";
        $('#centralVal').value = "";
        if(!useCurrent) { // Only clear date/time if custom was used
            $('#manualDate').value = ""; 
            $('#manualTime').value = "";
        }
        
        // Refresh Data
        await fetchData();
        showToast("তথ্য সফলভাবে জমা হয়েছে!", "success");

    } catch (e) {
        console.error(e);
        showToast("ডাটা পাঠাতে ব্যর্থ হয়েছে", "error");
    } finally {
        submitBtn.classList.remove('btn-loading');
        submitBtn.textContent = originalBtnText;
        refreshIcon.classList.remove('spinning');
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

    if (year) data = data.filter(d => String(d.date).startsWith(year));
    if (month) data = data.filter(d => String(d.date).split('-')[1] === month);
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

    // Show latest on top for table (Reversing chronologically-sorted data)
    [...data].reverse().forEach((d) => {
        // Since d.time comes from the sheet, it is displayed as is (e.g. 10:20)
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
    const bValues = allEntries.map(d => parseInt(d.branch)).filter(Boolean); 
    const cValues = allEntries.map(d => parseInt(d.central)).filter(Boolean);

    const setVal = (id, val) => { if ($(id)) $(id).textContent = val; };
    setVal('#sumLastDate', last.date);
    setVal('#sumBranch', last.branch);
    setVal('#sumCentral', last.central);
    setVal('#sumBestBranch', bValues.length ? Math.min(...bValues) : "-");
    setVal('#sumBestCentral', cValues.length ? Math.min(...cValues) : "-");
    setVal('#sumTotal', data.length);
}

// ⚙️ HELPER FUNCTION: Formats YYYY-MM-DD HH:mm to DD/MM/YY (h:mm AM/PM)
function formatDateTimeForTooltip(dateStr, timeStr) {
    // Clean potential single quote from Apps Script fix
    const cleanTimeStr = timeStr.replace(/^'/, ''); 

    // Date Format: DD/MM/YY
    if (!dateStr || dateStr.length < 10) {
        // If date is missing or invalid, return time only
        return cleanTimeStr; 
    }
    const parts = dateStr.split('-'); // Assumes YYYY-MM-DD format
    const year = parts[0].substring(2); // Last 2 digits of year
    const month = parts[1];
    const day = parts[2];
    const formattedDate = `${day}/${month}/${year}`; 

    // Time Format: 12-hour AM/PM
    if (!cleanTimeStr) {
        return formattedDate;
    }
    const [hours, minutes] = cleanTimeStr.split(':').map(Number);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12; // Convert 0 to 12
    const formattedTime = `${hour12}:${String(minutes).padStart(2, '0')} ${ampm}`;

    return `${formattedDate} (${formattedTime})`;
}

// 📈 CHART LOGIC
function updateCharts(data) {
    if (!window.Chart) return;
    
    // Chart Data must be Oldest First for chronological X-axis
    const chartData = [...data]; 
    const labels = chartData.map(d => `R-${d.serial}`); // Serial for X-axis label

    // Base Chart Options (shared by both)
    const baseChartOptions = {
        responsive: true, 
        maintainAspectRatio: false, 
        layout: { padding: { top: 10, bottom: 10, left: 10, right: 10 } },
        interaction: { mode: 'index', intersect: false },
        scales: {
            y: {
                grid: { color: 'rgba(0,0,0,0.05)', drawBorder: false },
                ticks: { font: { family: 'Inter', size: 11 } }
            },
            x: { 
                grid: { display: false },
                ticks: { autoSkip: true, maxTicksLimit: 12, maxRotation: 0, font: { family: 'Inter', size: 10 } }
            }
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                // Aesthetics & Size Fixes
                backgroundColor: 'rgba(30, 41, 59, 0.98)', 
                titleColor: '#f8fafc',                    
                bodyColor: '#cbd5e1',                     
                borderWidth: 2,                             
                cornerRadius: 6,                            
                padding: 10,                                
                displayColors: false,                       // ⭐ FIX 1: Hides the color box
                caretSize: 5,                               
                caretPadding: 5,
                
                titleFont: {
                    family: 'Inter',
                    size: 13, // Slightly increased size for the main title
                    weight: '600' // Bold title (Serial Number)
                },
                bodyFont: {
                    family: 'Inter',
                    size: 12 // Slightly smaller size for date/time and merit
                },

                // Layout Control (Callbacks)
                callbacks: {
                    // ⭐ FIX 3.1: First line - Only Serial Number (Title)
                    title: (ctx) => {
                        return `সিরিয়াল নম্বর: ${ctx[0].label.replace('R-', '')}`;
                    },
                    
                    // Body Lines
                    beforeBody: (ctx) => {
                        const serial = ctx[0].label.replace('R-', '');
                        const entry = chartData.find(d => String(d.serial) === serial);
                        
                        if (entry && entry.date) {
                            // ⭐ FIX 3.2 & 2: Second line - Date and Time (DD/MM/YY (h:mm AM/PM))
                            const formattedDateTime = formatDateTimeForTooltip(entry.date, entry.time);
                            // Returns an array of strings, which Chart.js displays before the main label
                            return [formattedDateTime];
                        }
                        return [];
                    },

                    // ⭐ FIX 3.3: Third line - Branch or Central Merit (Label)
                    label: (ctx) => {
                        const datasetLabel = ctx.dataset.label; // 'ব্রাঞ্চ মেরিট' or 'সেন্ট্রাল মেরিট'
                        return `${datasetLabel}: ${ctx.raw}`;
                    },
                    afterBody: (ctx) => {
                        return []; // Clear any residual after body text
                    }
                }
            }
        }
    };
    
    // Custom function to create options with dynamic border color
    const getChartOptions = (color) => {
        const options = JSON.parse(JSON.stringify(baseChartOptions));
        options.plugins.tooltip.borderColor = color;
        return options;
    };
    
    // --- Render Branch Chart ---
    if (branchChart) branchChart.destroy();
    const branchColor = '#6366f1';
    branchChart = new Chart($('#branchChart'), {
        type: 'line',
        data: { labels, datasets: [{ 
            label: 'ব্রাঞ্চ মেরিট', 
            data: chartData.map(d => d.branch), 
            borderColor: branchColor, borderWidth: 2.5, pointRadius: 4, pointHoverRadius: 6,
            tension: 0.2, fill: true, backgroundColor: 'rgba(99, 102, 241, 0.1)'
        }] },
        options: getChartOptions(branchColor)
    });

    // --- Render Central Chart ---
    if (centralChart) centralChart.destroy();
    const centralColor = '#10b981';
    centralChart = new Chart($('#centralChart'), {
        type: 'line',
        data: { labels, datasets: [{ 
            label: 'সেন্ট্রাল মেরিট',
            data: chartData.map(d => d.central), 
            borderColor: centralColor, borderWidth: 2.5, pointRadius: 4, pointHoverRadius: 6,
            tension: 0.2, fill: true, backgroundColor: 'rgba(16, 185, 129, 0.1)'
        }] },
        options: getChartOptions(centralColor)
    });
}


// 🧩 6. MODALS & POPUPS (DESIGN RESTORED) 🧩

function openModal(html) {
    const modal = $('#standardModal');
    const content = $('#modalContent');
    content.className = "reset-popup-premium"; 
    content.innerHTML = html;
    modal.classList.remove('hidden');
}

function closeModal() { $('#standardModal').classList.add('hidden'); }

// Step 1: Warning (Restored 3 bullet points)
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
        // Clear Local Storage Only
        localStorage.clear();
        showToast("সিস্টেম রিসেট করা হয়েছে", "success");
        setTimeout(() => location.reload(), 1500);
    } else {
        showToast("ভুল পিন কোড!", "error");
    }
}

// Reminder Deletion Confirmation (Restored Design)
window.confirmDelRem = (i) => {
    const timeRaw = notifTimes[i]; // Stored in 24hr format
    const timeDisplay = format12hr(timeRaw); // Converted to 12hr for display
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
    localStorage.setItem(LS_NOTIFS, JSON.stringify(notifTimes));
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
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const currentTime = `${hours}:${mins}`; // 24hr format
    
    const currentMinuteVal = now.getHours() * 60 + now.getMinutes();
    if (currentMinuteVal === lastCheckedMinute) return;
    lastCheckedMinute = currentMinuteVal;

    if (notifTimes.includes(currentTime)) {
        if (Notification.permission === "granted") {
            new Notification("FMT Tracker Pro", {
                body: `আপনার রিপোর্ট চেক করার সময় হয়েছে (${format12hr(currentTime)})।`,
                icon: "https://cdn-icons-png.flaticon.com/512/3119/3119338.png"
            });
        } else {
            showToast(`⏰ রিমাইন্ডার: রিপোর্ট চেক করুন (${format12hr(currentTime)})`);
        }
    }
}
setInterval(checkNotifications, 5000); 


// ⚙️ 8. INITIALIZATION & EVENTS ⚙️

function syncThemeUI(isDark) {
    document.body.classList.toggle('dark-theme', isDark);
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

    const pinInput = $('#pinInput');
    if(pinInput) {
        pinInput.addEventListener('input', (e) => handlePinInput(e.target.value));
        pinInput.addEventListener('blur', () => {}); // Focus backup
    }
    
    document.addEventListener('keydown', (e) => {
        if (!$('#pinGate').classList.contains('hidden')) {
             const input = $('#pinInput');
             if(document.activeElement !== input) input.focus();
             if(e.key === 'Enter') processPin(input.value);
        }
    });
    
    // Focus Wrapper
    const pinWrapper = document.querySelector('.pin-box-wrapper');
    if (pinWrapper) {
        pinWrapper.addEventListener('click', () => {
            const input = document.getElementById('pinInput');
            if(input) input.focus();
        });
    }

    // Settings: Auto PIN
    const pinAutoTgl = $('#pinAutoToggleSet');
    if (pinAutoTgl) {
        pinAutoTgl.onchange = (e) => {
            autoPinVerify = e.target.checked;
            localStorage.setItem(LS_PIN_AUTO, autoPinVerify);
            updatePinSettingsUI();
            showToast(autoPinVerify ? "অটো পিন ভেরিফাই চালু" : "ম্যানুয়াল পিন ভেরিফাই চালু");
        };
    }

    if ($('#pinViewToggle')) {
        $('#pinViewToggle').onchange = toggleLockPinView;
    }
    
    // Settings: Theme
    const handleTheme = (isDark) => {
        syncThemeUI(isDark);
        localStorage.setItem(LS_THEME, isDark ? 'dark' : 'light');
    };
    if ($('#pinThemeToggle')) $('#pinThemeToggle').onclick = () => handleTheme(!document.body.classList.contains('dark-theme'));
    $('#themeToggle').onclick = () => handleTheme(!document.body.classList.contains('dark-theme'));
    if ($('#darkToggleSet')) $('#darkToggleSet').onchange = (e) => handleTheme(e.target.checked);

    // 2. Navigation
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
            if (target === 'tabGraph') renderDashboard();
        };
    });

    // 3. Filters
    ['yearSelect', 'monthSelect', 'startDate', 'endDate'].forEach(id => {
        if ($('#' + id)) $('#' + id).onchange = renderDashboard;
    });
    $('#resetFilters').onclick = () => {
        ['yearSelect', 'monthSelect', 'startDate', 'endDate'].forEach(id => { if ($('#' + id)) $('#' + id).value = ""; });
        renderDashboard();
        showToast("ফিল্টার রিসেট করা হয়েছে");
    };

    // 4. Refresh Button
    const refreshBtn = document.getElementById('refreshDataBtn');
    if (refreshBtn) {
        refreshBtn.onclick = async function() {
             await fetchData(); 
             showToast("ডাটা রিফ্রেশ করা হয়েছে", "success");
        };
    }

    // 5. Notifications
    $('#addTimeBtn').onclick = () => {
        const t = $('#notifTime').value;
        if (!t) return showToast("সময় নির্বাচন করুন", "error");
        if (notifTimes.includes(t)) return showToast("এই সময়টি আগে থেকেই আছে", "error");
        notifTimes.push(t);
        localStorage.setItem(LS_NOTIFS, JSON.stringify(notifTimes));
        renderReminders();
        showToast(`নতুন রিমাইন্ডার যোগ হয়েছে (${format12hr(t)})`, "success");
    };
    
    const nToggle = $('#notifEnableToggle');
    if (nToggle) {
        nToggle.checked = notifEnabled;
        nToggle.onchange = (e) => {
            notifEnabled = e.target.checked;
            localStorage.setItem(LS_NOTIF_STATUS, notifEnabled);
            showToast(notifEnabled ? "নোটিফিকেশন চালু" : "নোটিফিকেশন বন্ধ");
            if(notifEnabled) requestNotifPermission();
        };
    }

    // 6. Settings Buttons
    $('#changePinBtn').onclick = changePin;
    $('#factoryResetBtn').onclick = showResetStep1;
    if($('#closeSidebar')) $('#closeSidebar').onclick = () => $('#sidebar').classList.add('collapsed');
    if($('#mainLogo')) $('#mainLogo').onclick = () => $('#sidebar').classList.toggle('collapsed');

    // 7. Input Toggle
    const toggle = $('#useCurrentTimeToggle');
    const manualArea = $('#manualInputArea');
    if (toggle && manualArea) {
        toggle.onchange = (e) => {
            manualArea.classList.toggle('hidden', e.target.checked);
        };
        // Set initial state on load
        manualArea.classList.toggle('hidden', toggle.checked);
    }
    // 8. Submit
    $('#saveEntry').onclick = submitEntry;
    
    // 9. Infinite Scroll Listener (Fixed)
    window.addEventListener('scroll', () => {
        // ১. যদি 'Pages' মোড হয়, তাহলে কাজ করবে না
        if (pMode !== 'infinite') return;
        
        // ২. যদি সব ডাটা লোড হয়ে গিয়ে থাকে ('End Message' দেখাচ্ছে), তাহলে কাজ করবে না
        if (!$('#endMessage').classList.contains('hidden')) return;

        // ৩. স্ক্রল পজিশন চেক (ফুটারের একটু আগে লোড শুরু হবে)
        const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
        
        if (scrollTop + clientHeight >= scrollHeight - 50) {
            loadMoreInfinite();
        }
    });

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


// 🚀 APP STARTUP
document.addEventListener('DOMContentLoaded', () => {
    // UI Load
    updatePinSettingsUI();
    setupEvents();
    renderReminders();
    updateDateDisplay(); 
    
    // Theme Load
    if (localStorage.getItem(LS_THEME) === 'dark') syncThemeUI(true);
    
    // Initial Focus
    if(window.innerWidth > 992) $('#pinInput')?.focus();
});


// --- 1. PAGINATION STATE ---
// global variables (মেইন ফাইলে ডিক্লেয়ার করা থাকলে let বাদ দিয়ে লিখুন)
pMode = localStorage.getItem('pMode') || 'infinite'; 
pRowsPerPage = parseInt(localStorage.getItem('pRowsPerPage')) || 10;
pCurrentPage = 1;
pIsLoading = false;
pCurrentData = []; 
pDisplayedCount = 0;

// --- 2. INITIALIZE UI ON LOAD ---
function initPaginationSettings() {
    // সারি সংখ্যা ড্রপডাউন সেট করা
    const rowSelector = document.querySelector('#rowsPerPage');
    if (rowSelector) rowSelector.value = pRowsPerPage;
    
    // বাটন একটিভ স্টেট সেট করা
    syncActiveButton();
}
document.addEventListener('DOMContentLoaded', initPaginationSettings);

// একটিভ বাটন ভিজ্যুয়ালি আপডেট করার ফাংশন
function syncActiveButton() {
    const buttons = document.querySelectorAll('.p-btn');
    buttons.forEach(btn => {
        // বাটনের onclick অ্যাট্রিবিউটে আমাদের pMode আছে কিনা চেক করা
        // উদাহরণ: 'setPaginationMode('infinite')' এ 'infinite' আছে কিনা
        const btnOnClick = btn.getAttribute('onclick') || "";
        
        if (btnOnClick.includes(`'${pMode}'`)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// --- 3. UPDATED TABLE RENDERING ---
function updateTable(data) {
    pCurrentData = [...data].reverse();
    
    const endMsg = document.querySelector('#endMessage');
    const infLoader = document.querySelector('#infiniteLoader');
    const tableRows = document.querySelector('#tableRows');
    const pagControls = document.querySelector('#paginationControls');

    if (endMsg) endMsg.classList.add('hidden');
    if (infLoader) infLoader.classList.add('hidden');

    if (pMode === 'infinite') {
        pDisplayedCount = 0;
        if (tableRows) tableRows.innerHTML = ""; 
        if (pagControls) pagControls.classList.add('hidden');
        loadMoreInfinite(); 
    } else {
        if (pagControls) pagControls.classList.remove('hidden');
        renderPage(1); 
    }
}

// --- 4. INFINITE SCROLL LOGIC ---
function loadMoreInfinite() {
    if (pIsLoading || pDisplayedCount >= pCurrentData.length) return;

    pIsLoading = true;
    const loader = document.querySelector('#infiniteLoader');
    if (loader) loader.classList.remove('hidden');

    setTimeout(() => {
        const nextBatch = pCurrentData.slice(pDisplayedCount, pDisplayedCount + pRowsPerPage);
        renderRows(nextBatch, true); 
        
        pDisplayedCount += nextBatch.length;
        pIsLoading = false;
        
        if (loader) loader.classList.add('hidden');

        const endMsg = document.querySelector('#endMessage');
        if (pDisplayedCount >= pCurrentData.length && pCurrentData.length > 0) {
            if (endMsg) endMsg.classList.remove('hidden');
        }
    }, 500); 
}

// --- 5. PAGINATION (PAGES) LOGIC ---
function renderPage(page) {
    pCurrentPage = page;
    const start = (page - 1) * pRowsPerPage;
    const pageData = pCurrentData.slice(start, start + pRowsPerPage);
    
    const tableRows = document.querySelector('#tableRows');
    if (tableRows) tableRows.innerHTML = ""; 
    renderRows(pageData, false);
    renderPaginationControls();

    const endMsg = document.querySelector('#endMessage');
    const totalPages = Math.ceil(pCurrentData.length / pRowsPerPage);
    if (endMsg) {
        if (page === totalPages && pCurrentData.length > 0) {
            endMsg.classList.remove('hidden');
        } else {
            endMsg.classList.add('hidden');
        }
    }
}

// --- 6. CONTROLS & LOCAL STORAGE ---
function setPaginationMode(mode) {
    if (pMode === mode) return;
    
    pMode = mode;
    localStorage.setItem('pMode', mode); 
    
    syncActiveButton(); 

    // ডাটা রি-রেন্ডার করার আগে একবার রিভার্স করে মেইন অর্ডারে আনা
    const originalOrder = [...pCurrentData].reverse();
    updateTable(originalOrder); 
}

function handleRowsChange(val) {
    pRowsPerPage = parseInt(val);
    localStorage.setItem('pRowsPerPage', pRowsPerPage); 
    
    const originalOrder = [...pCurrentData].reverse();
    updateTable(originalOrder);
}

// --- 7. COMMON ROW RENDERER ---
function renderRows(data, append) {
    const tbody = document.querySelector('#tableRows');
    if (!tbody) return;

    if (!data.length && !append) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">কোন রিপোর্ট পাওয়া যায়নি</td></tr>';
        return;
    }

    const html = data.map(d => `
        <tr class="fade-in">
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
        </tr>`).join('');

    if (append) tbody.insertAdjacentHTML('beforeend', html);
    else tbody.innerHTML = html;
}

// --- 8. PAGINATION CONTROLS GENERATOR ---
function renderPaginationControls() {
    const container = document.querySelector('#paginationControls');
    if (!container) return;

    const totalPages = Math.ceil(pCurrentData.length / pRowsPerPage);
    if (totalPages <= 1) { container.innerHTML = ""; return; }

    let html = `<button class="page-num-btn" onclick="renderPage(${pCurrentPage - 1})" ${pCurrentPage === 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i></button>`;

    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= pCurrentPage - 1 && i <= pCurrentPage + 1)) {
            html += `<button class="page-num-btn ${i === pCurrentPage ? 'active' : ''}" onclick="renderPage(${i})">${i}</button>`;
        } else if ((i === pCurrentPage - 2 && pCurrentPage > 3) || (i === pCurrentPage + 2 && pCurrentPage < totalPages - 2)) {
            if (!html.endsWith('...')) html += `<span class="pagination-dots">...</span>`;
        }
    }

    html += `<button class="page-num-btn" onclick="renderPage(${pCurrentPage + 1})" ${pCurrentPage === totalPages ? 'disabled' : ''}><i class="fas fa-chevron-right"></i></button>`;
    container.innerHTML = html;
}
