/* ==========================================================================
   FMT TRACKER PRO - ULTIMATE VERSION (V19.3)
   ========================================================================== */

/* ==========================
🌐 Section: 01 Configuration
========================== */

// ---- ( Configuration ) ----
const RAW_URL = "https://script.google.com/macros/s/AKfycbymcut_9IPTR4RacT6We1eTWmveM58kyhICxrHl109tXFfbdbFOlyHo8ji5ZB3klWA/exec";

// ---- ( DOM Helpers ) ----
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

// ---- ( Encryption & Formatting ) ----
function decrypt(text) { return atob(text).split('').reverse().join(''); }
const getApiUrl = () => RAW_URL + "?mode=all";

// বাংলা নাম্বার কনভার্টার
function toBanglaNumber(num) {
    const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(num).replace(/\d/g, digit => banglaDigits[digit]);
}

function format12hr(time24) {
    if (!time24) return "N/A";
    let [hrs, mins] = time24.split(':');
    hrs = parseInt(hrs);
    const period = hrs >= 12 ? 'PM' : 'AM';
    hrs = hrs % 12 || 12;
    mins = String(mins).padStart(2, '0');
    return `${toBanglaNumber(hrs)}:${toBanglaNumber(mins)} ${period}`;
}

function formatDate(dateStr) {
    if (!dateStr) return '--/--/----';
    const [year, month, day] = dateStr.split('-');
    return `${toBanglaNumber(day)}/${toBanglaNumber(month)}/${toBanglaNumber(year)}`;
}

function updateDateDisplay() {
    const now = new Date();
    const dateOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    const dayOptions = { weekday: 'long' };
    const dateStr = `${now.toLocaleDateString('bn-BD', dateOptions)} (${now.toLocaleDateString('bn-BD', dayOptions)})`;
    if ($('#dateSub')) $('#dateSub').textContent = dateStr;
    return now;
}

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

// ---- ( Auto Refresh & Inactivity Timer ) ----
let lastActivity = Date.now();
let refreshInterval;
let inactivityTimer;

function resetInactivityTimer() {
    lastActivity = Date.now();
    if (inactivityTimer) clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        if (!$('#pinGate').classList.contains('hidden')) return;
        const now = Date.now();
        if (now - lastActivity > 60000) { // 1 minute (60000ms)
            showToast("নিষ্ক্রিয় থাকার কারণে পুনরায় লগইন প্রয়োজন", "error");
            $('#pinGate').classList.remove('hidden');
            $('#app').classList.add('hidden');
            $('#pinInput').value = '';
            renderPinDots('');
        }
    }, 60000); // 1 minute
}

function setupAutoRefresh() {
    // 10 মিনিট পর পর ডাটা রিফ্রেশ
    if (refreshInterval) clearInterval(refreshInterval);
    refreshInterval = setInterval(async () => {
        if (!$('#pinGate').classList.contains('hidden')) return;
        await fetchAllData();
        updateDateDisplay();
        showToast("ডাটা স্বয়ংক্রিয়ভাবে আপডেট হয়েছে", "success");
    }, 600000); // 10 minutes

    // প্রতিদিন 12:00 AM এ ডেট আপডেট
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    const timeUntilMidnight = midnight - now;
    
    setTimeout(() => {
        updateDateDisplay();
        setInterval(updateDateDisplay, 86400000); // 24 hours
    }, timeUntilMidnight);
}

// ---- ( Device Theme Detection ) ----
function detectDeviceTheme() {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedTheme = localStorage.getItem(LS_THEME);
    
    if (!savedTheme) {
        // প্রথম লোডে ডিভাইস থিম অনুযায়ী সেট করো
        document.body.classList.toggle('dark-theme', prefersDark);
        localStorage.setItem(LS_THEME, prefersDark ? 'dark' : 'light');
        if ($('#darkToggleSet')) $('#darkToggleSet').checked = prefersDark;
    }
}

/* ==========================
📦 Section: 02 Global State
========================== */

// ---- ( State Variables ) ----
let allEntries = [];
let branchChart = null;
let centralChart = null;
let subjectChart = null;
let subjectBranchChart = null;
let subjectCentralChart = null;
let deferredPrompt; 
let isOfflineBannerDismissed = false;
let appMode = localStorage.getItem('appMode') || 'course';

// ---- ( Local Storage Keys ) ----
const LS_PIN = 'fmt_pin';
const LS_THEME = 'fmt_theme';
const LS_NOTIFS = 'fmt_notifs';
const LS_NOTIF_STATUS = 'fmt_notif_status';
const LS_PIN_AUTO = 'fmt_pin_auto';
const LS_DATA_CACHE = "fmt_data_cache";
const LS_SUBJECT_CACHE = "subject_data_cache";
const LS_SHOW_ONLY_MARKS = 'showOnlyWithMarks';
const LS_INCLUDE_FOURTH = 'includeFourthSubject';
const LS_FOURTH_SUBJECT = 'fourthSubject';
const LS_LAST_REFRESH = 'last_data_refresh';

// ---- ( User Preferences ) ----
let notifTimes = JSON.parse(localStorage.getItem(LS_NOTIFS)) || [];
let notifEnabled = JSON.parse(localStorage.getItem(LS_NOTIF_STATUS)) === true;
let autoPinVerify = JSON.parse(localStorage.getItem(LS_PIN_AUTO)) !== false; 
let lastCheckedMinute = -1;
let showOnlyWithMarks = JSON.parse(localStorage.getItem(LS_SHOW_ONLY_MARKS)) === true;
let includeFourthSubject = JSON.parse(localStorage.getItem(LS_INCLUDE_FOURTH)) !== false;
let fourthSubject = localStorage.getItem(LS_FOURTH_SUBJECT) || 'জীববিজ্ঞান';

const getSavedPin = () => localStorage.getItem(LS_PIN) || "000000";

// ---- ( Pagination State ) ----
let pMode = localStorage.getItem("pMode") || "infinite";
let pRowsPerPage = parseInt(localStorage.getItem("pRowsPerPage")) || 10;
let pCurrentPage = 1;
let pIsLoading = false;
let pCurrentData = [];
let pDisplayedCount = 0;

// ---- ( Subject Data ) ----
let subjectData = [];
let subjectResults = [];
let subjectPMode = localStorage.getItem("subjectPMode") || "infinite";
let subjectPRowsPerPage = parseInt(localStorage.getItem("subjectPRowsPerPage")) || 10;
let subjectPCurrentPage = 1;
let subjectPIsLoading = false;
let subjectPCurrentData = [];
let subjectPDisplayedCount = 0;

/* ==========================
🔐 Section: 03 Security System
========================== */

// ---- ( UI Render Logic ) ----
function renderPinDots(val) {
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

// ---- ( Input Handlers ) ----
function handlePinInput(val) {
    renderPinDots(val);
    if (autoPinVerify && val.length === 6) {
        setTimeout(() => processPin(val), 50); 
    }
}

function handleKeyPress(key) {
    const input = $('#pinInput');
    let currentVal = input.value;

    if (key === 'BACK' || key === 'Backspace') {
        currentVal = currentVal.slice(0, -1);
    } else if (key === 'ENTER' || key === 'Enter') {
        processPin(currentVal);
        return;
    } else if (/^[0-9]$/.test(key)) {
        if (currentVal.length < 6) {
            currentVal += key;
        }
    }
    input.value = currentVal;
    handlePinInput(currentVal);
}

// ---- ( Verification Logic ) ----
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
            fetchAllData();
            requestNotifPermission();
            resetInactivityTimer();
            setupAutoRefresh();
        }, 1000); 
    } else {
        showToast("ভুল পিন! আবার চেষ্টা করুন", "error");
        lockBtn.classList.add('error-shake');
        if(navigator.vibrate) navigator.vibrate([80, 50, 80]); 
        setTimeout(() => {
            lockBtn.classList.remove('error-shake');
            $('#pinInput').value = "";
            renderPinDots("");
        }, 500); 
    }
}

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

window.toggleLockPinView = () => renderPinDots($('#pinInput').value);

/* ==========================
📡 Section: 04 Data Handling
========================== */

// ---- ( Smart Data Fetching ) ----
async function fetchAllData() {
    const offlineAlert = $("#offlineAlert");
    const refreshIcon = $('#refreshDataBtn i');
    
    if(refreshIcon) refreshIcon.classList.add('spinning'); 

    // Step 1: Load from Cache Immediately
    const cachedCourse = localStorage.getItem(LS_DATA_CACHE);
    const cachedSubject = localStorage.getItem(LS_SUBJECT_CACHE);

    if (cachedCourse) {
        allEntries = JSON.parse(cachedCourse);
        if (appMode === 'course') renderDashboard();
    }
    if (cachedSubject) {
        subjectData = JSON.parse(cachedSubject);
        processSubjectData();
    }

    try {
        // Step 2: Try Network Request
        const res = await fetch(getApiUrl());
        if (!res.ok) throw new Error("Network response was not ok");
        
        const rawData = await res.json();
        
        // Step 3: Process Course Data
        if (rawData.results || Array.isArray(rawData)) {
             const cData = Array.isArray(rawData) ? rawData : (rawData.results || []);
             allEntries = cData
                .filter(d => d.date)
                .map((entry, index) => ({
                    ...entry,
                    serial: Number(entry.serial) || (index + 1), 
                    branch: Number(entry.branch),
                    central: Number(entry.central)
                }))
                .sort((a, b) => b.serial - a.serial); // Reverse order for course table
             localStorage.setItem(LS_DATA_CACHE, JSON.stringify(allEntries));
        }

        // Step 4: Process Subject Data
        if (rawData.subjects) {
            subjectData = rawData.subjects.map(subject => ({
                serial: subject.serial,
                date: subject.date,
                subject: subject.subject,
                syllabus: subject.syllabus,
                total_marks: parseFloat(subject.total) || 0,
                obtained_marks: subject.obtained ? parseFloat(subject.obtained) : null,
                branch_merit: subject.branch ? parseInt(subject.branch) : null,
                central_merit: subject.central ? parseInt(subject.central) : null
            }));
            localStorage.setItem(LS_SUBJECT_CACHE, JSON.stringify(subjectData));
            processSubjectData();
        }
            
        // Step 5: Update UI & Hide Banner
        if (appMode === 'course') {
            renderDashboard();
            updateYearDropdown();
        } else {
            renderSubjectDashboard();
            updateSubjectYearDropdown();
        }
        
        if (offlineAlert) offlineAlert.classList.add("hidden");

    } catch (e) {
        console.log("Offline Mode Active:", e);
        if (!isOfflineBannerDismissed) {
            offlineAlert?.classList.remove("hidden");
        }
    } finally {
        if(refreshIcon) refreshIcon.classList.remove('spinning');
        localStorage.setItem(LS_LAST_REFRESH, new Date().toISOString());
    }
}

// ---- ( Helpers ) ----
function updateYearDropdown() {
    const years = [...new Set(allEntries.map(d => String(d.date).split('-')[0]))].filter(y => y && y.length === 4);
    const yearSel = $('#yearSelect');
    if (yearSel) {
         const currentVal = yearSel.value;
         yearSel.innerHTML = '<option value="">সব বছর</option>' + 
             years.sort().map(y => `<option value="${y}" ${y === currentVal ? 'selected' : ''}>${toBanglaNumber(y)}</option>`).join('');
    }
}

function processSubjectData() {
    if (showOnlyWithMarks) {
        subjectResults = subjectData.filter(item => item.obtained_marks !== null);
    } else {
        subjectResults = [...subjectData];
    }
    populateSubjectDropdown();
    populateSubjectFilter();
}

function populateSubjectDropdown() {
    const select = $('#subjectSelect');
    if (!select) return;
    
    select.innerHTML = '<option value="">বিষয় নির্বাচন করুন...</option>';
    
    subjectData.forEach(item => {
        const option = document.createElement('option');
        option.value = item.serial;
        const subjectName = item.subject;
        const shortName = subjectName.length > 20 ? subjectName.substring(0, 17) + '...' : subjectName;
        option.textContent = `${shortName} (${formatDate(item.date)})`;
        option.dataset.subject = item.subject;
        option.dataset.syllabus = item.syllabus;
        option.dataset.date = item.date;
        option.dataset.total = item.total_marks;
        option.dataset.obtained = item.obtained_marks || '';
        option.dataset.branch = item.branch_merit || '';
        option.dataset.central = item.central_merit || '';
        select.appendChild(option);
    });
}

function populateSubjectFilter() {
    const filter = $('#subjectFilter');
    if (!filter) return;
    
    // Get unique subjects properly
    const subjectsMap = {};
    subjectData.forEach(item => {
        subjectsMap[item.subject] = true;
    });
    
    const subjects = Object.keys(subjectsMap).sort();
    
    filter.innerHTML = '<option value="">সব বিষয়</option>' +
        subjects.map(sub => `<option value="${sub}">${sub}</option>`).join('');
}

function updateSubjectYearDropdown() {
    const years = [...new Set(subjectData.map(d => d.date.split('-')[0]))].filter(y => y && y.length === 4);
    const yearSel = $('#subjectYearSelect');
    if (yearSel) {
        yearSel.innerHTML = '<option value="">সব বছর</option>' + 
            years.sort().map(y => `<option value="${y}">${toBanglaNumber(y)}</option>`).join('');
    }
}

function updateSubjectInfoCard() {
    const select = $('#subjectSelect');
    const card = $('#subjectInfoCard');
    const option = select.options[select.selectedIndex];
    
    if (!select.value) {
        card.classList.add('hidden');
        return;
    }
    
    card.classList.remove('hidden');
    const subjectName = option.dataset.subject;
    const syllabus = option.dataset.syllabus || "সিলেবাস নেই";
    const date = formatDate(option.dataset.date);
    const totalMarks = parseFloat(option.dataset.total) || 0;
    const obtainedMarks = option.dataset.obtained ? parseFloat(option.dataset.obtained) : null;
    const branchMerit = option.dataset.branch || 'N/A';
    const centralMerit = option.dataset.central || 'N/A';
    
    // শতকরা হার গণনা
    const percentage = obtainedMarks !== null ? ((obtainedMarks / totalMarks) * 100).toFixed(1) : 'N/A';
    
    // GPA গণনা (এই বিষয়ের জন্য)
    const gpa = calculateSubjectGPA(obtainedMarks, totalMarks);
    
    // সম্পূর্ণ ডাটা আছে কিনা চেক
    const isComplete = obtainedMarks !== null && branchMerit !== 'N/A' && centralMerit !== 'N/A';
    
    // কার্ড কনটেন্ট আপডেট
    $('#selectedSubjectName').textContent = subjectName;
    $('#selectedDate').innerHTML = `<i class="far fa-calendar"></i> ${date}`;
    $('#selectedSyllabus').innerHTML = `<i class="fas fa-book"></i> ${syllabus}`;
    $('#selectedMarks').innerHTML = `<i class="fas fa-marker"></i> ${obtainedMarks !== null ? `${obtainedMarks}/${totalMarks}` : 'N/A'}`;
    $('#selectedPercentage').innerHTML = `<i class="fas fa-percentage"></i> ${percentage}%`;
    $('#selectedBranch').innerHTML = `<i class="fas fa-building"></i> ${branchMerit}`;
    $('#selectedCentral').innerHTML = `<i class="fas fa-globe"></i> ${centralMerit}`;
    $('#selectedGPA').innerHTML = `<i class="fas fa-star"></i> ${gpa}`;
    
    // কমপ্লিট ব্যাজ
    const completeBadge = $('#completeBadge');
    if (isComplete) {
        completeBadge.classList.remove('hidden');
        completeBadge.innerHTML = '<i class="fas fa-check-circle"></i> সম্পূর্ণ';
    } else {
        completeBadge.classList.add('hidden');
    }
}

function calculateSubjectGPA(obtained, total) {
    if (obtained === null || total === 0) return 'N/A';
    const percentage = (obtained / total) * 100;
    
    if (percentage >= 80) return '5.00';
    else if (percentage >= 70) return '4.00';
    else if (percentage >= 60) return '3.50';
    else if (percentage >= 50) return '3.00';
    else if (percentage >= 40) return '2.00';
    else if (percentage >= 33) return '1.00';
    else return '0.00';
}

/* ==========================
📝 Section: 05 Data Submission & Edit
========================== */

// ---- ( Course Entry ) ----
async function submitEntry() {
    if (!navigator.onLine) {
        return showToast("ইন্টারনেট সংযোগ নেই! অফলাইনে এন্ট্রি দেওয়া যাবে না।", "error");
    }

    const branch = $('#branchVal').value;
    const central = $('#centralVal').value;
    const useCurrent = $('#useCurrentTimeToggle').checked;
    
    if (!branch || !central) return showToast("উভয় মেরিট ইনপুট দিন", "error");

    let datePayload, timePayload;

    if (useCurrent) {
        const now = new Date();
        datePayload = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
        timePayload = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    } else {
        datePayload = $('#manualDate').value; 
        timePayload = $('#manualTime').value; 
        if (!datePayload || !timePayload) return showToast("তারিখ ও সময় নির্বাচন করুন", "error");
    }

    const payload = {
        type: 'entry',
        branch: parseFloat(branch),
        central: parseFloat(central),
        date: datePayload,
        time: timePayload
    };

    const submitBtn = $('#saveEntry');
    const refreshIcon = $('#refreshDataBtn i');
    const originalBtnText = submitBtn.textContent;
    const originalBtnHeight = submitBtn.offsetHeight;
    
    // বাটন উচ্চতা স্থির রাখা
    submitBtn.style.height = `${originalBtnHeight}px`;
    submitBtn.classList.add('btn-loading');
    submitBtn.textContent = ""; 
    refreshIcon.classList.add('spinning');

    try {
        await fetch(getApiUrl(), {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        $('#branchVal').value = "";
        $('#centralVal').value = "";
        if(!useCurrent) { 
            $('#manualDate').value = ""; 
            $('#manualTime').value = "";
        }
        
        await fetchAllData();
        showToast("তথ্য সফলভাবে জমা হয়েছে!", "success");

    } catch (e) {
        console.error(e);
        showToast("ডাটা পাঠাতে ব্যর্থ হয়েছে", "error");
    } finally {
        submitBtn.classList.remove('btn-loading');
        submitBtn.textContent = originalBtnText;
        submitBtn.style.height = '';
        refreshIcon.classList.remove('spinning');
    }
}

// ---- ( Subject Entry ) ----
async function submitSubjectEntry() {
    const serial = $('#subjectSelect').value;
    const marks = $('#inpSubObtained').value;
    const branch = $('#inpSubBranch').value;
    const central = $('#inpSubCentral').value;
    
    if (!serial || !marks) {
        showToast("বিষয় ও নম্বর আবশ্যক", "error");
        return;
    }
    
    const payload = {
        type: 'update_subject',
        serial: serial,
        my_marks: parseFloat(marks),
        branch: branch || "",
        central: central || ""
    };
    
    const submitBtn = $('#btnSaveSubject');
    const originalText = submitBtn.innerHTML;
    const originalBtnHeight = submitBtn.offsetHeight;
    
    submitBtn.style.height = `${originalBtnHeight}px`;
    submitBtn.classList.add('btn-loading');
    submitBtn.innerHTML = '';
    
    try {
        const response = await fetch(getApiUrl(), {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            $('#inpSubObtained').value = '';
            $('#inpSubBranch').value = '';
            $('#inpSubCentral').value = '';
            $('#subjectSelect').value = '';
            $('#subjectInfoCard').classList.add('hidden');
            
            await fetchAllData();
            showToast("বিষয়ের তথ্য সফলভাবে আপডেট হয়েছে!", "success");
        } else {
            showToast("ডাটা পাঠাতে ব্যর্থ হয়েছে", "error");
        }
    } catch (error) {
        console.error('Error:', error);
        showToast("নেটওয়ার্ক ত্রুটি", "error");
    } finally {
        submitBtn.classList.remove('btn-loading');
        submitBtn.innerHTML = originalText;
        submitBtn.style.height = '';
    }
}

// ---- ( Edit Course Entry ) ----
async function editCourseEntry(serial) {
    const entry = allEntries.find(e => e.serial === parseInt(serial));
    if (!entry) return;
    
    const html = `
        <div class="edit-modal-content">
            <div class="edit-modal-header">
                <h3><i class="fas fa-edit"></i> এন্ট্রি সম্পাদনা করুন</h3>
                <p class="edit-subtitle">সিরিয়াল: ${toBanglaNumber(serial)}</p>
            </div>
            
            <div class="edit-form">
                <div class="input-container">
                    <label>ব্রাঞ্চ মেরিট</label>
                    <input type="number" id="editBranch" value="${entry.branch}" placeholder="ব্রাঞ্চ মেরিট">
                </div>
                <div class="input-container">
                    <label>সেন্ট্রাল মেরিট</label>
                    <input type="number" id="editCentral" value="${entry.central}" placeholder="সেন্ট্রাল মেরিট">
                </div>
                <div class="input-container">
                    <label>তারিখ</label>
                    <input type="date" id="editDate" value="${entry.date}">
                </div>
                <div class="input-container">
                    <label>সময়</label>
                    <input type="time" id="editTime" value="${entry.time}">
                </div>
            </div>
            
            <div class="edit-modal-footer">
                <button class="btn btn-cancel" onclick="closeEditModal()">বাতিল</button>
                <button class="btn btn-primary" onclick="saveCourseEdit(${serial})">সংরক্ষণ করুন</button>
            </div>
        </div>
    `;
    
    $('#editModalContent').innerHTML = html;
    $('#editModal').classList.remove('hidden');
}

async function saveCourseEdit(serial) {
    const branch = $('#editBranch').value;
    const central = $('#editCentral').value;
    const date = $('#editDate').value;
    const time = $('#editTime').value;
    
    if (!branch || !central || !date || !time) {
        showToast("সকল তথ্য পূরণ করুন", "error");
        return;
    }
    
    const payload = {
        type: 'edit_course',
        serial: serial,
        branch: parseFloat(branch),
        central: parseFloat(central),
        date: date,
        time: time
    };
    
    try {
        const response = await fetch(getApiUrl(), {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            closeEditModal();
            await fetchAllData();
            showToast("এন্ট্রি সফলভাবে আপডেট হয়েছে!", "success");
        } else {
            showToast("আপডেট ব্যর্থ হয়েছে", "error");
        }
    } catch (error) {
        console.error('Error:', error);
        showToast("নেটওয়ার্ক ত্রুটি", "error");
    }
}

// ---- ( Delete Course Entry ) ----
async function deleteCourseEntry(serial) {
    openModal(`
        <div style="padding:25px; text-align:center;"> 
            <i class="fas fa-trash-alt" style="font-size:30px; color:#ef4444; margin-bottom:15px;"></i> 
            <h3 style="margin:0 0 10px;">এন্ট্রি মুছুন?</h3> 
            <p style="font-size:13px; color:#64748b; margin-bottom:15px;">আপনি কি সিরিয়াল ${toBanglaNumber(serial)} এর এন্ট্রিটি মুছে ফেলতে চান?</p>
            <div class="delete-summary" style="background:#fef2f2; padding:10px; border-radius:8px; margin-bottom:15px; font-size:12px;">
                <p><strong>সারাংশ:</strong></p>
                <p>• সিরিয়াল: ${toBanglaNumber(serial)} মুছে যাবে</p>
                <p>• পরবর্তী সিরিয়ালগুলো পুনর্বিন্যাস করা হবে</p>
            </div>
            <p style="font-size:11px; color:#9ca3af; margin-bottom:20px;">এই কাজটি পূর্বাবস্থায় ফিরিয়ে আনা যাবে না</p>
            <div class="reset-footer"> 
                <button class="btn-reset-cancel" onclick="closeModal()">না</button> 
                <button class="btn-reset-confirm" style="background:#ef4444;" onclick="confirmDeleteCourse(${serial})">হ্যাঁ, মুছুন</button> 
            </div>
        </div>`);
}

async function confirmDeleteCourse(serial) {
    try {
        const response = await fetch(getApiUrl(), {
            method: 'POST',
            body: JSON.stringify({
                type: 'delete_course',
                serial: serial
            })
        });
        
        if (response.ok) {
            closeModal();
            await fetchAllData();
            showToast("এন্ট্রি সফলভাবে মুছে ফেলা হয়েছে", "success");
        } else {
            showToast("মুছে ফেলতে ব্যর্থ হয়েছে", "error");
        }
    } catch (error) {
        console.error('Error:', error);
        showToast("নেটওয়ার্ক ত্রুটি", "error");
    }
}

// ---- ( Clear Subject Data ) ----
async function clearSubjectData(serial) {
    openModal(`
        <div style="padding:25px; text-align:center;"> 
            <i class="fas fa-eraser" style="font-size:30px; color:#f59e0b; margin-bottom:15px;"></i> 
            <h3 style="margin:0 0 10px;">বিষয়ের ডাটা পরিষ্কার করুন?</h3> 
            <p style="font-size:13px; color:#64748b; margin-bottom:15px;">আপনি কি এই বিষয়ের নম্বর এবং মেরিট ডাটা পরিষ্কার করতে চান?</p>
            <div class="delete-summary" style="background:#fffbeb; padding:10px; border-radius:8px; margin-bottom:15px; font-size:12px;">
                <p><strong>যা পরিষ্কার হবে:</strong></p>
                <p>• প্রাপ্ত নম্বর</p>
                <p>• ব্রাঞ্চ মেরিট</p>
                <p>• কেন্দ্রীয় মেরিট</p>
                <p style="color:#059669; margin-top:5px;"><i class="fas fa-info-circle"></i> বিষয়টি মুছে যাবে না, শুধু ডাটা পরিষ্কার হবে</p>
            </div>
            <div class="reset-footer"> 
                <button class="btn-reset-cancel" onclick="closeModal()">না</button> 
                <button class="btn-reset-confirm" style="background:#f59e0b;" onclick="confirmClearSubject(${serial})">হ্যাঁ, পরিষ্কার করুন</button> 
            </div>
        </div>`);
}

async function confirmClearSubject(serial) {
    try {
        const response = await fetch(getApiUrl(), {
            method: 'POST',
            body: JSON.stringify({
                type: 'clear_subject',
                serial: serial
            })
        });
        
        if (response.ok) {
            closeModal();
            await fetchAllData();
            showToast("বিষয়ের ডাটা পরিষ্কার করা হয়েছে", "success");
        } else {
            showToast("পরিষ্কার করতে ব্যর্থ হয়েছে", "error");
        }
    } catch (error) {
        console.error('Error:', error);
        showToast("নেটওয়ার্ক ত্রুটি", "error");
    }
}

function closeEditModal() {
    $('#editModal').classList.add('hidden');
}

/* ==========================
🔄 Section: 06 Mode Management
========================== */

// ১. পেজ লোড হওয়ার সময় মোড ডিটেক্ট করা
if (!localStorage.getItem('appMode')) {
    localStorage.setItem('appMode', 'course');
}
appMode = localStorage.getItem('appMode');

// ২. মোড পরিবর্তন করার মূল ফাংশন
function switchMode(mode) {
    appMode = mode;
    localStorage.setItem('appMode', mode);
    
    // UI এবং টাইটেল আপডেট
    updateModeUI(mode);
    updateViewTitle();
    
    // সঠিক ড্যাশবোর্ড ডাটা রেন্ডার করা
    if (mode === 'course') {
        if (allEntries.length > 0) renderDashboard();
    } else {
        if (subjectData.length > 0) {
            processSubjectData();
            renderSubjectDashboard();
        }
    }
}

// ৩. UI এলিমেন্টগুলো হাইড/শো করা
function updateModeUI(mode) {
    // Update mode badge
    const modeBadge = $('#headerModeBadge');
    const modeText = $('#headerModeText');
    if (modeBadge && modeText) {
        modeText.textContent = mode === 'course' ? 'কোর্স মেরিট' : 'বিষয়ভিত্তিক';
    }
    
    // Update header buttons
    const courseBtn = $('#btnModeCourse');
    const subjectBtn = $('#btnModeSubject');
    const courseBtnHeader = $('#btnModeCourseHeader');
    const subjectBtnHeader = $('#btnModeSubjectHeader');
    
    if (courseBtn) courseBtn.classList.toggle('active', mode === 'course');
    if (subjectBtn) subjectBtn.classList.toggle('active', mode === 'subject');
    if (courseBtnHeader) courseBtnHeader.classList.toggle('active', mode === 'course');
    if (subjectBtnHeader) subjectBtnHeader.classList.toggle('active', mode === 'subject');
    
    // হেডারে মোড টাইটেল আপডেট
    const modeTitle = $('#modeTitle');
    if (modeTitle) {
        modeTitle.textContent = mode === 'course' ? 'কোর্স ভিত্তিক' : 'বিষয় ভিত্তিক';
    }
    
    // কোর্স এবং সাবজেক্ট এলিমেন্টগুলো টগল
    $$('.course-mode').forEach(el => {
        if (el.id !== 'modeSwitcher' && !el.classList.contains('mobile-only')) 
            el.classList.toggle('hidden', mode !== 'course');
    });
    
    $$('.subject-mode').forEach(el => {
        if (!el.classList.contains('mobile-only'))
            el.classList.toggle('hidden', mode !== 'subject');
    });
    
    // ফিল্টার বার শো/হাইড (শুধু টেবিল এবং চার্ট ট্যাবে)
    const activeTab = $$('.tab-item:not(.hidden)')[0]?.id || 'tabInput';
    const showFilter = (activeTab === "tabTable" || activeTab === "tabGraph");
    
    if ($('#filterBar')) $('#filterBar').classList.toggle('hidden', !showFilter || mode !== 'course');
    if ($('#subjectFilterBar')) $('#subjectFilterBar').classList.toggle('hidden', !showFilter || mode !== 'subject');
    
    // মোড সুইচার শো/হাইড (শুধু মোবাইলে)
    if ($('#modeSwitcher')) {
        $('#modeSwitcher').classList.toggle('hidden', window.innerWidth > 768);
    }
}

// ৪. ভিউ অনুযায়ী টাইটেল পরিবর্তন
function updateViewTitle() {
    const activeTab = $$('.tab-item:not(.hidden)')[0]?.id || 'tabInput';
    const tabTitles = {
        'tabInput': appMode === 'course' ? 'ডাটা এন্ট্রি' : 'বিষয়ভিত্তিক এন্ট্রি',
        'tabTable': appMode === 'course' ? 'রিপোর্ট শিট' : 'বিষয়ভিত্তিক রিপোর্ট',
        'tabGraph': appMode === 'course' ? 'বিশ্লেষণ' : 'বিষয়ভিত্তিক বিশ্লেষণ',
        'tabPin': 'সেটিংস'
    };
    
    $('#viewTitle').textContent = tabTitles[activeTab] || 'ড্যাশবোর্ড';
}

// ৫. পেজ লোডের সময় অটো-রেন্ডার নিশ্চিত করা
function initializeAppMode() {
    updateModeUI(appMode);
    updateViewTitle();
    
    // ডাটা ক্যাশে থাকলে সাথে সাথে রেন্ডার করবে
    if (appMode === 'course' && allEntries.length > 0) renderDashboard();
    if (appMode === 'subject' && subjectData.length > 0) {
        processSubjectData();
        renderSubjectDashboard();
    }
}

/* ==========================
📊 Section: 07 Dashboard & Charts
========================== */

// ---- ( Course Dashboard ) ----
function renderDashboard() {
    let data = [...allEntries];
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
    updateCourseCharts(data);
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
    const bValues = data.map(d => parseInt(d.branch)).filter(Boolean); 
    const cValues = data.map(d => parseInt(d.central)).filter(Boolean);

    const setVal = (id, val) => { if ($(id)) $(id).textContent = val; };
    setVal('#sumLastDate', formatDate(last.date));
    setVal('#sumBranch', toBanglaNumber(last.branch));
    setVal('#sumCentral', toBanglaNumber(last.central));
    setVal('#sumBestBranch', bValues.length ? toBanglaNumber(Math.min(...bValues)) : "-");
    setVal('#sumBestCentral', cValues.length ? toBanglaNumber(Math.min(...cValues)) : "-");
    setVal('#sumTotal', toBanglaNumber(data.length));
}

function updateCourseCharts(data) {
    if (!window.Chart) return;
    const chartData = [...data].sort((a, b) => a.serial - b.serial); // Chart needs sorted data
    const labels = chartData.map(d => `R-${toBanglaNumber(d.serial)}`);

    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: 10 },
        interaction: { mode: "index", intersect: false },
        scales: {
            y: { 
                grid: { color: "rgba(0,0,0,0.05)", drawBorder: false }, 
                ticks: { 
                    font: { family: "Inter", size: 11 },
                    callback: function(value) {
                        return toBanglaNumber(value);
                    }
                } 
            },
            x: { 
                grid: { display: false }, 
                ticks: { 
                    autoSkip: true, 
                    maxTicksLimit: 12, 
                    font: { family: "Inter", size: 10 } 
                } 
            }
        },
        plugins: { 
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: '#ffffff',
                bodyColor: '#ffffff',
                borderColor: 'rgba(99, 102, 241, 0.5)',
                borderWidth: 1,
                callbacks: {
                    label: function(context) {
                        const datasetLabel = context.dataset.label || '';
                        const value = context.raw;
                        const index = context.dataIndex;
                        const date = chartData[index]?.date ? formatDate(chartData[index].date) : '';
                        return [
                            `${datasetLabel}: ${toBanglaNumber(value)}`,
                            `তারিখ: ${date}`
                        ];
                    },
                    title: function(context) {
                        return `R-${toBanglaNumber(chartData[context[0].dataIndex]?.serial || 0)}`;
                    }
                }
            }
        }
    };

    if (branchChart) branchChart.destroy();
    branchChart = new Chart($("#branchChart"), {
        type: "line",
        data: {
            labels,
            datasets: [{
                label: "ব্রাঞ্চ মেরিট",
                data: chartData.map(d => d.branch),
                borderColor: "#6366f1", 
                borderWidth: 2, 
                pointRadius: 4, 
                pointBackgroundColor: "#6366f1",
                tension: 0.2, 
                fill: true, 
                backgroundColor: "rgba(99, 102, 241, 0.1)"
            }]
        },
        options: commonOptions
    });

    if (centralChart) centralChart.destroy();
    centralChart = new Chart($("#centralChart"), {
        type: "line",
        data: {
            labels,
            datasets: [{
                label: "সেন্ট্রাল মেরিট",
                data: chartData.map(d => d.central),
                borderColor: "#10b981", 
                borderWidth: 2, 
                pointRadius: 4,
                pointBackgroundColor: "#10b981",
                tension: 0.2, 
                fill: true, 
                backgroundColor: "rgba(16, 185, 129, 0.1)"
            }]
        },
        options: commonOptions
    });
}

// ---- ( Subject Dashboard ) ----
function renderSubjectDashboard() {
    let filteredData = applySubjectFilters();
    updateSubjectSummary(filteredData);
    updateSubjectTable(filteredData);
    updateSubjectCharts(filteredData);
}

function applySubjectFilters() {
    let data = [...subjectResults];
    
    const subjectFilter = $('#subjectFilter').value;
    if (subjectFilter) {
        // Exact subject match
        data = data.filter(d => d.subject === subjectFilter);
    }
    
    const smartFilter = $('#smartFilter').value;
    switch (smartFilter) {
        case 'with_marks':
            data = data.filter(d => d.obtained_marks !== null);
            break;
        case 'without_marks':
            data = data.filter(d => d.obtained_marks === null);
            break;
        case 'best_marks':
            data = data.filter(d => d.obtained_marks !== null)
                       .sort((a, b) => {
                           const aPercent = (a.obtained_marks / a.total_marks) * 100;
                           const bPercent = (b.obtained_marks / b.total_marks) * 100;
                           return bPercent - aPercent;
                       });
            break;
        case 'best_rank':
            data = data.filter(d => d.branch_merit !== null)
                       .sort((a, b) => a.branch_merit - b.branch_merit);
            break;
    }
    
    const year = $('#subjectYearSelect').value;
    if (year) {
        data = data.filter(d => d.date.startsWith(year));
    }
    
    const month = $('#subjectMonthSelect').value;
    if (month) {
        data = data.filter(d => d.date.split('-')[1] === month);
    }
    
    return data;
}

function updateSubjectSummary(data) {
    const totalExams = subjectData.length;
    const attemptedExams = subjectData.filter(d => d.obtained_marks !== null).length;
    
    const withMarks = data.filter(d => d.obtained_marks !== null);
    const totalMarks = withMarks.reduce((sum, d) => sum + d.obtained_marks, 0);
    const totalPossible = withMarks.reduce((sum, d) => sum + d.total_marks, 0);
    const average = totalPossible > 0 ? Math.round((totalMarks / totalPossible) * 100) : 0;
    
    const gpa = calculateGPA(withMarks);
    
    // উন্নত GPA ক্যালকুলেশন (৪র্থ বিষয় সহ/ছাড়া)
    const gpaWithFourth = calculateGPA(withMarks, true);
    const gpaWithoutFourth = calculateGPA(withMarks, false);
    
    const withRanks = withMarks.filter(d => d.branch_merit !== null && d.central_merit !== null);
    const bestBranch = withRanks.length > 0 ? 
        Math.min(...withRanks.map(d => d.branch_merit)) : '-';
    const bestCentral = withRanks.length > 0 ? 
        Math.min(...withRanks.map(d => d.central_merit)) : '-';
    
    const bestBranchSubject = withRanks.find(d => d.branch_merit === bestBranch);
    const bestCentralSubject = withRanks.find(d => d.central_merit === bestCentral);
    
    // বাংলায় ডাটা সেট করুন
    $('#sumSubjectExams').textContent = toBanglaNumber(totalExams);
    $('#sumSubjectAttempted').textContent = toBanglaNumber(attemptedExams);
    $('#sumSubjectAverage').textContent = `${toBanglaNumber(average)}%`;
    $('#sumSubjectGPA').textContent = gpa.toFixed(2);
    
    // বেস্ট ব্রাঞ্চ এবং সেন্ট্রালের জন্য উন্নত ডিজাইন
    const bestBranchElement = $('#sumSubjectBestBranch');
    const bestCentralElement = $('#sumSubjectBestCentral');
    
    if (bestBranchSubject) {
        bestBranchElement.innerHTML = `
            <div class="best-rank-subject">${bestBranchSubject.subject}</div>
            <div class="best-rank-details">
                <span class="best-rank-position">${toBanglaNumber(bestBranch)}</span>
                <span class="best-rank-marks">${bestBranchSubject.obtained_marks}/${bestBranchSubject.total_marks}</span>
            </div>
        `;
    } else {
        bestBranchElement.innerHTML = `
            <div class="best-rank-subject">-</div>
            <div class="best-rank-details">
                <span class="best-rank-position">-</span>
                <span class="best-rank-marks">-/-</span>
            </div>
        `;
    }
    
    if (bestCentralSubject) {
        bestCentralElement.innerHTML = `
            <div class="best-rank-subject">${bestCentralSubject.subject}</div>
            <div class="best-rank-details">
                <span class="best-rank-position">${toBanglaNumber(bestCentral)}</span>
                <span class="best-rank-marks">${bestCentralSubject.obtained_marks}/${bestCentralSubject.total_marks}</span>
            </div>
        `;
    } else {
        bestCentralElement.innerHTML = `
            <div class="best-rank-subject">-</div>
            <div class="best-rank-details">
                <span class="best-rank-position">-</span>
                <span class="best-rank-marks">-/-</span>
            </div>
        `;
    }
    
    // উন্নত GPA তথ্য
    const gpaInfoElement = $('#gpaInfo');
    if (gpaInfoElement) {
        gpaInfoElement.innerHTML = `
            <small>৪র্থ বিষয় সহ: ${gpaWithFourth.toFixed(2)} | ছাড়া: ${gpaWithoutFourth.toFixed(2)}</small>
        `;
    }
}

function calculateGPA(subjects, includeFourth = true) {
    if (subjects.length === 0) return 0;
    
    let totalPoints = 0;
    let count = 0;
    
    subjects.forEach(subject => {
        if (subject.obtained_marks !== null && subject.total_marks > 0) {
            const percentage = (subject.obtained_marks / subject.total_marks) * 100;
            
            let gpa = 0;
            if (percentage >= 80) gpa = 5.0;
            else if (percentage >= 70) gpa = 4.0;
            else if (percentage >= 60) gpa = 3.5;
            else if (percentage >= 50) gpa = 3.0;
            else if (percentage >= 40) gpa = 2.0;
            else if (percentage >= 33) gpa = 1.0;
            
            const isFourthSubject = (subject.subject.includes(fourthSubject) || 
                (subject.subject.includes('উচ্চতর গণিত') && fourthSubject === 'উচ্চতর গণিত'));
            
            if ((!isFourthSubject || (isFourthSubject && includeFourth)) || includeFourthSubject) {
                totalPoints += gpa;
                count++;
            }
        }
    });
    
    return count > 0 ? totalPoints / count : 0;
}

function updateSubjectCharts(data) {
    const withMarks = data.filter(d => d.obtained_marks !== null);
    if (withMarks.length === 0) {
        if (subjectChart) subjectChart.destroy();
        if (subjectBranchChart) subjectBranchChart.destroy();
        if (subjectCentralChart) subjectCentralChart.destroy();
        return;
    }
    
    withMarks.sort((a, b) => new Date(a.date) - new Date(b.date));
    updateSubjectMarksChart(withMarks);
    updateSubjectBranchChart(withMarks);
    updateSubjectCentralChart(withMarks);
}

function updateSubjectMarksChart(data) {
    const canvas = $('#subjectMarksChart');
    if (!canvas) return;
    
    if (subjectChart) subjectChart.destroy();
    
    const ctx = canvas.getContext('2d');
    subjectChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => {
                const shortName = d.subject.length > 10 ? d.subject.substring(0, 8) + '...' : d.subject;
                return shortName;
            }),
            datasets: [{
                label: 'প্রাপ্ত নম্বর',
                data: data.map(d => d.obtained_marks),
                backgroundColor: 'rgba(99, 102, 241, 0.7)',
                borderColor: 'rgba(99, 102, 241, 1)',
                borderWidth: 1
            }, {
                label: 'মোট নম্বর',
                data: data.map(d => d.total_marks),
                backgroundColor: 'rgba(148, 163, 184, 0.3)',
                borderColor: 'rgba(148, 163, 184, 0.5)',
                borderWidth: 1,
                type: 'line',
                fill: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    callbacks: {
                        title: (context) => data[context[0].dataIndex].subject,
                        label: (context) => {
                            const item = data[context.dataIndex];
                            if (context.datasetIndex === 0) {
                                const percentage = ((item.obtained_marks/item.total_marks)*100).toFixed(1);
                                return `প্রাপ্ত: ${toBanglaNumber(item.obtained_marks)}/${toBanglaNumber(item.total_marks)} (${toBanglaNumber(percentage)}%)`;
                            } else {
                                return `মোট: ${toBanglaNumber(item.total_marks)}`;
                            }
                        },
                        afterLabel: (context) => `তারিখ: ${formatDate(data[context.dataIndex].date)}`
                    }
                }
            },
            scales: {
                y: { 
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return toBanglaNumber(value);
                        }
                    }
                },
                x: {
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            }
        }
    });
}

function updateSubjectBranchChart(data) {
    const canvas = $('#subjectBranchChart');
    if (!canvas) return;
    
    if (subjectBranchChart) subjectBranchChart.destroy();
    
    const withBranch = data.filter(d => d.branch_merit !== null);
    if (withBranch.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    subjectBranchChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: withBranch.map(d => {
                const shortName = d.subject.length > 8 ? d.subject.substring(0, 6) + '...' : d.subject;
                return shortName;
            }),
            datasets: [{
                label: 'ব্রাঞ্চ মেরিট',
                data: withBranch.map(d => d.branch_merit),
                borderColor: 'rgba(99, 102, 241, 1)',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                borderWidth: 2,
                tension: 0.3,
                fill: true,
                pointRadius: 4,
                pointBackgroundColor: 'rgba(99, 102, 241, 1)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    callbacks: {
                        title: (context) => withBranch[context[0].dataIndex].subject,
                        label: (context) => {
                            const item = withBranch[context.dataIndex];
                            const percentage = ((item.obtained_marks/item.total_marks)*100).toFixed(1);
                            return [
                                `ব্রাঞ্চ মেরিট: ${toBanglaNumber(context.raw)}`,
                                `নম্বর: ${toBanglaNumber(item.obtained_marks)}/${toBanglaNumber(item.total_marks)} (${toBanglaNumber(percentage)}%)`
                            ];
                        },
                        afterLabel: (context) => `তারিখ: ${formatDate(withBranch[context.dataIndex].date)}`
                    }
                }
            },
            scales: {
                y: { 
                    reverse: true, // কম মেরিট ভালো, তাই রিভার্স
                    ticks: {
                        callback: function(value) {
                            return toBanglaNumber(value);
                        }
                    }
                },
                x: {
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            }
        }
    });
}

function updateSubjectCentralChart(data) {
    const canvas = $('#subjectCentralChart');
    if (!canvas) return;
    
    if (subjectCentralChart) subjectCentralChart.destroy();
    
    const withCentral = data.filter(d => d.central_merit !== null);
    if (withCentral.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    subjectCentralChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: withCentral.map(d => {
                const shortName = d.subject.length > 8 ? d.subject.substring(0, 6) + '...' : d.subject;
                return shortName;
            }),
            datasets: [{
                label: 'কেন্দ্রীয় মেরিট',
                data: withCentral.map(d => d.central_merit),
                borderColor: 'rgba(16, 185, 129, 1)',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                borderWidth: 2,
                tension: 0.3,
                fill: true,
                pointRadius: 4,
                pointBackgroundColor: 'rgba(16, 185, 129, 1)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    callbacks: {
                        title: (context) => withCentral[context[0].dataIndex].subject,
                        label: (context) => {
                            const item = withCentral[context.dataIndex];
                            const percentage = ((item.obtained_marks/item.total_marks)*100).toFixed(1);
                            return [
                                `কেন্দ্রীয় মেরিট: ${toBanglaNumber(context.raw)}`,
                                `নম্বর: ${toBanglaNumber(item.obtained_marks)}/${toBanglaNumber(item.total_marks)} (${toBanglaNumber(percentage)}%)`
                            ];
                        },
                        afterLabel: (context) => `তারিখ: ${formatDate(withCentral[context.dataIndex].date)}`
                    }
                }
            },
            scales: {
                y: { 
                    reverse: true, // কম মেরিট ভালো, তাই রিভার্স
                    ticks: {
                        callback: function(value) {
                            return toBanglaNumber(value);
                        }
                    }
                },
                x: {
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            }
        }
    });
}

/* ==========================
📋 Section: 08 Tables & Pagination
========================== */

// ---- ( Course Table ) ----
function updateTable(data) {
    pCurrentData = [...data]; // Already reversed in fetchAllData()
    
    const endMsg = $("#endMessage");
    const infLoader = $("#infiniteLoader");
    const pagControls = $("#paginationControls");
    const tbody = $("#tableRows");

    if (endMsg) endMsg.classList.add("hidden");
    if (infLoader) infLoader.classList.add("hidden");

    if (pMode === "infinite") {
        pDisplayedCount = 0;
        if (tbody) tbody.innerHTML = "";
        if (pagControls) pagControls.classList.add("hidden");
        loadMoreInfinite();
    } else {
        if (pagControls) pagControls.classList.remove("hidden");
        renderPage(1);
    }
    
    // ডাটা না থাকলে বিশেষ মেসেজ শো করো
    if (pCurrentData.length === 0) {
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="no-data-cell">
                        <div class="no-data-icon">
                            <i class="fas fa-database"></i>
                        </div>
                        <div class="no-data-text">
                            কোন ডাটা পাওয়া যায়নি
                        </div>
                    </td>
                </tr>
            `;
        }
        if (pagControls) pagControls.classList.add("hidden");
        if (endMsg) endMsg.classList.add("hidden");
    }
}

function loadMoreInfinite() {
    if (pIsLoading || pDisplayedCount >= pCurrentData.length) return;
    pIsLoading = true;
    const loader = $("#infiniteLoader");
    if (loader) loader.classList.remove("hidden");

    setTimeout(() => {
        const nextBatch = pCurrentData.slice(pDisplayedCount, pDisplayedCount + pRowsPerPage);
        renderRows(nextBatch, true);
        pDisplayedCount += nextBatch.length;
        pIsLoading = false;
        
        if (loader) loader.classList.add("hidden");
        if (pDisplayedCount >= pCurrentData.length && pCurrentData.length > 0) {
            $("#endMessage")?.classList.remove("hidden");
        }
    }, 500);
}

function renderPage(page) {
    pCurrentPage = page;
    const totalPages = Math.ceil(pCurrentData.length / pRowsPerPage);
    
    // যদি ডাটা না থাকে বা এক পেজের কম থাকে
    if (totalPages <= 1) {
        $("#paginationControls")?.classList.add("hidden");
        $("#endMessage")?.classList.remove("hidden");
    } else {
        $("#paginationControls")?.classList.remove("hidden");
    }
    
    const start = (page - 1) * pRowsPerPage;
    const pageData = pCurrentData.slice(start, start + pRowsPerPage);
    $("#tableRows").innerHTML = "";
    renderRows(pageData, false);
    renderPaginationControls();
}

function renderRows(data, append) {
    const tbody = $("#tableRows");
    if (!tbody) return;
    
    if (!data.length && !append) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px;">কোন রিপোর্ট পাওয়া যায়নি</td></tr>';
        return;
    }
    
    const html = data.map(d => `
        <tr class="fade-in table-row-hover">
            <td class="action-cell">
                <div class="dropdown">
                    <button class="dropdown-toggle" onclick="showRowActions('course', ${d.serial})">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                </div>
            </td>
            <td><span class="sn-badge">${toBanglaNumber(d.serial)}</span></td>
            <td>
                <div class="table-date-cell">
                    <span>${formatDate(d.date)}</span>
                    <div class="table-time-row">
                        <i class="far fa-clock"></i><span class="time-text">${format12hr(d.time)}</span>
                    </div>
                </div>
            </td>
            <td class="fw-800">${toBanglaNumber(d.branch)}</td>
            <td class="fw-800">${toBanglaNumber(d.central)}</td>
        </tr>`).join("");
    
    if (append) {
        tbody.insertAdjacentHTML("beforeend", html);
    } else {
        tbody.innerHTML = html;
    }
}

// ---- ( Row Actions ) ----
function showRowActions(type, serial) {
    let html = '';
    if (type === 'course') {
        html = `
            <div class="action-menu">
                <button class="action-btn" onclick="editCourseEntry(${serial})">
                    <i class="fas fa-edit"></i> সম্পাদনা
                </button>
                <button class="action-btn danger" onclick="deleteCourseEntry(${serial})">
                    <i class="fas fa-trash"></i> মুছুন
                </button>
            </div>
        `;
    } else {
        html = `
            <div class="action-menu">
                <button class="action-btn" onclick="clearSubjectData(${serial})">
                    <i class="fas fa-eraser"></i> ডাটা পরিষ্কার
                </button>
            </div>
        `;
    }
    
    $('#actionModalContent').innerHTML = html;
    $('#rowActionModal').classList.remove('hidden');
}

// Close action modal when clicking outside
document.addEventListener('click', function(event) {
    const modal = $('#rowActionModal');
    if (modal && !modal.contains(event.target) && !event.target.closest('.dropdown-toggle')) {
        modal.classList.add('hidden');
    }
});

function renderPaginationControls() {
    const container = $("#paginationControls");
    if (!container) return;
    const totalPages = Math.ceil(pCurrentData.length / pRowsPerPage);
    
    // যদি ডাটা না থাকে বা এক পেজের কম থাকে
    if (totalPages <= 1) { 
        container.innerHTML = ""; 
        return; 
    }

    let html = `<button class="page-num-btn" onclick="renderPage(${pCurrentPage - 1})" ${pCurrentPage === 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i></button>`;
    
    for (let i = 1; i <= totalPages; i++) {
         if (i === 1 || i === totalPages || (i >= pCurrentPage - 1 && i <= pCurrentPage + 1)) {
            html += `<button class="page-num-btn ${i === pCurrentPage ? 'active' : ''}" onclick="renderPage(${i})">${toBanglaNumber(i)}</button>`;
        } else if ((i === pCurrentPage - 2 && pCurrentPage > 3) || (i === pCurrentPage + 2 && pCurrentPage < totalPages - 2)) {
            if (!html.endsWith('...')) html += `<span class="pagination-dots">...</span>`;
        }
    }
    
    html += `<button class="page-num-btn" onclick="renderPage(${pCurrentPage + 1})" ${pCurrentPage === totalPages ? 'disabled' : ''}><i class="fas fa-chevron-right"></i></button>`;
    container.innerHTML = html;
}

window.setPaginationMode = (mode) => {
    if (pMode === mode) return;
    pMode = mode;
    localStorage.setItem("pMode", mode);
    updateTable([...pCurrentData]);
    
    $$(".p-btn").forEach(b => {
        const isClickedMode = b.getAttribute("onclick").includes(mode);
        b.classList.toggle("active", isClickedMode);
    });
};

window.handleRowsChange = (val) => {
    if (val === "all") {
        pRowsPerPage = 999999;
    } else {
        pRowsPerPage = parseInt(val);
    }
    localStorage.setItem("pRowsPerPage", pRowsPerPage);
    updateTable([...pCurrentData]);
};

// ---- ( Subject Table ) ----
function updateSubjectTable(data) {
    // Subject table shows in original order (not reversed)
    subjectPCurrentData = [...data].sort((a, b) => a.serial - b.serial);
    
    const endMsg = $("#subjectEndMessage");
    const loader = $("#subjectInfiniteLoader");
    const pagControls = $("#subjectPaginationControls");
    const tbody = $("#subjectTableRows");
    
    if (endMsg) endMsg.classList.add("hidden");
    if (loader) loader.classList.add("hidden");
    
    // ডাটা না থাকলে বিশেষ মেসেজ
    if (subjectPCurrentData.length === 0) {
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="no-data-cell">
                        <div class="no-data-icon">
                            <i class="fas fa-book"></i>
                        </div>
                        <div class="no-data-text">
                            কোন বিষয়ভিত্তিক ডাটা পাওয়া যায়নি
                        </div>
                    </td>
                </tr>
            `;
        }
        if (pagControls) pagControls.classList.add("hidden");
        if (endMsg) endMsg.classList.add("hidden");
        return;
    }
    
    if (subjectPMode === "infinite") {
        subjectPDisplayedCount = 0;
        if (tbody) tbody.innerHTML = "";
        if (pagControls) pagControls.classList.add("hidden");
        loadMoreSubjectInfinite();
    } else {
        if (pagControls) pagControls.classList.remove("hidden");
        renderSubjectPage(1);
    }
}

function loadMoreSubjectInfinite() {
    if (subjectPIsLoading || subjectPDisplayedCount >= subjectPCurrentData.length) return;
    subjectPIsLoading = true;
    const loader = $("#subjectInfiniteLoader");
    if (loader) loader.classList.remove("hidden");
    
    setTimeout(() => {
        const nextBatch = subjectPCurrentData.slice(subjectPDisplayedCount, subjectPDisplayedCount + subjectPRowsPerPage);
        renderSubjectRows(nextBatch, true);
        subjectPDisplayedCount += nextBatch.length;
        subjectPIsLoading = false;
        
        if (loader) loader.classList.add("hidden");
        if (subjectPDisplayedCount >= subjectPCurrentData.length && subjectPCurrentData.length > 0) {
            $("#subjectEndMessage")?.classList.remove("hidden");
        }
    }, 500);
}

function renderSubjectPage(page) {
    subjectPCurrentPage = page;
    const totalPages = Math.ceil(subjectPCurrentData.length / subjectPRowsPerPage);
    
    // যদি ডাটা না থাকে বা এক পেজের কম থাকে
    if (totalPages <= 1) {
        $("#subjectPaginationControls")?.classList.add("hidden");
        $("#subjectEndMessage")?.classList.remove("hidden");
    } else {
        $("#subjectPaginationControls")?.classList.remove("hidden");
    }
    
    const start = (page - 1) * subjectPRowsPerPage;
    const pageData = subjectPCurrentData.slice(start, start + subjectPRowsPerPage);
    $("#subjectTableRows").innerHTML = "";
    renderSubjectRows(pageData, false);
    renderSubjectPaginationControls();
}

function renderSubjectRows(data, append) {
    const tbody = $("#subjectTableRows");
    if (!tbody) return;
    
    if (!data.length && !append) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px;">কোন রিপোর্ট পাওয়া যায়নি</td></tr>';
        return;
    }
    
    const html = data.map((d, index) => {
        // Use sheet serial number directly
        const serial = d.serial;
        const percentage = d.obtained_marks !== null ? ((d.obtained_marks / d.total_marks) * 100).toFixed(1) : null;
        const gpa = d.obtained_marks !== null ? calculateSubjectGPA(d.obtained_marks, d.total_marks) : null;
        
        return `
        <tr class="fade-in table-row-hover">
            <td class="action-cell">
                <div class="dropdown">
                    <button class="dropdown-toggle" onclick="showRowActions('subject', ${serial})">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                </div>
            </td>
            <td><span class="sn-badge">${toBanglaNumber(serial)}</span></td>
            <td class="subject-table-cell">
                <div class="subject-name">${d.subject}</div>
                <div class="subject-syllabus" title="${d.syllabus}">${d.syllabus || 'সিলেবাস নেই'}</div>
            </td>
            <td>${formatDate(d.date)}</td>
            <td>
                <div class="marks-display">
                    <div class="marks-row">
                        <b>${d.obtained_marks !== null ? toBanglaNumber(d.obtained_marks) : '-'}</b> / ${toBanglaNumber(d.total_marks)}
                    </div>
                    ${percentage ? `<div class="percentage-gpa-row">
                        <span class="percentage-badge">${toBanglaNumber(percentage)}%</span>
                        <span class="dot-separator">•</span>
                        <span class="gpa-badge">GPA: ${gpa}</span>
                    </div>` : ''}
                </div>
            </td>
            <td>${d.branch_merit !== null ? toBanglaNumber(d.branch_merit) : '-'}</td>
            <td>${d.central_merit !== null ? toBanglaNumber(d.central_merit) : '-'}</td>
        </tr>`;
    }).join("");
    
    if (append) {
        tbody.insertAdjacentHTML("beforeend", html);
    } else {
        tbody.innerHTML = html;
    }
}

function renderSubjectPaginationControls() {
    const container = $("#subjectPaginationControls");
    if (!container) return;
    const totalPages = Math.ceil(subjectPCurrentData.length / subjectPRowsPerPage);
    if (totalPages <= 1) { container.innerHTML = ""; return; }
    
    let html = `<button class="page-num-btn" onclick="renderSubjectPage(${subjectPCurrentPage - 1})" ${subjectPCurrentPage === 1 ? 'disabled' : ''}><i class="fas fa-chevron-left"></i></button>`;
    
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= subjectPCurrentPage - 1 && i <= subjectPCurrentPage + 1)) {
            html += `<button class="page-num-btn ${i === subjectPCurrentPage ? 'active' : ''}" onclick="renderSubjectPage(${i})">${toBanglaNumber(i)}</button>`;
        } else if ((i === subjectPCurrentPage - 2 && subjectPCurrentPage > 3) || (i === subjectPCurrentPage + 2 && subjectPCurrentPage < totalPages - 2)) {
            if (!html.endsWith('...')) html += `<span class="pagination-dots">...</span>`;
        }
    }
    
    html += `<button class="page-num-btn" onclick="renderSubjectPage(${subjectPCurrentPage + 1})" ${subjectPCurrentPage === totalPages ? 'disabled' : ''}><i class="fas fa-chevron-right"></i></button>`;
    container.innerHTML = html;
}

window.setSubjectPaginationMode = (mode) => {
    if (subjectPMode === mode) return;
    subjectPMode = mode;
    localStorage.setItem("subjectPMode", mode);
    
    $$("#subjectTableSection .p-btn").forEach(b => {
        const isClickedMode = b.getAttribute("onclick")?.includes(mode);
        b.classList.toggle("active", isClickedMode);
    });
    
    updateSubjectTable(subjectPCurrentData);
};

window.handleSubjectRowsChange = (val) => {
    if (val === "all") {
        subjectPRowsPerPage = 999999;
    } else {
        subjectPRowsPerPage = parseInt(val);
    }
    localStorage.setItem("subjectPRowsPerPage", subjectPRowsPerPage);
    updateSubjectTable(subjectPCurrentData);
};

/* ==========================
🔔 Section: 09 Notifications
========================== */

async function requestNotifPermission() {
    if ("Notification" in window && Notification.permission === "default") {
        try {
            const permission = await Notification.requestPermission();
            if (permission === "granted") {
                showToast("নোটিফিকেশন পারমিশন দেওয়া হয়েছে", "success");
            }
        } catch (error) {
            console.error("Notification permission error:", error);
        }
    }
}

function checkNotifications() {
    if (!notifEnabled || notifTimes.length === 0) return;
    
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const currentTime = `${hours}:${mins}`; 
    
    const currentMinuteVal = now.getHours() * 60 + now.getMinutes();
    if (currentMinuteVal === lastCheckedMinute) return;
    lastCheckedMinute = currentMinuteVal;

    if (notifTimes.includes(currentTime)) {
        // Push Notification পাঠানো
        if (Notification.permission === "granted") {
            const notification = new Notification("Udvash FMT Tracker Pro", {
                body: `${format12hr(currentTime)} টা বেজে গেছে, আপনার আজকের ডাটাগুলো দ্রুত আপডেট করুন!`,
                icon: "./images/UFMT.png",
                badge: "./images/UFMT.jpg",
                tag: 'fmt-reminder',
                renotify: true,
                requireInteraction: true,
                vibrate: [200, 100, 200]
            });
            
            notification.onclick = () => {
                window.focus();
                notification.close();
            };
        }
        
        // Toast notification শো করা (যদি push notification না পাওয়া যায়)
        showToast(`⏰ রিমাইন্ডার: ${format12hr(currentTime)} টা বেজে গেছে, ডাটা আপডেট করুন!`);
    }
}

function renderReminders() {
    const list = $('#notifList');
    if (!list) return;
    
    if (notifTimes.length > 0) {
        list.innerHTML = notifTimes.sort().map((t, i) => `
            <div class="rem-item"> 
                <span class="rem-time"><i class="far fa-clock"></i> ${format12hr(t)}</span> 
                <button onclick="confirmDelRem(${i})" class="del-rem"><i class="fas fa-trash-can"></i></button> 
            </div>`).join('');
    } else {
        list.innerHTML = '<p class="empty-msg">কোন রিমাইন্ডার সেট করা নেই</p>';
    }
}

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
    localStorage.setItem(LS_NOTIFS, JSON.stringify(notifTimes));
    renderReminders();
    closeModal();
    showToast("রিমাইন্ডার মুছে ফেলা হয়েছে", "success");
}

/* ==========================
🛠️ Section: 10 Modals & Reset
========================== */

function openModal(html) {
    const modal = $('#standardModal');
    const content = $('#modalContent');
    content.className = "reset-popup-premium"; 
    content.innerHTML = html;
    modal.classList.remove('hidden');
}

function closeModal() { 
    $('#standardModal').classList.add('hidden'); 
}

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

/* ==========================
📤 Section: 11 Export Functions
========================== */

function initExportFunctions() {
    // Safe null checks before adding event listeners
    const exportExcelBtn = $('#exportExcel');
    const exportPDFBtn = $('#exportPDF');
    const exportPrintBtn = $('#exportPrint');
    const openSheetBtn = $('#openSheetBtn');
    
    if (exportExcelBtn) exportExcelBtn.addEventListener('click', exportToExcel);
    if (exportPDFBtn) exportPDFBtn.addEventListener('click', exportToPDF);
    if (exportPrintBtn) exportPrintBtn.addEventListener('click', printData);
    if (openSheetBtn) openSheetBtn.addEventListener('click', () => {
        window.open('https://docs.google.com/spreadsheets/d/18p84g-tjabX_yQSNXyZRceu8swZI6NyuN-FC1Mc-JKw/edit?usp=sharing', '_blank');
    });
    
    // Fixed: Safe checks before setting . checked property
    const showMarksCheckbox = $('#showOnlyWithMarks');
    const fourthSubjectCheckbox = $('#includeFourthSubject');
    const fourthSubjectSelect = $('#fourthSubjectSelect');
    
    if (showMarksCheckbox) {
        showMarksCheckbox.checked = showOnlyWithMarks;
        showMarksCheckbox.addEventListener('change', function(e) {
            showOnlyWithMarks = e.target.checked;
            localStorage.setItem(LS_SHOW_ONLY_MARKS, showOnlyWithMarks);
            processSubjectData();
            renderSubjectDashboard();
            showToast('সেটিংস সেভ করা হয়েছে');
        });
    }
    
    if (fourthSubjectCheckbox) {
        fourthSubjectCheckbox.checked = includeFourthSubject;
        fourthSubjectCheckbox.addEventListener('change', function(e) {
            includeFourthSubject = e.target.checked;
            localStorage.setItem(LS_INCLUDE_FOURTH, includeFourthSubject);
            updateFourthSubjectContainer();
            renderSubjectDashboard();
            showToast('সেটিংস সেভ করা হয়েছে');
        });
    }
    
    if (fourthSubjectSelect) {
        fourthSubjectSelect.value = fourthSubject;
        fourthSubjectSelect.addEventListener('change', function(e) {
            fourthSubject = e.target.value;
            localStorage.setItem(LS_FOURTH_SUBJECT, fourthSubject);
            renderSubjectDashboard();
            showToast('৪র্থ বিষয় সেভ করা হয়েছে');
        });
    }
    
    updateFourthSubjectContainer();
    
    const userManualBtn = $('#userManualBtn');
    if (userManualBtn) userManualBtn.addEventListener('click', showDocumentation);
}

function updateFourthSubjectContainer() {
    const container = $('#fourthSubjectContainer');
    if (container) {
        container.style.display = includeFourthSubject ? 'flex' : 'none';
    }
}

async function exportToExcel() {
    const dataType = $('#exportDataType').value;
    
    // বাংলা হেডার সহ CSV তৈরি
    const banglaHeaders = {
        'course': ['ক্রমিক', 'তারিখ', 'সময়', 'ব্রাঞ্চ মেরিট', 'কেন্দ্রীয় মেরিট'],
        'subject': ['ক্রমিক', 'তারিখ', 'বিষয়', 'সিলেবাস', 'মোট নম্বর', 'প্রাপ্ত নম্বর', 'ব্রাঞ্চ মেরিট', 'কেন্দ্রীয় মেরিট', 'শতকরা', 'GPA']
    };
    
    if (dataType === 'course') {
        const data = allEntries || [];
        const headers = banglaHeaders.course;
        const rows = data.map(d => [
            d.serial,
            formatDate(d.date),
            format12hr(d.time),
            d.branch,
            d.central
        ]);
        
        exportCSV(headers, rows, 'কোর্স_মেরিট_ডাটা.csv');
        return;
    }
    
    if (dataType === 'subject') {
        const data = subjectData || [];
        const headers = banglaHeaders.subject;
        const rows = data.map(d => {
            const percentage = d.obtained_marks ? ((d.obtained_marks / d.total_marks) * 100).toFixed(1) : '';
            const gpa = d.obtained_marks ? calculateSubjectGPA(d.obtained_marks, d.total_marks) : '';
            
            return [
                d.serial,
                formatDate(d.date),
                d.subject,
                d.syllabus,
                d.total_marks,
                d.obtained_marks || '',
                d.branch_merit || '',
                d.central_merit || '',
                percentage,
                gpa
            ];
        });
        
        exportCSV(headers, rows, 'বিষয়ভিত্তিক_ডাটা.csv');
        return;
    }
    
    if (dataType === 'all') {
        // Export course data
        const courseData = allEntries || [];
        const courseHeaders = banglaHeaders.course;
        const courseRows = courseData.map(d => [
            d.serial,
            formatDate(d.date),
            format12hr(d.time),
            d.branch,
            d.central
        ]);
        
        exportCSV(courseHeaders, courseRows, 'কোর্স_মেরিট_ডাটা.csv');
        
        // Export subject data separately
        setTimeout(() => {
            const subjectDataExport = subjectData || [];
            const subjectHeaders = banglaHeaders.subject;
            const subjectRows = subjectDataExport.map(d => {
                const percentage = d.obtained_marks ? ((d.obtained_marks / d.total_marks) * 100).toFixed(1) : '';
                const gpa = d.obtained_marks ? calculateSubjectGPA(d.obtained_marks, d.total_marks) : '';
                
                return [
                    d.serial,
                    formatDate(d.date),
                    d.subject,
                    d.syllabus,
                    d.total_marks,
                    d.obtained_marks || '',
                    d.branch_merit || '',
                    d.central_merit || '',
                    percentage,
                    gpa
                ];
            });
            
            exportCSV(subjectHeaders, subjectRows, 'বিষয়ভিত্তিক_ডাটা.csv');
        }, 500);
    }
}

function exportCSV(headers, rows, filename) {
    // CSV এ বাংলা সঠিকভাবে দেখানোর জন্য BOM (Byte Order Mark) যোগ করুন
    const BOM = "\uFEFF";
    
    // CSV কন্টেন্ট তৈরি
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => {
            // সেলটিতে কমা বা ডাবল কোট থাকলে এস্কেপ করুন
            if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"'))) {
                return `"${cell.replace(/"/g, '""')}"`;
            }
            return cell;
        }).join(','))
    ].join('\n');
    
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast(`${filename} ডাউনলোড করা হয়েছে`, 'success');
}

async function exportToPDF() {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) {
        showToast("PDF লাইব্রেরি লোড হচ্ছে...", "error");
        return;
    }
    
    const doc = new jsPDF('p', 'mm', 'a4');
    const dataType = $('#exportDataType').value;
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // হেডার
    doc.setFillColor(99, 102, 241);
    doc.rect(0, 0, pageWidth, 25, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text('Udvash FMT Tracker - Report', pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`রিপোর্ট তারিখ: ${new Date().toLocaleDateString('bn-BD')}`, pageWidth / 2, 22, { align: 'center' });
    
    // ফুটার লাইন
    doc.setDrawColor(99, 102, 241);
    doc.setLineWidth(0.5);
    doc.line(10, 280, pageWidth - 10, 280);
    
    // ফুটার টেক্সট
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    const footerText = `ডেভেলপার: Muhtasim Rahman (Turzo) | ওয়েবসাইট: https://mdturzo.odoo.com | Udvash FMT Tracker Pro V19.3`;
    doc.text(footerText, pageWidth / 2, 285, { align: 'center' });
    
    let startY = 35;
    
    // রিপোর্ট ডাটা
    doc.setFillColor(243, 244, 246);
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(12);
    
    if (dataType === 'course') {
        const data = allEntries || [];
        if (data.length === 0) {
            doc.text('কোন ডাটা পাওয়া যায়নি', pageWidth / 2, startY, { align: 'center' });
            doc.save('fmt_tracker_course.pdf');
            return;
        }
        
        const headers = [['ক্রমিক', 'তারিখ', 'সময়', 'ব্রাঞ্চ', 'কেন্দ্রীয়']];
        const rows = data.map(d => [
            toBanglaNumber(d.serial),
            formatDate(d.date),
            format12hr(d.time),
            toBanglaNumber(d.branch),
            toBanglaNumber(d.central)
        ]);
        
        doc.autoTable({
            head: headers,
            body: rows,
            startY: startY,
            theme: 'grid',
            headStyles: { 
                fillColor: [99, 102, 241],
                textColor: [255, 255, 255],
                fontStyle: 'bold'
            },
            styles: { 
                font: 'helvetica',
                fontSize: 10,
                cellPadding: 5,
                halign: 'center'
            },
            margin: { left: 10, right: 10 },
            columnStyles: {
                0: { cellWidth: 20 },
                1: { cellWidth: 30 },
                2: { cellWidth: 25 },
                3: { cellWidth: 30 },
                4: { cellWidth: 30 }
            }
        });
    } else if (dataType === 'subject') {
        const data = subjectData || [];
        if (data.length === 0) {
            doc.text('কোন ডাটা পাওয়া যায়নি', pageWidth / 2, startY, { align: 'center' });
            doc.save('fmt_tracker_subject.pdf');
            return;
        }
        
        const headers = [['ক্রমিক', 'তারিখ', 'বিষয়', 'নম্বর', 'ব্রাঞ্চ', 'কেন্দ্রীয়']];
        const rows = data.map(d => [
            toBanglaNumber(d.serial),
            formatDate(d.date),
            d.subject.length > 15 ? d.subject.substring(0, 12) + '...' : d.subject,
            d.obtained_marks !== null ? `${toBanglaNumber(d.obtained_marks)}/${toBanglaNumber(d.total_marks)}` : '-/-',
            d.branch_merit ? toBanglaNumber(d.branch_merit) : '-',
            d.central_merit ? toBanglaNumber(d.central_merit) : '-'
        ]);
        
        doc.autoTable({
            head: headers,
            body: rows,
            startY: startY,
            theme: 'grid',
            headStyles: { 
                fillColor: [99, 102, 241],
                textColor: [255, 255, 255],
                fontStyle: 'bold'
            },
            styles: { 
                font: 'helvetica',
                fontSize: 9,
                cellPadding: 4,
                halign: 'center'
            },
            margin: { left: 10, right: 10 },
            columnStyles: {
                0: { cellWidth: 15 },
                1: { cellWidth: 25 },
                2: { cellWidth: 40 },
                3: { cellWidth: 25 },
                4: { cellWidth: 20 },
                5: { cellWidth: 25 }
            }
        });
    }
    
    const fileName = `fmt_tracker_${dataType}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    showToast('পিডিএফ ডাউনলোড করা হয়েছে', 'success');
}

function printData() {
    const dataType = $('#exportDataType').value;
    let printContent = '';
    
    printContent += `
        <!DOCTYPE html>
        <html lang="bn">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Udvash FMT Tracker - Print</title>
            <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
            <style>
                @media print {
                    @page { 
                        margin: 10mm; 
                        size: A4;
                    }
                    body { 
                        margin: 0; 
                        font-family: 'Hind Siliguri', 'Inter', sans-serif;
                        color: #1f2937;
                        font-size: 12px;
                    }
                    .print-header {
                        text-align: center;
                        margin-bottom: 15px;
                        padding-bottom: 10px;
                        border-bottom: 2px solid #6366f1;
                        position: relative;
                    }
                    .print-title {
                        color: #6366f1;
                        margin: 0 0 5px 0;
                        font-size: 18px;
                        font-weight: 800;
                    }
                    .print-footer {
                        position: fixed;
                        bottom: 0;
                        left: 0;
                        right: 0;
                        background: #f3f4f6;
                        padding: 8px 15px;
                        border-top: 1px solid #e5e7eb;
                        font-size: 10px;
                        color: #6b7280;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 10px;
                        font-size: 11px;
                    }
                    th {
                        background-color: #6366f1;
                        color: white;
                        padding: 8px;
                        text-align: left;
                        font-weight: 600;
                        border: 1px solid #ddd;
                        font-size: 11px;
                    }
                    td {
                        padding: 6px;
                        border: 1px solid #ddd;
                        font-size: 11px;
                    }
                    tr:nth-child(even) {
                        background-color: #f9fafb;
                    }
                    .page-number {
                        text-align: right;
                        font-size: 9px;
                        color: #9ca3af;
                        margin-top: 15px;
                    }
                    .no-print { display: none; }
                }
                @media screen {
                    body { 
                        padding: 20px;
                        background: #f3f4f6;
                    }
                    .print-content {
                        background: white;
                        padding: 20px;
                        border-radius: 8px;
                        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                        max-width: 800px;
                        margin: 0 auto;
                    }
                }
            </style>
        </head>
        <body>
            <div class="print-content">
                <div class="print-header">
                    <h1 class="print-title">Udvash FMT Tracker Pro</h1>
                    <div style="font-size: 11px; color: #6b7280; display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span>রিপোর্ট তারিখ: ${new Date().toLocaleDateString('bn-BD')}</span>
                        <span>ডাটা টাইপ: ${dataType === 'course' ? 'কোর্স মেরিট' : dataType === 'subject' ? 'বিষয়ভিত্তিক' : 'সব ডাটা'}</span>
                    </div>
                </div>
    `;
    
    if (dataType === 'course') {
        const data = allEntries || [];
        printContent += `
            <table>
                <thead>
                    <tr>
                        <th>ক্রমিক</th>
                        <th>তারিখ</th>
                        <th>সময়</th>
                        <th>ব্রাঞ্চ</th>
                        <th>কেন্দ্রীয়</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        data.forEach(d => {
            printContent += `
                <tr>
                    <td style="text-align: center;">${toBanglaNumber(d.serial)}</td>
                    <td>${formatDate(d.date)}</td>
                    <td>${format12hr(d.time)}</td>
                    <td style="text-align: center;">${toBanglaNumber(d.branch)}</td>
                    <td style="text-align: center;">${toBanglaNumber(d.central)}</td>
                </tr>
            `;
        });
        
        printContent += `
                </tbody>
            </table>
        `;
    } else if (dataType === 'subject') {
        const data = subjectData || [];
        printContent += `
            <table>
                <thead>
                    <tr>
                        <th>ক্রমিক</th>
                        <th>তারিখ</th>
                        <th>বিষয়</th>
                        <th>নম্বর</th>
                        <th>ব্রাঞ্চ</th>
                        <th>কেন্দ্রীয়</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        data.forEach(d => {
            const marksDisplay = d.obtained_marks !== null ? 
                `${toBanglaNumber(d.obtained_marks)}/${toBanglaNumber(d.total_marks)}` : '-/-';
            
            printContent += `
                <tr>
                    <td style="text-align: center;">${toBanglaNumber(d.serial)}</td>
                    <td>${formatDate(d.date)}</td>
                    <td>${d.subject}</td>
                    <td style="text-align: center;">${marksDisplay}</td>
                    <td style="text-align: center;">${d.branch_merit ? toBanglaNumber(d.branch_merit) : '-'}</td>
                    <td style="text-align: center;">${d.central_merit ? toBanglaNumber(d.central_merit) : '-'}</td>
                </tr>
            `;
        });
        
        printContent += `
                </tbody>
            </table>
        `;
    }
    
    printContent += `
                <div class="print-footer no-print">
                    <div>ডেভেলপার: Muhtasim Rahman (Turzo)</div>
                    <div>ওয়েবসাইট: https://mdturzo.odoo.com</div>
                    <div>Udvash FMT Tracker Pro V19.3</div>
                </div>
                <div class="page-number">
                    পাতা ১/১
                </div>
            </div>
            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(function() {
                        window.close();
                    }, 100);
                };
            </script>
        </body>
        </html>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
}

/* ==========================
📚 Section: 12 Documentation
========================== */

async function showDocumentation() {
    try {
        const response = await fetch('README.md');
        const markdown = await response.text();
        const html = marked.parse(markdown);
        
        $('#documentationContent').innerHTML = html;
        $('#documentationModal').classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    } catch (error) {
        console.error('Error loading documentation:', error);
        showToast('ডকুমেন্টেশন লোড করতে ব্যর্থ হয়েছে', 'error');
    }
}

function closeDocumentation() {
    $('#documentationModal').classList.add('hidden');
    document.body.style.overflow = 'auto';
}

/* ==========================
⚙️ Section: 13 Events & Init
========================== */

function initOfflineAndPWA() {
    if($("#closeOfflineAlert")) {
        $("#closeOfflineAlert").onclick = () => {
            isOfflineBannerDismissed = true;
            $("#offlineAlert").classList.add("hidden");
        };
    }

    window.addEventListener('online', () => {
        isOfflineBannerDismissed = false; 
        $("#offlineAlert")?.classList.add("hidden"); 
        fetchAllData(); 
        showToast("ইন্টারনেট সংযোগ ফিরে এসেছে। ডাটা আপডেট হচ্ছে...", "success");
    });

    window.addEventListener('offline', () => {
        if(!isOfflineBannerDismissed) $("#offlineAlert")?.classList.remove("hidden");
        showToast("ইন্টারনেট সংযোগ বিচ্ছিন্ন", "error");
    });

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault(); 
        deferredPrompt = e;
        
        const installCards = $$('.install-section');
        installCards.forEach(installCard => {
            if(installCard) {
                installCard.classList.remove("hidden");
                const btn = installCard.querySelector("button");
                if(btn) btn.onclick = async () => {
                    if (deferredPrompt) {
                        deferredPrompt.prompt();
                        const { outcome } = await deferredPrompt.userChoice;
                        if (outcome === 'accepted') {
                            installCard.classList.add("hidden");
                            showToast("অ্যাপ সফলভাবে ইনস্টল হয়েছে!", "success");
                        }
                        deferredPrompt = null;
                    }
                };
            }
        });
    });
}

function setupEvents() {
    // 1. PIN Inputs
    $$(".key-btn").forEach(btn => btn.onclick = () => {
        if(navigator.vibrate) navigator.vibrate(20);
        handleKeyPress(btn.dataset.key);
    });
    
    const pinInput = $("#pinInput");
    if (pinInput) pinInput.addEventListener("input", e => handlePinInput(e.target.value));
    
    // 2. Global Keyboard
    document.addEventListener("keydown", (e) => {
        if ($("#pinGate").classList.contains("hidden")) return;
        if (e.ctrlKey || e.altKey || e.metaKey || (e.key.length > 1 && e.key !== "Backspace" && e.key !== "Enter")) return;

        if (/^[0-9]$/.test(e.key)) {
            handleKeyPress(e.key);
            e.preventDefault();
        } else if (e.key === "Backspace" || e.key === "Enter") {
            handleKeyPress(e.key);
            e.preventDefault();
        }
        $("#pinInput")?.focus();
    });

    // 3. Settings Toggles
    if ($("#pinAutoToggleSet")) $("#pinAutoToggleSet").onchange = e => {
        autoPinVerify = e.target.checked;
        localStorage.setItem(LS_PIN_AUTO, autoPinVerify);
        showToast(autoPinVerify ? "অটো পিন চালু" : "ম্যানুয়াল পিন চালু");
    };
    if ($("#pinViewToggle")) $("#pinViewToggle").onchange = toggleLockPinView;

    const handleTheme = isDark => {
        document.body.classList.toggle("dark-theme", isDark);
        if ($("#darkToggleSet")) $("#darkToggleSet").checked = isDark;
        localStorage.setItem(LS_THEME, isDark ? "dark" : "light");
    };
    if ($("#pinThemeToggle")) $("#pinThemeToggle").onclick = () => handleTheme(!document.body.classList.contains("dark-theme"));
    $("#themeToggle").onclick = () => handleTheme(!document.body.classList.contains("dark-theme"));
    if ($("#darkToggleSet")) $("#darkToggleSet").onchange = e => handleTheme(e.target.checked);

    // 4. Navigation
    $$(".tabBtn, .m-nav-link").forEach(btn => {
        btn.onclick = () => {
            const target = btn.dataset.target;
            $$(".tab-item").forEach(t => t.classList.toggle("hidden", t.id !== target));
            $$(".tabBtn").forEach(b => b.classList.toggle("active", b.dataset.target === target));
            $$(".m-nav-link").forEach(b => b.classList.toggle("active", b.dataset.target === target));
            
            updateViewTitle();
            
            // মোড সুইচার এবং ফিল্টার বার শো/হাইড
            const showFilter = (target === "tabTable" || target === "tabGraph");
            if ($("#filterBar")) $("#filterBar").classList.toggle("hidden", !showFilter || appMode !== 'course');
            if ($("#subjectFilterBar")) $("#subjectFilterBar").classList.toggle("hidden", !showFilter || appMode !== 'subject');
            
            if (window.innerWidth < 768) $("#sidebar").classList.add("collapsed");
            if (target === "tabGraph") {
                if (appMode === 'course') renderDashboard();
                else renderSubjectDashboard();
            }
        };
    });

    // 5. Mode Switcher
    if ($("#btnModeCourse")) $("#btnModeCourse").onclick = () => switchMode('course');
    if ($("#btnModeSubject")) $("#btnModeSubject").onclick = () => switchMode('subject');
    if ($("#btnModeCourseHeader")) $("#btnModeCourseHeader").onclick = () => switchMode('course');
    if ($("#btnModeSubjectHeader")) $("#btnModeSubjectHeader").onclick = () => switchMode('subject');

    // 6. Course Filters
    ["yearSelect", "monthSelect", "startDate", "endDate"].forEach(id => {
        const element = $(`#${id}`);
        if (element) element.onchange = renderDashboard;
    });
    
    $("#resetFilters").onclick = () => {
        ["yearSelect", "monthSelect", "startDate", "endDate"].forEach(id => {
            const element = $(`#${id}`);
            if (element) element.value = "";
        });
        renderDashboard();
        showToast("ফিল্টার রিসেট");
    };
    
    $("#refreshDataBtn").onclick = async () => { 
        await fetchAllData(); 
        showToast("ডাটা রিফ্রেশ করা হয়েছে", "success"); 
    };
    $("#saveEntry").onclick = submitEntry;

    // 7. Subject Events
    if ($("#subjectSelect")) $("#subjectSelect").addEventListener('change', updateSubjectInfoCard);
    if ($("#btnSaveSubject")) $("#btnSaveSubject").addEventListener('click', submitSubjectEntry);
    
    // Subject Filters
    ['subjectFilter', 'smartFilter', 'subjectYearSelect', 'subjectMonthSelect'].forEach(id => {
        const element = $(`#${id}`);
        if (element) element.addEventListener('change', () => renderSubjectDashboard());
    });
    
    if ($("#resetSubjectFilters")) $("#resetSubjectFilters").addEventListener('click', () => {
        ['subjectFilter', 'smartFilter', 'subjectYearSelect', 'subjectMonthSelect'].forEach(id => {
            const element = $(`#${id}`);
            if (element) element.value = '';
        });
        renderSubjectDashboard();
        showToast('ফিল্টার রিসেট করা হয়েছে');
    });

    // 8. Notifications
    $('#addTimeBtn').onclick = () => {
        const t = $('#notifTime').value;
        if (!t) return showToast("সময় নির্বাচন করুন", "error");
        if (notifTimes.includes(t)) return showToast("এই সময়টি আগে থেকেই আছে", "error");
        notifTimes.push(t);
        localStorage.setItem(LS_NOTIFS, JSON.stringify(notifTimes));
        renderReminders();
        showToast(`নতুন রিমাইন্ডার যোগ হয়েছে (${format12hr(t)})`, "success");
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

    // 9. Misc
    $("#useCurrentTimeToggle").onchange = e => $("#manualInputArea").classList.toggle("hidden", e.target.checked);
    $("#changePinBtn").onclick = changePin;
    $('#factoryResetBtn').onclick = showResetStep1;
    if ($("#closeSidebar")) $("#closeSidebar").onclick = () => $("#sidebar").classList.add("collapsed");
    if ($("#mainLogo")) $("#mainLogo").onclick = () => $("#sidebar").classList.toggle("collapsed");

    // 10. Export Functions
    initExportFunctions();

    // 11. Infinite Scroll
    window.addEventListener("scroll", () => {
        if (appMode === 'course' && pMode === "infinite" && !$("#endMessage").classList.contains("hidden")) return;
        if (appMode === 'course' && pMode === "infinite") {
            if (document.documentElement.scrollTop + document.documentElement.clientHeight >= document.documentElement.scrollHeight - 50) {
                loadMoreInfinite();
            }
        }
        if (appMode === 'subject' && subjectPMode === "infinite" && !$("#subjectEndMessage").classList.contains("hidden")) return;
        if (appMode === 'subject' && subjectPMode === "infinite") {
            if (document.documentElement.scrollTop + document.documentElement.clientHeight >= document.documentElement.scrollHeight - 50) {
                loadMoreSubjectInfinite();
            }
        }
    });

    // 12. User Activity Tracking
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach(event => {
        document.addEventListener(event, resetInactivityTimer);
    });
    
    // 13. Float number support for subject marks
    $('#inpSubObtained').addEventListener('input', function(e) {
        this.value = this.value.replace(/[^0-9.]/g, '');
    });
    
    // 14. Close modals on outside click
    document.addEventListener('click', function(event) {
        // Close documentation modal
        const docModal = $('#documentationModal');
        if (docModal && !docModal.contains(event.target) && event.target.id !== 'userManualBtn' && !event.target.closest('#userManualBtn')) {
            closeDocumentation();
        }
        
        // Close row action modal
        const actionModal = $('#rowActionModal');
        if (actionModal && !actionModal.contains(event.target) && !event.target.closest('.dropdown-toggle')) {
            actionModal.classList.add('hidden');
        }
        
        // Close edit modal
        const editModal = $('#editModal');
        if (editModal && !editModal.contains(event.target)) {
            closeEditModal();
        }
    });
    
    // 15. Escape key to close modals
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeModal();
            closeDocumentation();
            closeEditModal();
            $('#rowActionModal').classList.add('hidden');
        }
    });
}

// ---- ( App Entry Point ) ----
document.addEventListener("DOMContentLoaded", () => {
    // Set dark theme immediately if needed
    const savedTheme = localStorage.getItem(LS_THEME);
    if (savedTheme === "dark") {
        document.body.classList.add("dark-theme");
    }
    
    // 1. Detect device theme
    detectDeviceTheme();
    
    // 2. Setup All Events
    initOfflineAndPWA();
    if ($("#pinAutoToggleSet")) $("#pinAutoToggleSet").checked = autoPinVerify;
    setupEvents();
    renderReminders();
    updateDateDisplay();
    
    // 3. Set initial mode UI
    initializeAppMode();
    
    // 4. Initial Focus
    if (window.innerWidth > 992) $("#pinInput")?.focus();
    
    // 5. Init Pagination UI
    const rowSelector = $("#rowsPerPage");
    if (rowSelector) rowSelector.value = pRowsPerPage === 999999 ? "all" : pRowsPerPage;
    
    const subjectRowSelector = $("#subjectRowsPerPage");
    if (subjectRowSelector) subjectRowSelector.value = subjectPRowsPerPage === 999999 ? "all" : subjectPRowsPerPage;
    
    $$(".p-btn").forEach(b => b.classList.toggle("active", b.getAttribute("onclick").includes(pMode)));
    
    // 6. Start notification checks
    setInterval(checkNotifications, 60000); // প্রতি মিনিটে চেক
    
    // 7. Setup auto refresh
    setupAutoRefresh();
    
    // 8. Reset inactivity timer
    resetInactivityTimer();
    
    // 9. Check install state
    setTimeout(checkInstallState, 1000);
});

// ---- ( Service Worker ) ----
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(() => console.log('SW Ready'))
            .catch(err => console.log('SW Fail', err));
    });
}

/* ==========================
🔧 Section: 14 Utility Functions
========================== */

// টগল পাসওয়ার্ড ভিজিবিলিটি
window.togglePass = (id) => {
    const input = $(`#${id}`);
    const toggle = input.nextElementSibling;
    if (input.type === "password") {
        input.type = "text";
        toggle.innerHTML = '<i class="fas fa-eye-slash"></i>';
    } else {
        input.type = "password";
        toggle.innerHTML = '<i class="fas fa-eye"></i>';
    }
};

// PWA ইনস্টল স্টেট চেক
function checkInstallState() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

    if (isStandalone) {
        const homeCard = document.getElementById('homeInstallCard');
        if (homeCard) homeCard.classList.add('hidden');

        const settingsCard = document.getElementById('pwaInstallBtn');
        if (settingsCard) {
            const title = settingsCard.querySelector('.install-text h3');
            const desc = settingsCard.querySelector('.install-text p');
            const icon = settingsCard.querySelector('.install-icon i');
            const btn = settingsCard.querySelector('.install-btn');

            if (title) title.innerText = "অ্যাপ সক্রিয় আছে";
            if (desc) desc.innerText = "আপনি অ্যাপ ভার্সন ব্যবহার করছেন।";
            if (icon) {
                icon.className = "fas fa-check-circle";
                icon.parentElement.style.background = "rgba(16, 185, 129, 0.2)";
                icon.style.color = "#10b981";
            }
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-check"></i> Installed';
                btn.classList.add('btn-installed-disabled');
            }
        }
    }
}

// চার্ট ডাউনলোড ফাংশন (প্লেসহোল্ডার)
window.downloadChart = (chartId) => {
    showToast("চার্ট ডাউনলোড ফিচারটি শীঘ্রই আসছে...", "default");
};

// বাংলা তারিখ ফরম্যাট
function formatBanglaDate(dateStr) {
    if (!dateStr) return '--/--/----';
    const [year, month, day] = dateStr.split('-');
    const banglaMonths = [
        'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
        'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
    ];
    const monthName = banglaMonths[parseInt(month) - 1] || month;
    return `${toBanglaNumber(day)} ${monthName}, ${toBanglaNumber(year)}`;
}

// সার্ভিস ওয়ার্কার আপডেট
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('sw.js').then(function(registration) {
            console.log('ServiceWorker registration successful');
        }, function(err) {
            console.log('ServiceWorker registration failed: ', err);
        });
    });
}