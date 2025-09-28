/**
 * Firebase Integration for Legal Case Management System v2.0
 * ملف ربط نظام إدارة الدعاوى مع قاعدة بيانات Firebase - التخزين في الوقت الحقيقي
 * Firebase v12.3.0 with Realtime Database
 */

class FirebaseManager {
    constructor() {
        this.app = null;
        this.database = null;
        this.analytics = null;
        this.isConnected = false;
        this.connectionStatus = 'disconnected'; // 'disconnected', 'connecting', 'connected', 'error'
        this.realtimeListeners = new Map(); // لتتبع المستمعين النشطين
        
        this.firebaseConfig = {
            apiKey: "AIzaSyDGpAHia_wEmrhnmYjrPf1n1TrAzwEMiAI",
            authDomain: "messageemeapp.firebaseapp.com",
            databaseURL: "https://messageemeapp-default-rtdb.firebaseio.com",
            projectId: "messageemeapp",
            storageBucket: "messageemeapp.appspot.com",
            messagingSenderId: "255034474844",
            appId: "1:255034474844:web:5e3b7a6bc4b2fb94cc4199",
            measurementId: "G-4QBEWRC583"
        };
        
        this.initializeFirebaseUI();
        this.loadFirebaseSDK();
    }

    // تحميل Firebase SDK v12.3.0 بشكل ديناميكي
    async loadFirebaseSDK() {
        try {
            // تحميل Firebase App
            if (!window.firebase) {
                await this.loadScript('https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js');
                await this.loadScript('https://www.gstatic.com/firebasejs/12.3.0/firebase-database.js');
                await this.loadScript('https://www.gstatic.com/firebasejs/12.3.0/firebase-analytics.js');
            }
            
            console.log('Firebase SDK v12.3.0 تم تحميله بنجاح');
        } catch (error) {
            console.error('خطأ في تحميل Firebase SDK:', error);
        }
    }

    // دالة مساعدة لتحميل السكريبت
    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.type = 'module';
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // إنشاء واجهة Firebase في الهيدر
    initializeFirebaseUI() {
        const headerRight = document.querySelector('.header-right');
        if (headerRight) {
            const firebaseButton = document.createElement('div');
            firebaseButton.className = 'firebase-connection';
            firebaseButton.id = 'firebase-connection-btn';
            firebaseButton.innerHTML = `
                <div class="firebase-icon" onclick="firebaseManager.toggleConnection()" title="Firebase Realtime Database">
                    <i class="fab fa-google" id="firebase-icon"></i>
                    <span class="firebase-status" id="firebase-status">منقطع</span>
                    <div class="realtime-indicator" id="realtime-indicator"></div>
                </div>
            `;
            
            // إضافة الأنماط المحدثة
            this.addFirebaseStyles();
            
            // إدراج قبل أيقونة الإشعارات
            const notificationBell = headerRight.querySelector('.notification-bell');
            headerRight.insertBefore(firebaseButton, notificationBell);
        }
    }

    // إضافة أنماط Firebase المحدثة
    addFirebaseStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .firebase-connection {
                display: flex;
                align-items: center;
                margin-left: 1rem;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .firebase-icon {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.75rem 1rem;
                border-radius: 0.75rem;
                background: var(--gray-100);
                transition: all 0.3s ease;
                position: relative;
            }

            .firebase-icon:hover {
                background: var(--primary-blue-light);
                transform: scale(1.05);
            }

            .firebase-icon i {
                font-size: 1.25rem;
                transition: all 0.3s ease;
            }

            .firebase-status {
                font-size: 0.875rem;
                font-weight: 600;
                transition: all 0.3s ease;
            }

            /* مؤشر الوقت الحقيقي */
            .realtime-indicator {
                position: absolute;
                top: -2px;
                right: -2px;
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: var(--error-red);
                border: 2px solid white;
                transition: all 0.3s ease;
            }

            .realtime-indicator.active {
                background: var(--success-green);
                animation: realtimePulse 2s infinite;
            }

            @keyframes realtimePulse {
                0%, 100% { 
                    transform: scale(1);
                    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
                }
                50% { 
                    transform: scale(1.2);
                    box-shadow: 0 0 0 4px rgba(16, 185, 129, 0);
                }
            }

            /* حالات الاتصال */
            .firebase-connection.disconnected .firebase-icon {
                background: var(--error-red-light);
                border: 1px solid var(--error-red);
            }

            .firebase-connection.disconnected i {
                color: var(--error-red);
            }

            .firebase-connection.disconnected .firebase-status {
                color: var(--error-red);
            }

            .firebase-connection.connecting .firebase-icon {
                background: var(--warning-yellow-light);
                border: 1px solid var(--warning-yellow);
            }

            .firebase-connection.connecting i {
                color: var(--warning-yellow);
                animation: pulse 1s infinite;
            }

            .firebase-connection.connecting .firebase-status {
                color: var(--warning-yellow);
            }

            .firebase-connection.connected .firebase-icon {
                background: var(--success-green-light);
                border: 1px solid var(--success-green);
            }

            .firebase-connection.connected i {
                color: var(--success-green);
            }

            .firebase-connection.connected .firebase-status {
                color: var(--success-green);
            }

            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
            }

            /* أنماط مودال Firebase المحدثة */
            .firebase-modal {
                max-width: 600px;
            }

            .connection-info {
                display: grid;
                grid-template-columns: 1fr 1fr 1fr;
                gap: 1rem;
                margin-bottom: 2rem;
            }

            .info-card {
                padding: 1rem;
                background: var(--gray-50);
                border-radius: 0.5rem;
                border: 1px solid var(--gray-200);
                text-align: center;
                position: relative;
            }

            .info-card.success {
                background: var(--success-green-light);
                border-color: var(--success-green);
            }

            .info-card.error {
                background: var(--error-red-light);
                border-color: var(--error-red);
            }

            .sync-progress {
                margin: 1rem 0;
                text-align: center;
            }

            .progress-bar {
                width: 100%;
                height: 8px;
                background: var(--gray-200);
                border-radius: 4px;
                overflow: hidden;
                margin-bottom: 0.5rem;
            }

            .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, var(--primary-blue), var(--success-green));
                border-radius: 4px;
                transition: width 0.3s ease;
                width: 0%;
                position: relative;
            }

            .progress-fill::after {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
                animation: shimmer 1.5s infinite;
            }

            @keyframes shimmer {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
            }

            .realtime-status {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 1rem;
                background: var(--primary-blue-light);
                border-radius: 0.75rem;
                margin: 1rem 0;
                border: 1px solid var(--primary-blue);
            }

            .realtime-status.active {
                background: var(--success-green-light);
                border-color: var(--success-green);
            }

            .data-count {
                font-size: 1.25rem;
                font-weight: 800;
                color: var(--primary-blue);
            }
        `;
        document.head.appendChild(style);
    }

    // تبديل حالة الاتصال
    async toggleConnection() {
        if (this.isConnected) {
            await this.disconnect();
        } else {
            await this.connect();
        }
    }

    // الاتصال بـ Firebase مع Realtime Database
    async connect() {
        try {
            this.updateConnectionStatus('connecting', 'جاري الاتصال...');
            
            // تحميل Firebase إذا لم يكن محملاً
            await this.loadFirebaseSDK();
            await new Promise(resolve => setTimeout(resolve, 1000));

            // تهيئة Firebase
            const { initializeApp } = await import('https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js');
            const { getDatabase, ref, onValue, set, push, update, remove, onDisconnect } = await import('https://www.gstatic.com/firebasejs/12.3.0/firebase-database.js');
            const { getAnalytics } = await import('https://www.gstatic.com/firebasejs/12.3.0/firebase-analytics.js');
            
            this.app = initializeApp(this.firebaseConfig);
            this.database = getDatabase(this.app);
            this.analytics = getAnalytics(this.app);

            // اختبار الاتصال
            await this.testConnection();
            
            this.isConnected = true;
            this.updateConnectionStatus('connected', 'متصل - فوري');
            this.updateRealtimeIndicator(true);
            
            // إعداد المستمعين في الوقت الحقيقي
            await this.setupRealtimeListeners();
            
            // إعداد مراقبة الاتصال
            this.setupConnectionMonitoring();
            
            // عرض مودال الاتصال
            this.showConnectionModal();
            
            // تتبع حدث الاتصال في Analytics
            if (this.analytics) {
                // يمكن إضافة تتبع Analytics هنا
            }
            
            showNotification('تم الاتصال', 'تم الاتصال بقاعدة البيانات في الوقت الحقيقي', 'success');
            
        } catch (error) {
            console.error('خطأ في الاتصال بـ Firebase:', error);
            this.updateConnectionStatus('error', 'خطأ');
            this.updateRealtimeIndicator(false);
            showNotification('فشل الاتصال', 'فشل في الاتصال بقاعدة البيانات: ' + error.message, 'error');
        }
    }

    // قطع الاتصال
    async disconnect() {
        try {
            // إزالة جميع المستمعين
            this.removeAllListeners();
            
            this.isConnected = false;
            this.updateConnectionStatus('disconnected', 'منقطع');
            this.updateRealtimeIndicator(false);
            showNotification('تم قطع الاتصال', 'تم قطع الاتصال مع قاعدة البيانات', 'info');
        } catch (error) {
            console.error('خطأ في قطع الاتصال:', error);
        }
    }

    // اختبار الاتصال
    async testConnection() {
        return new Promise((resolve, reject) => {
            const { ref, get } = window.firebase.database;
            const connectedRef = ref(this.database, '.info/connected');
            
            get(connectedRef).then((snapshot) => {
                if (snapshot.val() === true) {
                    resolve(true);
                } else {
                    reject(new Error('فشل في اختبار الاتصال'));
                }
            }).catch(reject);
        });
    }

    // إعداد مراقبة الاتصال
    setupConnectionMonitoring() {
        const { ref, onValue } = window.firebase.database;
        const connectedRef = ref(this.database, '.info/connected');
        
        onValue(connectedRef, (snapshot) => {
            if (snapshot.val() === true) {
                if (this.isConnected) {
                    this.updateConnectionStatus('connected', 'متصل - فوري');
                    this.updateRealtimeIndicator(true);
                }
            } else {
                this.updateConnectionStatus('error', 'انقطع الاتصال');
                this.updateRealtimeIndicator(false);
                showNotification('انقطع الاتصال', 'انقطع الاتصال مع قاعدة البيانات', 'warning');
            }
        });
    }

    // تحديث مؤشر الوقت الحقيقي
    updateRealtimeIndicator(active) {
        const indicator = document.getElementById('realtime-indicator');
        if (indicator) {
            if (active) {
                indicator.classList.add('active');
            } else {
                indicator.classList.remove('active');
            }
        }
    }

    // إعداد المستمعين في الوقت الحقيقي
    async setupRealtimeListeners() {
        if (!this.isConnected || !this.database) return;

        const { ref, onValue } = window.firebase.database;

        // مراقبة تغييرات الدعاوى في الوقت الحقيقي
        const casesRef = ref(this.database, 'cases');
        const casesListener = onValue(casesRef, (snapshot) => {
            if (snapshot.exists()) {
                const firebaseCases = Object.values(snapshot.val());
                this.handleRealtimeUpdate('cases', firebaseCases);
            }
        }, (error) => {
            console.error('خطأ في مراقبة الدعاوى:', error);
        });
        this.realtimeListeners.set('cases', casesListener);

        // مراقبة تغييرات العملاء في الوقت الحقيقي
        const clientsRef = ref(this.database, 'clients');
        const clientsListener = onValue(clientsRef, (snapshot) => {
            if (snapshot.exists()) {
                const firebaseClients = Object.values(snapshot.val());
                this.handleRealtimeUpdate('clients', firebaseClients);
            }
        });
        this.realtimeListeners.set('clients', clientsListener);

        // مراقبة تغييرات الاستقطاعات في الوقت الحقيقي
        const deductionsRef = ref(this.database, 'deductions');
        const deductionsListener = onValue(deductionsRef, (snapshot) => {
            if (snapshot.exists()) {
                const firebaseDeductions = Object.values(snapshot.val());
                this.handleRealtimeUpdate('deductions', firebaseDeductions);
            }
        });
        this.realtimeListeners.set('deductions', deductionsListener);

        // مراقبة الإشعارات في الوقت الحقيقي
        const notificationsRef = ref(this.database, 'notifications');
        const notificationsListener = onValue(notificationsRef, (snapshot) => {
            if (snapshot.exists()) {
                this.updateNotificationCount();
                // عرض إشعار فوري للإشعارات الجديدة
                this.checkForNewNotifications(snapshot.val());
            }
        });
        this.realtimeListeners.set('notifications', notificationsListener);

        console.log('تم إعداد المستمعين في الوقت الحقيقي بنجاح');
    }

    // إزالة جميع المستمعين
    removeAllListeners() {
        this.realtimeListeners.forEach((listener, key) => {
            if (typeof listener === 'function') {
                listener(); // إزالة المستمع
            }
        });
        this.realtimeListeners.clear();
    }

    // معالجة التحديثات في الوقت الحقيقي
    handleRealtimeUpdate(dataType, remoteData) {
        let hasChanged = false;

        switch(dataType) {
            case 'cases':
                if (window.casesData && JSON.stringify(casesData) !== JSON.stringify(remoteData)) {
                    window.casesData = remoteData;
                    window.filteredCases = [...remoteData];
                    hasChanged = true;
                    if (typeof renderCasesTable === 'function') {
                        renderCasesTable();
                    }
                    if (typeof updateDashboardStats === 'function') {
                        updateDashboardStats();
                    }
                }
                break;
            case 'clients':
                if (window.clientsData && JSON.stringify(clientsData) !== JSON.stringify(remoteData)) {
                    window.clientsData = remoteData;
                    window.filteredClients = [...remoteData];
                    hasChanged = true;
                    if (typeof renderClientsTable === 'function') {
                        renderClientsTable();
                    }
                }
                break;
            case 'deductions':
                if (window.deductionsData && JSON.stringify(deductionsData) !== JSON.stringify(remoteData)) {
                    window.deductionsData = remoteData;
                    window.filteredDeductions = [...remoteData];
                    hasChanged = true;
                    if (typeof renderDeductionsTable === 'function') {
                        renderDeductionsTable();
                    }
                    if (typeof updateDashboardStats === 'function') {
                        updateDashboardStats();
                    }
                }
                break;
        }

        if (hasChanged) {
            // عرض إشعار تحديث بسيط
            this.showRealtimeUpdateNotification(dataType);
        }
    }

    // عرض إشعار تحديث في الوقت الحقيقي
    showRealtimeUpdateNotification(dataType) {
        const typeNames = {
            'cases': 'الدعاوى',
            'clients': 'العملاء',  
            'deductions': 'الاستقطاعات'
        };
        
        // إشعار مخفف لا يزعج المستخدم
        const indicator = document.getElementById('realtime-indicator');
        if (indicator) {
            indicator.style.animation = 'realtimePulse 0.5s ease-in-out 2';
        }
    }

    // فحص الإشعارات الجديدة
    checkForNewNotifications(notifications) {
        const notificationsList = Object.values(notifications);
        const unreadNotifications = notificationsList.filter(n => !n.read);
        
        // عرض أحدث إشعار إذا كان جديداً
        const latestNotification = notificationsList
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
            
        if (latestNotification && !latestNotification.read) {
            const timeDiff = Date.now() - new Date(latestNotification.timestamp).getTime();
            // عرض فقط الإشعارات التي عمرها أقل من 30 ثانية
            if (timeDiff < 30000) {
                this.showInstantNotification(latestNotification);
            }
        }
    }

    // عرض إشعار فوري
    showInstantNotification(notification) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            background: linear-gradient(135deg, var(--primary-blue), var(--success-green));
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 0.75rem;
            box-shadow: var(--shadow-xl);
            z-index: 10000;
            transform: translateX(-100%);
            transition: all 0.3s ease;
            max-width: 300px;
        `;
        
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.75rem;">
                <i class="fas fa-${this.getNotificationIcon(notification.type)}" style="font-size: 1.25rem;"></i>
                <div>
                    <div style="font-weight: 700; margin-bottom: 0.25rem;">${notification.title}</div>
                    <div style="font-size: 0.875rem; opacity: 0.9;">${notification.message}</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // عرض الإشعار
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 100);
        
        // إخفاء الإشعار بعد 4 ثواني
        setTimeout(() => {
            toast.style.transform = 'translateX(-100%)';
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, 4000);
        
        // إمكانية النقر للإغلاق
        toast.onclick = () => {
            toast.style.transform = 'translateX(-100%)';
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300);
        };
    }

    // تحديث حالة الاتصال في الواجهة
    updateConnectionStatus(status, text) {
        this.connectionStatus = status;
        const connectionBtn = document.getElementById('firebase-connection-btn');
        const statusText = document.getElementById('firebase-status');
        
        if (connectionBtn && statusText) {
            // إزالة جميع الفئات
            connectionBtn.classList.remove('disconnected', 'connecting', 'connected', 'error');
            
            // إضافة الفئة المناسبة
            connectionBtn.classList.add(status === 'error' ? 'disconnected' : status);
            statusText.textContent = text;
        }
    }

    // عرض مودال معلومات الاتصال المحدث
    showConnectionModal() {
        const modalContent = `
            <div class="firebase-modal">
                <div style="text-align: center; margin-bottom: 2rem;">
                    <i class="fab fa-google" style="font-size: 3rem; color: var(--success-green); margin-bottom: 1rem;"></i>
                    <h3 style="color: var(--success-green); margin-bottom: 0.5rem;">اتصال فوري نشط!</h3>
                    <p style="color: var(--gray-600);">Firebase Realtime Database v12.3.0</p>
                </div>

                <div class="realtime-status active">
                    <div class="realtime-indicator active" style="position: static; margin: 0;"></div>
                    <div>
                        <div style="font-weight: 700; color: var(--success-green);">التخزين في الوقت الحقيقي</div>
                        <div style="font-size: 0.875rem; color: var(--gray-600);">جميع التغييرات تتم مزامنتها فورياً</div>
                    </div>
                </div>

                <div class="connection-info">
                    <div class="info-card success">
                        <i class="fas fa-database" style="font-size: 2rem; color: var(--success-green); margin-bottom: 0.5rem; display: block;"></i>
                        <div style="font-weight: 700;">قاعدة البيانات</div>
                        <div style="font-size: 0.875rem; color: var(--gray-600);">متصلة</div>
                        <div class="data-count">${(window.casesData || []).length}</div>
                        <div style="font-size: 0.75rem; color: var(--gray-500);">دعاوى</div>
                    </div>
                    <div class="info-card success">
                        <i class="fas fa-sync" style="font-size: 2rem; color: var(--success-green); margin-bottom: 0.5rem; display: block;"></i>
                        <div style="font-weight: 700;">المزامنة الفورية</div>
                        <div style="font-size: 0.875rem; color: var(--gray-600);">نشطة</div>
                        <div class="data-count">${(window.clientsData || []).length}</div>
                        <div style="font-size: 0.75rem; color: var(--gray-500);">عملاء</div>
                    </div>
                    <div class="info-card success">
                        <i class="fas fa-chart-line" style="font-size: 2rem; color: var(--success-green); margin-bottom: 0.5rem; display: block;"></i>
                        <div style="font-weight: 700;">الإحصائيات المباشرة</div>
                        <div style="font-size: 0.875rem; color: var(--gray-600);">محدثة</div>
                        <div class="data-count">${(window.deductionsData || []).length}</div>
                        <div style="font-size: 0.75rem; color: var(--gray-500);">استقطاعات</div>
                    </div>
                </div>

                <div style="background: linear-gradient(135deg, var(--primary-blue-light), var(--success-green-light)); padding: 1.5rem; border-radius: 0.75rem; margin-bottom: 2rem; border: 1px solid var(--primary-blue);">
                    <h4 style="margin-bottom: 1rem; color: var(--primary-blue);">
                        <i class="fas fa-bolt"></i>
                        المزايا الفورية المتاحة:
                    </h4>
                    <ul style="list-style: none; margin: 0; padding: 0;">
                        <li style="margin-bottom: 0.5rem;">
                            <i class="fas fa-lightning-bolt" style="color: var(--warning-yellow); margin-left: 0.5rem;"></i>
                            حفظ فوري للبيانات في السحابة
                        </li>
                        <li style="margin-bottom: 0.5rem;">
                            <i class="fas fa-sync-alt" style="color: var(--success-green); margin-left: 0.5rem;"></i>
                            مزامنة لحظية للتغييرات
                        </li>
                        <li style="margin-bottom: 0.5rem;">
                            <i class="fas fa-bell" style="color: var(--primary-blue); margin-left: 0.5rem;"></i>
                            إشعارات في الوقت الفعلي
                        </li>
                        <li>
                            <i class="fas fa-shield-alt" style="color: var(--success-green); margin-left: 0.5rem;"></i>
                            نسخ احتياطية آمنة ومتواصلة
                        </li>
                    </ul>
                </div>

                <div style="display: flex; gap: 1rem; justify-content: center;">
                    <button class="btn btn-primary" onclick="firebaseManager.testRealtimeSync(); closeModal(this);">
                        <i class="fas fa-vial"></i>
                        اختبار المزامنة الفورية
                    </button>
                    <button class="btn btn-secondary" onclick="closeModal(this)">
                        <i class="fas fa-check"></i>
                        ممتاز
                    </button>
                </div>
            </div>
        `;

        createModal('Firebase Realtime Database', modalContent);
    }

    // اختبار المزامنة الفورية
    async testRealtimeSync() {
        try {
            const { ref, set } = window.firebase.database;
            const testRef = ref(this.database, 'test/sync');
            
            showNotification('جاري الاختبار', 'جاري اختبار المزامنة الفورية...', 'info');
            
            await set(testRef, {
                timestamp: Date.now(),
                message: 'اختبار المزامنة الفورية',
                success: true
            });
            
            setTimeout(() => {
                showNotification('نجح الاختبار', 'المزامنة الفورية تعمل بشكل مثالي!', 'success');
            }, 1000);
            
        } catch (error) {
            showNotification('فشل الاختبار', 'خطأ في اختبار المزامنة: ' + error.message, 'error');
        }
    }

    // إضافة البيانات إلى Firebase مع المزامنة الفورية
    async addToFirebase(path, data) {
        if (!this.isConnected) return null;

        try {
            const { ref, push, set } = window.firebase.database;
            const dataRef = ref(this.database, path);
            
            if (data.id) {
                // استخدام ID محدد
                const specificRef = ref(this.database, `${path}/${data.id}`);
                await set(specificRef, {
                    ...data,
                    firebaseId: data.id,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
                return data.id;
            } else {
                // إنشاء ID تلقائي
                const newRef = push(dataRef);
                await set(newRef, {
                    ...data,
                    firebaseId: newRef.key,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
                return newRef.key;
            }
        } catch (error) {
            console.error(`خطأ في إضافة البيانات إلى ${path}:`, error);
            throw error;
        }
    }

    // تحديث البيانات في Firebase
    async updateInFirebase(path, updates) {
        if (!this.isConnected) return;

        try {
            const { ref, update } = window.firebase.database;
            const updateData = {
                ...updates,
                updatedAt: new Date().toISOString()
            };
            
            await update(ref(this.database, path), updateData);
        } catch (error) {
            console.error(`خطأ في تحديث البيانات في ${path}:`, error);
            throw error;
        }
    }

    // حذف البيانات من Firebase
    async removeFromFirebase(path) {
        if (!this.isConnected) return;

        try {
            const { ref, remove } = window.firebase.database;
            await remove(ref(this.database, path));
        } catch (error) {
            console.error(`خطأ في حذف البيانات من ${path}:`, error);
            throw error;
        }
    }

    // إضافة دعوى جديدة مع المزامنة الفورية
    async addCase(caseData) {
        try {
            const firebaseId = await this.addToFirebase('cases', caseData);
            
            // إضافة إشعار فوري
            await this.addNotification({
                type: 'case_added',
                title: 'دعوى جديدة',
                message: `تم إضافة دعوى جديدة: ${caseData.caseNumber}`,
                caseId: caseData.id,
                timestamp: new Date().toISOString()
            });

            return firebaseId;
        } catch (error) {
            console.error('خطأ في إضافة الدعوى:', error);
            throw error;
        }
    }

    // تحديث دعوى مع المزامنة الفورية
    async updateCase(caseId, updates) {
        try {
            await this.updateInFirebase(`cases/${caseId}`, updates);
            
            // إضافة إشعار التحديث
            await this.addNotification({
                type: 'case_updated',
                title: 'تحديث دعوى',
                message: `تم تحديث الدعوى: ${updates.caseNumber || 'دعوى'}`,
                caseId: caseId,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('خطأ في تحديث الدعوى:', error);
            throw error;
        }
    }

    // حذف دعوى مع المزامنة الفورية
    async deleteCase(caseId, caseNumber) {
        try {
            await this.removeFromFirebase(`cases/${caseId}`);
            
            // إضافة إشعار الحذف
            await this.addNotification({
                type: 'case_deleted',
                title: 'حذف دعوى',
                message: `تم حذف الدعوى: ${caseNumber}`,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('خطأ في حذف الدعوى:', error);
            throw error;
        }
    }

    // إضافة عميل جديد
    async addClient(clientData) {
        try {
            const firebaseId = await this.addToFirebase('clients', clientData);
            
            await this.addNotification({
                type: 'client_added',
                title: 'عميل جديد',
                message: `تم إضافة عميل جديد: ${clientData.name}`,
                clientId: clientData.id,
                timestamp: new Date().toISOString()
            });

            return firebaseId;
        } catch (error) {
            console.error('خطأ في إضافة العميل:', error);
            throw error;
        }
    }

    // إضافة استقطاع جديد
    async addDeduction(deductionData) {
        try {
            const firebaseId = await this.addToFirebase('deductions', deductionData);
            
            await this.addNotification({
                type: 'deduction_added',
                title: 'استقطاع جديد',
                message: `تم إضافة استقطاع: ${deductionData.amount.toLocaleString('ar-EG')} د.ع`,
                deductionId: deductionData.id,
                caseNumber: deductionData.caseNumber,
                timestamp: new Date().toISOString()
            });

            return firebaseId;
        } catch (error) {
            console.error('خطأ في إضافة الاستقطاع:', error);
            throw error;
        }
    }

    // إضافة إشعار فوري
    async addNotification(notificationData) {
        if (!this.isConnected) return;

        try {
            const firebaseId = await this.addToFirebase('notifications', {
                ...notificationData,
                read: false
            });

            return firebaseId;
        } catch (error) {
            console.error('خطأ في إضافة الإشعار:', error);
        }
    }

    // تحديث عداد الإشعارات فورياً
    async updateNotificationCount() {
        if (!this.isConnected) return;

        try {
            const { ref, query, orderByChild, equalTo, get } = window.firebase.database;
            const notificationsRef = ref(this.database, 'notifications');
            const unreadQuery = query(notificationsRef, orderByChild('read'), equalTo(false));
            
            const snapshot = await get(unreadQuery);
            const unreadCount = snapshot.size || 0;
            
            const notificationBadge = document.getElementById('notification-count');
            if (notificationBadge) {
                notificationBadge.textContent = unreadCount;
                notificationBadge.style.display = unreadCount > 0 ? 'flex' : 'none';
            }
        } catch (error) {
            console.error('خطأ في تحديث عداد الإشعارات:', error);
        }
    }

    // جلب الإشعارات مع المزامنة الفورية
    async getNotifications() {
        if (!this.isConnected) return [];

        try {
            const { ref, query, orderByChild, limitToLast, get } = window.firebase.database;
            const notificationsRef = ref(this.database, 'notifications');
            const recentQuery = query(notificationsRef, orderByChild('timestamp'), limitToLast(50));
            
            const snapshot = await get(recentQuery);
            const notifications = [];
            
            snapshot.forEach(child => {
                notifications.unshift({
                    id: child.key,
                    ...child.val()
                });
            });

            return notifications;
        } catch (error) {
            console.error('خطأ في جلب الإشعارات:', error);
            return [];
        }
    }

    // تحديد إشعار كمقروء فورياً
    async markNotificationAsRead(notificationId) {
        if (!this.isConnected) return;

        try {
            await this.updateInFirebase(`notifications/${notificationId}`, { 
                read: true,
                readAt: new Date().toISOString()
            });
        } catch (error) {
            console.error('خطأ في تحديد الإشعار كمقروء:', error);
        }
    }

    // مزامنة جميع البيانات فورياً
    async syncAllDataRealtime() {
        if (!this.isConnected) return;

        try {
            const { ref, set } = window.firebase.database;
            
            // مزامنة فورية لجميع البيانات
            const promises = [];
            
            if (window.casesData) {
                promises.push(set(ref(this.database, 'cases'), this.convertArrayToObject(window.casesData)));
            }
            
            if (window.clientsData) {
                promises.push(set(ref(this.database, 'clients'), this.convertArrayToObject(window.clientsData)));
            }
            
            if (window.deductionsData) {
                promises.push(set(ref(this.database, 'deductions'), this.convertArrayToObject(window.deductionsData)));
            }
            
            // تحديث البيانات الوصفية
            promises.push(set(ref(this.database, 'metadata'), {
                lastSync: new Date().toISOString(),
                casesCount: (window.casesData || []).length,
                clientsCount: (window.clientsData || []).length,
                deductionsCount: (window.deductionsData || []).length
            }));
            
            await Promise.all(promises);
            
            showNotification('تمت المزامنة', 'تم مزامنة جميع البيانات فورياً', 'success');
        } catch (error) {
            console.error('خطأ في المزامنة الفورية:', error);
            throw error;
        }
    }

    // تحويل المصفوفة إلى كائن (مطلوب لـ Firebase Realtime Database)
    convertArrayToObject(array) {
        const obj = {};
        array.forEach(item => {
            obj[item.id || Math.random().toString(36)] = item;
        });
        return obj;
    }

    // وظائف مساعدة
    getNotificationIcon(type) {
        const icons = {
            'case_added': 'file-plus',
            'case_updated': 'edit',
            'case_deleted': 'trash',
            'client_added': 'user-plus',
            'deduction_added': 'coins'
        };
        return icons[type] || 'bell';
    }

    // إنشاء نسخة احتياطية فورية
    async createRealtimeBackup() {
        if (!this.isConnected) return;

        try {
            const backupData = {
                timestamp: new Date().toISOString(),
                version: '2.0.0-realtime',
                cases: window.casesData || [],
                clients: window.clientsData || [],
                deductions: window.deductionsData || [],
                settings: {
                    office: JSON.parse(localStorage.getItem('officeSettings') || '{}'),
                    notifications: JSON.parse(localStorage.getItem('notificationSettings') || '{}')
                }
            };

            const backupId = await this.addToFirebase('backups', backupData);
            
            showNotification('نسخة احتياطية', 'تم إنشاء النسخة الاحتياطية في الوقت الفعلي', 'success');
            
            return backupId;
        } catch (error) {
            console.error('خطأ في إنشاء النسخة الاحتياطية:', error);
            throw error;
        }
    }
}

// إنشاء مثيل Firebase Manager المحدث
const firebaseManager = new FirebaseManager();

// ربط الوظائف الحالية مع Firebase Realtime
(function() {
    // حفظ الوظائف الأصلية
    const originalSaveToLocalStorage = window.saveToLocalStorage;

    // استبدال وظيفة الحفظ المحلي بالمزامنة الفورية
    window.saveToLocalStorage = function() {
        // حفظ محلياً أولاً
        if (originalSaveToLocalStorage) {
            originalSaveToLocalStorage();
        }
        
        // مزامنة فورية مع Firebase
        if (firebaseManager.isConnected) {
            firebaseManager.syncAllDataRealtime().catch(console.error);
        }
    };

    // ربط وظائف الإضافة مع Firebase الفوري
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(() => {
            // ربط إضافة الدعاوى
            if (window.casesData) {
                const originalCasesData = window.casesData;
                Object.defineProperty(window, 'casesData', {
                    get: () => originalCasesData,
                    set: (value) => {
                        originalCasesData.length = 0;
                        originalCasesData.push(...value);
                        // مزامنة فورية
                        if (firebaseManager.isConnected) {
                            firebaseManager.syncAllDataRealtime().catch(console.error);
                        }
                    }
                });
            }

            // ربط الإشعارات الفورية
            const originalShowNotifications = window.showNotifications;
            window.showNotifications = async function() {
                if (firebaseManager.isConnected) {
                    try {
                        const firebaseNotifications = await firebaseManager.getNotifications();
                        if (firebaseNotifications.length > 0) {
                            displayFirebaseNotifications(firebaseNotifications);
                            return;
                        }
                    } catch (error) {
                        console.error('خطأ في جلب الإشعارات من Firebase:', error);
                    }
                }
                
                if (originalShowNotifications) {
                    originalShowNotifications();
                }
            };

        }, 1000);
    });

    // عرض إشعارات Firebase المحدثة
    function displayFirebaseNotifications(notifications) {
        const content = `
            <div style="max-height: 400px; overflow-y: auto;">
                <div style="padding: 1rem; background: linear-gradient(135deg, var(--primary-blue-light), var(--success-green-light)); border-radius: 0.75rem; margin-bottom: 1rem; text-align: center; border: 1px solid var(--primary-blue);">
                    <div style="display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                        <div class="realtime-indicator active" style="position: static; margin: 0;"></div>
                        <span style="font-weight: 700; color: var(--primary-blue);">إشعارات فورية</span>
                    </div>
                    <div style="font-size: 0.875rem; color: var(--gray-600);">تحديثات مباشرة من قاعدة البيانات</div>
                </div>
                ${notifications.map(notification => `
                    <div style="display: flex; align-items: flex-start; gap: 1rem; padding: 1rem; border-bottom: 1px solid var(--gray-200); transition: all 0.3s ease; ${!notification.read ? 'background: var(--primary-blue-light); border-left: 4px solid var(--primary-blue);' : ''}" 
                         onmouseover="this.style.background='var(--gray-50)'" 
                         onmouseout="this.style.background='${!notification.read ? 'var(--primary-blue-light)' : 'white'}'"
                         onclick="firebaseManager.markNotificationAsRead('${notification.id}')">
                        <div class="notification-icon" style="background: var(--${getNotificationColor(notification.type)}-light); color: var(--${getNotificationColor(notification.type)}); position: relative;">
                            <i class="fas fa-${firebaseManager.getNotificationIcon(notification.type)}"></i>
                            ${!notification.read ? '<div style="position: absolute; top: -2px; right: -2px; width: 6px; height: 6px; background: var(--error-red); border-radius: 50%;"></div>' : ''}
                        </div>
                        <div style="flex: 1;">
                            <div style="font-weight: 700; color: var(--gray-900); margin-bottom: 0.25rem;">${notification.title}</div>
                            <div style="color: var(--gray-600); font-size: 0.875rem; margin-bottom: 0.5rem;">${notification.message}</div>
                            <div style="color: var(--gray-500); font-size: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
                                <i class="fas fa-clock"></i>
                                ${formatFirebaseDate(notification.timestamp)}
                                ${!notification.read ? '<span style="color: var(--primary-blue); font-weight: 600;">• جديد</span>' : ''}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div style="padding: 1rem; border-top: 2px solid var(--gray-200); display: flex; gap: 1rem; justify-content: center;">
                <button class="btn btn-primary" onclick="markAllFirebaseNotificationsAsRead()">
                    <i class="fas fa-check-double"></i>
                    تحديد الكل كمقروء
                </button>
                <button class="btn btn-secondary" onclick="firebaseManager.testRealtimeSync()">
                    <i class="fas fa-bolt"></i>
                    اختبار فوري
                </button>
            </div>
        `;

        createModal('الإشعارات الفورية (Firebase)', content);
    }

    // وظائف مساعدة محدثة
    window.getNotificationColor = function(type) {
        const colors = {
            'case_added': 'success-green',
            'case_updated': 'primary-blue', 
            'case_deleted': 'error-red',
            'client_added': 'success-green',
            'deduction_added': 'warning-yellow'
        };
        return colors[type] || 'primary-blue';
    };

    window.formatFirebaseDate = function(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (seconds < 10) return 'الآن';
        if (seconds < 60) return `منذ ${seconds} ثانية`;
        if (minutes < 60) return `منذ ${minutes} دقيقة`;
        if (hours < 24) return `منذ ${hours} ساعة`;
        if (days < 7) return `منذ ${days} يوم`;
        return date.toLocaleDateString('ar-SA');
    };

    window.markAllFirebaseNotificationsAsRead = async function() {
        if (firebaseManager.isConnected) {
            try {
                const notifications = await firebaseManager.getNotifications();
                const unreadNotifications = notifications.filter(n => !n.read);
                
                const promises = unreadNotifications.map(notification => 
                    firebaseManager.markNotificationAsRead(notification.id)
                );
                
                await Promise.all(promises);
                
                showNotification('تم التحديث', 'تم تحديد جميع الإشعارات كمقروءة فورياً', 'success');
                closeModal(event.target);
            } catch (error) {
                showNotification('خطأ', 'فشل في تحديث الإشعارات', 'error');
            }
        }
    };

})();

console.log('Firebase Realtime Integration v2.0 تم تحميله بنجاح');