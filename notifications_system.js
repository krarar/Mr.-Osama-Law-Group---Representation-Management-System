/**
 * نظام الإشعارات المتقدم والتنبيهات الذكية
 * Advanced Notifications and Smart Alerts System
 * للربط مع تطبيق إدارة الدعاوى القضائية
 */

class NotificationsSystem {
    constructor() {
        this.notifications = [];
        this.alerts = [];
        this.unreadCount = 0;
        this.isInitialized = false;
        this.checkInterval = null;
        this.soundEnabled = true;
        this.notificationSound = null;

        // Firebase
        this.db = null;
        this.firebaseConfig = {
            apiKey: "AIzaSyDGpAHia_wEmrhnmYjrPf1n1TrAzwEMiAI",
            authDomain: "messageemeapp.firebaseapp.com",
            databaseURL: "https://messageemeapp-default-rtdb.firebaseio.com",
            projectId: "messageemeapp",
            storageBucket: "messageemeapp.appspot.com",
            messagingSenderId: "255034474844",
            appId: "1:255034474844:web:5e3b7a6bc4b2fb94cc4199"
        };

        // أنواع الإشعارات
        this.notificationTypes = {
            // إشعارات الدعاوى
            CASE_DELAYED: 'case_delayed',                   // دعوى متأخرة
            CASE_URGENT: 'case_urgent',                     // دعوى عاجلة
            HEARING_SOON: 'hearing_soon',                   // جلسة قريبة
            HEARING_TODAY: 'hearing_today',                 // جلسة اليوم
            HEARING_MISSED: 'hearing_missed',               // جلسة فائتة
            CASE_NO_UPDATE: 'case_no_update',               // لم يتم تحديث الدعوى
            CASE_STALE: 'case_stale',                       // دعوى قديمة
            EXECUTION_PENDING: 'execution_pending',         // تنفيذ معلق
            
            // إشعارات الاستقطاعات
            DEDUCTION_ADDED: 'deduction_added',             // استقطاع جديد
            DEDUCTION_DUE: 'deduction_due',                 // استقطاع مستحق
            PAYMENT_INCOMPLETE: 'payment_incomplete',       // دفعة غير مكتملة
            
            // إشعارات المحامين
            LAWYER_CASE_ASSIGNED: 'lawyer_case_assigned',   // تعيين دعوى للمحامي
            LAWYER_UPDATE: 'lawyer_update',                 // تحديث من محامي
            
            // إشعارات النظام
            SYSTEM_UPDATE: 'system_update',                 // تحديث النظام
            DATA_SYNC: 'data_sync',                         // مزامنة البيانات
            BACKUP_CREATED: 'backup_created'                // نسخة احتياطية جديدة
        };

        // أولويات الإشعارات
        this.priorities = {
            LOW: 'low',
            MEDIUM: 'medium',
            HIGH: 'high',
            CRITICAL: 'critical'
        };

        // فترات التحقق (بالأيام)
        this.thresholds = {
            HEARING_WARNING_DAYS: 3,        // تحذير قبل 3 أيام من الجلسة
            CASE_STALE_DAYS: 30,            // الدعوى قديمة بعد 30 يوم
            NO_UPDATE_DAYS: 15,             // لم يتم تحديث الدعوى منذ 15 يوم
            EXECUTION_DELAY_DAYS: 7         // تأخير في التنفيذ بعد 7 أيام
        };

        this.initializeSystem();
    }

    // تهيئة النظام
    async initializeSystem() {
        try {
            console.log('🔔 جاري تهيئة نظام الإشعارات...');
            
            await this.loadFirebaseSDK();
            await this.initializeFirebase();
            await this.loadNotifications();
            
            // بدء الفحص الدوري
            this.startPeriodicCheck();
            
            // إنشاء واجهة المستخدم
            this.createNotificationsUI();
            
            // فحص فوري عند بدء التشغيل
            await this.checkAllNotifications();
            
            this.isInitialized = true;
            console.log('✅ تم تهيئة نظام الإشعارات بنجاح');
            
        } catch (error) {
            console.error('❌ خطأ في تهيئة نظام الإشعارات:', error);
        }
    }

    // تحميل Firebase SDK
    async loadFirebaseSDK() {
        if (window.firebase) {
            console.log('✅ Firebase SDK موجود مسبقاً');
            return;
        }

        return new Promise((resolve, reject) => {
            const appScript = document.createElement('script');
            appScript.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js';
            appScript.onload = () => {
                const dbScript = document.createElement('script');
                dbScript.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js';
                dbScript.onload = () => resolve();
                dbScript.onerror = () => reject(new Error('فشل تحميل Firebase Database'));
                document.head.appendChild(dbScript);
            };
            appScript.onerror = () => reject(new Error('فشل تحميل Firebase App'));
            document.head.appendChild(appScript);
        });
    }

    // تهيئة Firebase
    async initializeFirebase() {
        try {
            if (!firebase.apps.length) {
                firebase.initializeApp(this.firebaseConfig);
            }
            this.db = firebase.database();
            console.log('✅ تم الاتصال بـ Firebase بنجاح');
        } catch (error) {
            console.error('❌ خطأ في الاتصال بـ Firebase:', error);
        }
    }

    // تحميل الإشعارات المحفوظة
    async loadNotifications() {
        try {
            // من localStorage
            const localNotifications = localStorage.getItem('notifications');
            if (localNotifications) {
                this.notifications = JSON.parse(localNotifications);
            }

            // من Firebase
            if (this.db) {
                const snapshot = await this.db.ref('notifications').limitToLast(100).once('value');
                if (snapshot.exists()) {
                    const firebaseNotifications = [];
                    snapshot.forEach(child => {
                        firebaseNotifications.push(child.val());
                    });
                    
                    // دمج الإشعارات
                    this.notifications = this.mergeNotifications(this.notifications, firebaseNotifications);
                }
            }

            this.updateUnreadCount();
            
        } catch (error) {
            console.error('خطأ في تحميل الإشعارات:', error);
        }
    }

    // دمج الإشعارات
    mergeNotifications(local, firebase) {
        const merged = [...local];
        
        firebase.forEach(fbNotif => {
            const exists = merged.find(n => n.id === fbNotif.id);
            if (!exists) {
                merged.push(fbNotif);
            }
        });

        // ترتيب حسب التاريخ (الأحدث أولاً)
        merged.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        return merged;
    }

    // ==================== فحص وإنشاء الإشعارات ====================

    // بدء الفحص الدوري
    startPeriodicCheck() {
        // فحص كل 5 دقائق
        this.checkInterval = setInterval(() => {
            this.checkAllNotifications();
        }, 5 * 60 * 1000);

        console.log('✅ بدأ الفحص الدوري للإشعارات');
    }

    // إيقاف الفحص الدوري
    stopPeriodicCheck() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }

    // فحص جميع الإشعارات
    async checkAllNotifications() {
        console.log('🔍 جاري فحص الإشعارات...');

        try {
            // الحصول على الدعاوى
            const cases = this.getCases();

            // فحص كل دعوى
            for (const caseData of cases) {
                await this.checkCaseNotifications(caseData);
            }

            // فحص إشعارات أخرى
            await this.checkSystemNotifications();

            // حفظ الإشعارات
            this.saveNotifications();

            console.log(`✅ تم فحص الإشعارات: ${this.notifications.length} إشعار`);

        } catch (error) {
            console.error('خطأ في فحص الإشعارات:', error);
        }
    }

    // فحص إشعارات دعوى محددة
    async checkCaseNotifications(caseData) {
        const now = new Date();

        // 1. فحص الجلسات القادمة
        if (caseData.nextHearingDate) {
            const hearingDate = new Date(caseData.nextHearingDate);
            const daysUntilHearing = Math.ceil((hearingDate - now) / (1000 * 60 * 60 * 24));

            // جلسة اليوم
            if (daysUntilHearing === 0) {
                this.createNotification({
                    type: this.notificationTypes.HEARING_TODAY,
                    priority: this.priorities.CRITICAL,
                    title: 'جلسة اليوم!',
                    message: `لديك جلسة اليوم للدعوى رقم ${caseData.caseNumber} - ${caseData.defendantName}`,
                    caseId: caseData.id,
                    actionRequired: true
                });
            }
            // جلسة قريبة (خلال 3 أيام)
            else if (daysUntilHearing > 0 && daysUntilHearing <= this.thresholds.HEARING_WARNING_DAYS) {
                this.createNotification({
                    type: this.notificationTypes.HEARING_SOON,
                    priority: this.priorities.HIGH,
                    title: 'جلسة قريبة',
                    message: `لديك جلسة بعد ${daysUntilHearing} يوم للدعوى رقم ${caseData.caseNumber}`,
                    caseId: caseData.id,
                    actionRequired: false
                });
            }
            // جلسة فائتة
            else if (daysUntilHearing < 0) {
                this.createNotification({
                    type: this.notificationTypes.HEARING_MISSED,
                    priority: this.priorities.CRITICAL,
                    title: 'جلسة فائتة!',
                    message: `فاتتك جلسة للدعوى رقم ${caseData.caseNumber} بتاريخ ${this.formatDate(hearingDate)}`,
                    caseId: caseData.id,
                    actionRequired: true
                });
            }
        }

        // 2. فحص تحديثات الدعوى
        if (caseData.lastUpdated) {
            const lastUpdate = new Date(caseData.lastUpdated);
            const daysSinceUpdate = Math.floor((now - lastUpdate) / (1000 * 60 * 60 * 24));

            // دعوى لم يتم تحديثها منذ فترة
            if (daysSinceUpdate >= this.thresholds.NO_UPDATE_DAYS) {
                this.createNotification({
                    type: this.notificationTypes.CASE_NO_UPDATE,
                    priority: this.priorities.MEDIUM,
                    title: 'دعوى تحتاج متابعة',
                    message: `لم يتم تحديث الدعوى رقم ${caseData.caseNumber} منذ ${daysSinceUpdate} يوم`,
                    caseId: caseData.id,
                    actionRequired: true
                });
            }
        }

        // 3. فحص الدعاوى القديمة
        if (caseData.createdAt) {
            const createdDate = new Date(caseData.createdAt);
            const daysSinceCreation = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));

            if (daysSinceCreation >= this.thresholds.CASE_STALE_DAYS && caseData.stage !== 'مكتملة') {
                this.createNotification({
                    type: this.notificationTypes.CASE_STALE,
                    priority: this.priorities.LOW,
                    title: 'دعوى قديمة',
                    message: `الدعوى رقم ${caseData.caseNumber} مفتوحة منذ ${daysSinceCreation} يوم`,
                    caseId: caseData.id,
                    actionRequired: false
                });
            }
        }

        // 4. فحص التنفيذ المعلق
        if (caseData.stage === 'التنفيذ' && caseData.executionStartDate) {
            const executionStart = new Date(caseData.executionStartDate);
            const daysSinceExecution = Math.floor((now - executionStart) / (1000 * 60 * 60 * 24));

            if (daysSinceExecution >= this.thresholds.EXECUTION_DELAY_DAYS) {
                this.createNotification({
                    type: this.notificationTypes.EXECUTION_PENDING,
                    priority: this.priorities.HIGH,
                    title: 'تنفيذ معلق',
                    message: `الدعوى رقم ${caseData.caseNumber} في مرحلة التنفيذ منذ ${daysSinceExecution} يوم`,
                    caseId: caseData.id,
                    actionRequired: true
                });
            }
        }

        // 5. فحص المبالغ غير المكتملة
        if (caseData.remainingAmount && caseData.remainingAmount > 0) {
            const remainingPercent = (caseData.remainingAmount / caseData.amount) * 100;
            
            if (remainingPercent > 50 && caseData.stage === 'التنفيذ') {
                this.createNotification({
                    type: this.notificationTypes.PAYMENT_INCOMPLETE,
                    priority: this.priorities.MEDIUM,
                    title: 'مبلغ غير مكتمل',
                    message: `الدعوى رقم ${caseData.caseNumber} - متبقي ${caseData.remainingAmount.toLocaleString()} د.ع (${remainingPercent.toFixed(0)}%)`,
                    caseId: caseData.id,
                    actionRequired: false
                });
            }
        }

        // 6. فحص الدعاوى العاجلة (حسب الأولوية)
        if (caseData.priority === 'عاجل') {
            this.createNotification({
                type: this.notificationTypes.CASE_URGENT,
                priority: this.priorities.HIGH,
                title: 'دعوى عاجلة',
                message: `الدعوى رقم ${caseData.caseNumber} مصنفة كعاجلة - ${caseData.defendantName}`,
                caseId: caseData.id,
                actionRequired: true
            });
        }
    }

    // فحص إشعارات النظام
    async checkSystemNotifications() {
        // فحص المزامنة مع Firebase
        if (this.db) {
            try {
                const lastSync = localStorage.getItem('lastFirebaseSync');
                if (lastSync) {
                    const lastSyncDate = new Date(lastSync);
                    const hoursSinceSync = (new Date() - lastSyncDate) / (1000 * 60 * 60);
                    
                    if (hoursSinceSync > 24) {
                        this.createNotification({
                            type: this.notificationTypes.DATA_SYNC,
                            priority: this.priorities.LOW,
                            title: 'تحديث المزامنة',
                            message: 'لم تتم المزامنة مع السحابة منذ 24 ساعة',
                            actionRequired: false
                        });
                    }
                }
            } catch (error) {
                console.error('خطأ في فحص المزامنة:', error);
            }
        }

        // فحص النسخ الاحتياطية
        const lastBackup = localStorage.getItem('lastBackupDate');
        if (lastBackup) {
            const lastBackupDate = new Date(lastBackup);
            const daysSinceBackup = (new Date() - lastBackupDate) / (1000 * 60 * 60 * 24);
            
            if (daysSinceBackup > 7) {
                this.createNotification({
                    type: this.notificationTypes.BACKUP_CREATED,
                    priority: this.priorities.MEDIUM,
                    title: 'نسخة احتياطية مطلوبة',
                    message: `آخر نسخة احتياطية كانت منذ ${Math.floor(daysSinceBackup)} يوم`,
                    actionRequired: true
                });
            }
        }
    }

    // إنشاء إشعار جديد
    createNotification(notificationData) {
        // التحقق من عدم وجود إشعار مماثل حديث
        const existingNotification = this.notifications.find(n => 
            n.type === notificationData.type &&
            n.caseId === notificationData.caseId &&
            !n.read &&
            (new Date() - new Date(n.timestamp)) < 24 * 60 * 60 * 1000 // خلال آخر 24 ساعة
        );

        if (existingNotification) {
            return existingNotification;
        }

        const notification = {
            id: this.generateNotificationId(),
            ...notificationData,
            timestamp: new Date().toISOString(),
            read: false,
            dismissed: false
        };

        this.notifications.unshift(notification);
        this.updateUnreadCount();

        // حفظ في Firebase
        if (this.db) {
            this.db.ref(`notifications/${notification.id}`).set(notification);
        }

        // عرض الإشعار
        this.displayNotification(notification);

        // تشغيل الصوت للإشعارات المهمة
        if (notification.priority === this.priorities.HIGH || 
            notification.priority === this.priorities.CRITICAL) {
            this.playNotificationSound();
        }

        return notification;
    }

    // ==================== إدارة الإشعارات ====================

    // تحديد إشعار كمقروء
    markAsRead(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification && !notification.read) {
            notification.read = true;
            this.updateUnreadCount();
            this.saveNotifications();

            // تحديث في Firebase
            if (this.db) {
                this.db.ref(`notifications/${notificationId}/read`).set(true);
            }
        }
    }

    // تحديد جميع الإشعارات كمقروءة
    markAllAsRead() {
        this.notifications.forEach(n => {
            if (!n.read) {
                n.read = true;
            }
        });

        this.updateUnreadCount();
        this.saveNotifications();

        // تحديث في Firebase
        if (this.db) {
            this.notifications.forEach(n => {
                this.db.ref(`notifications/${n.id}/read`).set(true);
            });
        }

        this.showToast('تم تحديد جميع الإشعارات كمقروءة', 'success');
    }

    // إخفاء إشعار
    dismissNotification(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification) {
            notification.dismissed = true;
            notification.read = true;
            this.updateUnreadCount();
            this.saveNotifications();

            // تحديث في Firebase
            if (this.db) {
                this.db.ref(`notifications/${notificationId}`).update({
                    dismissed: true,
                    read: true
                });
            }
        }
    }

    // حذف إشعار
    deleteNotification(notificationId) {
        const index = this.notifications.findIndex(n => n.id === notificationId);
        if (index !== -1) {
            this.notifications.splice(index, 1);
            this.updateUnreadCount();
            this.saveNotifications();

            // حذف من Firebase
            if (this.db) {
                this.db.ref(`notifications/${notificationId}`).remove();
            }
        }
    }

    // مسح جميع الإشعارات
    clearAllNotifications() {
        if (confirm('هل أنت متأكد من حذف جميع الإشعارات؟')) {
            this.notifications = [];
            this.updateUnreadCount();
            this.saveNotifications();

            // حذف من Firebase
            if (this.db) {
                this.db.ref('notifications').remove();
            }

            this.showToast('تم حذف جميع الإشعارات', 'success');
        }
    }

    // الحصول على الإشعارات حسب الأولوية
    getNotificationsByPriority(priority) {
        return this.notifications.filter(n => n.priority === priority && !n.dismissed);
    }

    // الحصول على الإشعارات غير المقروءة
    getUnreadNotifications() {
        return this.notifications.filter(n => !n.read && !n.dismissed);
    }

    // الحصول على إشعارات دعوى معينة
    getCaseNotifications(caseId) {
        return this.notifications.filter(n => n.caseId === caseId && !n.dismissed);
    }

    // تحديث عدد الإشعارات غير المقروءة
    updateUnreadCount() {
        this.unreadCount = this.notifications.filter(n => !n.read && !n.dismissed).length;
        this.updateNotificationBadge();
    }

    // ==================== واجهة المستخدم ====================

    // إنشاء واجهة المستخدم
    createNotificationsUI() {
        // تحديث زر الإشعارات الموجود
        const bellIcon = document.querySelector('.notification-bell');
        if (bellIcon) {
            bellIcon.addEventListener('click', () => this.showNotificationsPanel());
            this.updateNotificationBadge();
        }

        // إضافة أنماط CSS
        this.injectNotificationStyles();
    }

    // تحديث شارة الإشعارات
    updateNotificationBadge() {
        const badge = document.querySelector('.notification-badge');
        if (badge) {
            badge.textContent = this.unreadCount;
            badge.style.display = this.unreadCount > 0 ? 'flex' : 'none';
        }
    }

    // عرض لوحة الإشعارات
    showNotificationsPanel() {
        // إزالة اللوحة القديمة إن وجدت
        const existingPanel = document.querySelector('.notifications-panel-overlay');
        if (existingPanel) {
            existingPanel.remove();
            return;
        }

        const panel = document.createElement('div');
        panel.className = 'notifications-panel-overlay';
        panel.innerHTML = `
            <div class="notifications-panel">
                <div class="notifications-panel-header">
                    <h2>
                        <i class="fas fa-bell"></i>
                        الإشعارات
                        ${this.unreadCount > 0 ? `<span class="unread-count">${this.unreadCount}</span>` : ''}
                    </h2>
                    <div class="header-actions">
                        <button class="btn-mark-all-read" onclick="window.notificationsSystem.markAllAsRead()" title="تحديد الكل كمقروء">
                            <i class="fas fa-check-double"></i>
                        </button>
                        <button class="btn-clear-all" onclick="window.notificationsSystem.clearAllNotifications()" title="مسح الكل">
                            <i class="fas fa-trash"></i>
                        </button>
                        <button class="btn-refresh" onclick="window.notificationsSystem.checkAllNotifications()" title="تحديث">
                            <i class="fas fa-sync"></i>
                        </button>
                        <button class="btn-close" onclick="this.closest('.notifications-panel-overlay').remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>

                <div class="notifications-filters">
                    <button class="filter-btn active" data-filter="all">
                        الكل (${this.notifications.filter(n => !n.dismissed).length})
                    </button>
                    <button class="filter-btn" data-filter="unread">
                        غير مقروء (${this.unreadCount})
                    </button>
                    <button class="filter-btn" data-filter="critical">
                        عاجل (${this.getNotificationsByPriority(this.priorities.CRITICAL).length})
                    </button>
                    <button class="filter-btn" data-filter="action">
                        يحتاج إجراء (${this.notifications.filter(n => n.actionRequired && !n.dismissed).length})
                    </button>
                </div>

                <div class="notifications-list" id="notifications-list-container">
                    ${this.renderNotificationsList()}
                </div>
            </div>
        `;

        document.body.appendChild(panel);

        // تفعيل الفلاتر
        this.activateFilters(panel);

        // منع إغلاق اللوحة عند النقر داخلها
        panel.querySelector('.notifications-panel').addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // إغلاق عند النقر خارج اللوحة
        panel.addEventListener('click', () => {
            panel.remove();
        });
    }

    // رسم قائمة الإشعارات
    renderNotificationsList(filter = 'all') {
        let notifications = this.notifications.filter(n => !n.dismissed);

        // تطبيق الفلتر
        switch (filter) {
            case 'unread':
                notifications = notifications.filter(n => !n.read);
                break;
            case 'critical':
                notifications = notifications.filter(n => n.priority === this.priorities.CRITICAL);
                break;
            case 'action':
                notifications = notifications.filter(n => n.actionRequired);
                break;
        }

        if (notifications.length === 0) {
            return `
                <div class="no-notifications">
                    <i class="fas fa-bell-slash"></i>
                    <p>لا توجد إشعارات</p>
                </div>
            `;
        }

        let html = '';
        notifications.forEach(notification => {
            html += this.renderNotification(notification);
        });

        return html;
    }

    // رسم إشعار واحد
    renderNotification(notification) {
        const priorityClass = `priority-${notification.priority}`;
        const readClass = notification.read ? 'read' : '';
        const icon = this.getNotificationIcon(notification.type);

        return `
            <div class="notification-item ${priorityClass} ${readClass}" data-id="${notification.id}">
                <div class="notification-icon">
                    <i class="${icon}"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-header">
                        <h4>${notification.title}</h4>
                        <span class="notification-time">${this.getTimeAgo(notification.timestamp)}</span>
                    </div>
                    <p class="notification-message">${notification.message}</p>
                    ${notification.caseId ? `
                        <button class="btn-view-case" onclick="window.notificationsSystem.viewCase('${notification.caseId}')">
                            <i class="fas fa-eye"></i> عرض الدعوى
                        </button>
                    ` : ''}
                </div>
                <div class="notification-actions">
                    ${!notification.read ? `
                        <button class="btn-mark-read" onclick="window.notificationsSystem.markAsRead('${notification.id}')" title="تحديد كمقروء">
                            <i class="fas fa-check"></i>
                        </button>
                    ` : ''}
                    <button class="btn-dismiss" onclick="window.notificationsSystem.dismissNotification('${notification.id}')" title="إخفاء">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
        `;
    }

    // تفعيل الفلاتر
    activateFilters(panel) {
        const filterButtons = panel.querySelectorAll('.filter-btn');
        const listContainer = panel.querySelector('#notifications-list-container');

        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const filter = btn.dataset.filter;
                
                filterButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                listContainer.innerHTML = this.renderNotificationsList(filter);
            });
        });
    }

    // عرض إشعار منبثق
    displayNotification(notification) {
        // لا تعرض الإشعارات ذات الأولوية المنخفضة كمنبثقة
        if (notification.priority === this.priorities.LOW) {
            return;
        }

        const toast = document.createElement('div');
        toast.className = `notification-toast priority-${notification.priority}`;
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="${this.getNotificationIcon(notification.type)}"></i>
            </div>
            <div class="toast-content">
                <h4>${notification.title}</h4>
                <p>${notification.message}</p>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        document.body.appendChild(toast);

        // إزالة تلقائياً بعد فترة
        const duration = notification.priority === this.priorities.CRITICAL ? 10000 : 5000;
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    // عرض رسالة توست
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `simple-toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // عرض دعوى
    viewCase(caseId) {
        // هذه الوظيفة تعتمد على التطبيق الرئيسي
        console.log('عرض الدعوى:', caseId);
        
        // إغلاق لوحة الإشعارات
        const panel = document.querySelector('.notifications-panel-overlay');
        if (panel) panel.remove();

        // يمكن استدعاء وظيفة من التطبيق الرئيسي
        if (window.viewCase) {
            window.viewCase(caseId);
        }
    }

    // ==================== وظائف مساعدة ====================

    // الحصول على الدعاوى
    getCases() {
        // من localStorage
        const cases = localStorage.getItem('cases');
        return cases ? JSON.parse(cases) : [];
    }

    // توليد معرف إشعار
    generateNotificationId() {
        return 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // حفظ الإشعارات
    saveNotifications() {
        localStorage.setItem('notifications', JSON.stringify(this.notifications));
    }

    // الحصول على أيقونة الإشعار
    getNotificationIcon(type) {
        const icons = {
            case_delayed: 'fas fa-clock',
            case_urgent: 'fas fa-exclamation-triangle',
            hearing_soon: 'fas fa-calendar-alt',
            hearing_today: 'fas fa-calendar-day',
            hearing_missed: 'fas fa-calendar-times',
            case_no_update: 'fas fa-edit',
            case_stale: 'fas fa-archive',
            execution_pending: 'fas fa-hourglass-half',
            deduction_added: 'fas fa-dollar-sign',
            deduction_due: 'fas fa-money-bill-wave',
            payment_incomplete: 'fas fa-coins',
            lawyer_case_assigned: 'fas fa-user-tie',
            lawyer_update: 'fas fa-user-edit',
            system_update: 'fas fa-sync',
            data_sync: 'fas fa-cloud-upload-alt',
            backup_created: 'fas fa-database'
        };

        return icons[type] || 'fas fa-bell';
    }

    // حساب الوقت منذ الإشعار
    getTimeAgo(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diff = Math.floor((now - time) / 1000); // بالثواني

        if (diff < 60) return 'الآن';
        if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
        if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
        if (diff < 604800) return `منذ ${Math.floor(diff / 86400)} يوم`;
        
        return this.formatDate(timestamp);
    }

    // تنسيق التاريخ
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('ar-IQ', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // تشغيل صوت الإشعار
    playNotificationSound() {
        if (!this.soundEnabled) return;

        try {
            // يمكن إضافة ملف صوتي مخصص
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwPUKnk7bVlHQU2k9rxzHksBSV3x/DdkEALFF608OuoVRQLR6Dh8r1sIAUsgs7y2Ik3Bxto');
            audio.volume = 0.3;
            audio.play().catch(e => console.log('لا يمكن تشغيل الصوت:', e));
        } catch (error) {
            console.log('خطأ في تشغيل الصوت:', error);
        }
    }

    // تبديل الصوت
    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        localStorage.setItem('notificationSoundEnabled', this.soundEnabled);
        this.showToast(
            this.soundEnabled ? 'تم تفعيل صوت الإشعارات' : 'تم إيقاف صوت الإشعارات',
            'info'
        );
    }

    // إضافة أنماط CSS
    injectNotificationStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .notifications-panel-overlay {
                position: fixed;
                top: 0;
                right: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(5px);
                z-index: 10000;
                display: flex;
                justify-content: flex-end;
                animation: fadeIn 0.3s ease;
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            .notifications-panel {
                background: white;
                width: 450px;
                max-width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                box-shadow: -5px 0 30px rgba(0, 0, 0, 0.2);
                animation: slideInRight 0.3s ease;
            }

            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                }
                to {
                    transform: translateX(0);
                }
            }

            .notifications-panel-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1.5rem;
                background: linear-gradient(135deg, #3b82f6, #6366f1);
                color: white;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            }

            .notifications-panel-header h2 {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                margin: 0;
                font-size: 1.25rem;
            }

            .unread-count {
                background: rgba(255, 255, 255, 0.3);
                padding: 0.25rem 0.75rem;
                border-radius: 1rem;
                font-size: 0.85rem;
                font-weight: 600;
            }

            .header-actions {
                display: flex;
                gap: 0.5rem;
            }

            .header-actions button {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                width: 2rem;
                height: 2rem;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
            }

            .header-actions button:hover {
                background: rgba(255, 255, 255, 0.3);
                transform: scale(1.1);
            }

            .notifications-filters {
                display: flex;
                gap: 0.5rem;
                padding: 1rem;
                background: #f9fafb;
                border-bottom: 1px solid #e5e7eb;
                overflow-x: auto;
            }

            .filter-btn {
                padding: 0.5rem 1rem;
                background: white;
                border: 1px solid #e5e7eb;
                border-radius: 0.5rem;
                cursor: pointer;
                font-size: 0.85rem;
                font-weight: 500;
                color: #6b7280;
                white-space: nowrap;
                transition: all 0.3s ease;
            }

            .filter-btn:hover {
                background: #f3f4f6;
            }

            .filter-btn.active {
                background: #3b82f6;
                color: white;
                border-color: #3b82f6;
            }

            .notifications-list {
                flex: 1;
                overflow-y: auto;
                padding: 1rem;
            }

            .notification-item {
                display: flex;
                gap: 1rem;
                padding: 1rem;
                background: white;
                border: 1px solid #e5e7eb;
                border-right: 4px solid #e5e7eb;
                border-radius: 0.75rem;
                margin-bottom: 0.75rem;
                transition: all 0.3s ease;
            }

            .notification-item:hover {
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
                transform: translateX(-5px);
            }

            .notification-item.read {
                opacity: 0.6;
                background: #f9fafb;
            }

            .notification-item.priority-critical {
                border-right-color: #ef4444;
                background: #fef2f2;
            }

            .notification-item.priority-high {
                border-right-color: #f59e0b;
                background: #fffbeb;
            }

            .notification-item.priority-medium {
                border-right-color: #3b82f6;
                background: #eff6ff;
            }

            .notification-icon {
                width: 2.5rem;
                height: 2.5rem;
                background: #f3f4f6;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }

            .priority-critical .notification-icon {
                background: #fee2e2;
                color: #ef4444;
            }

            .priority-high .notification-icon {
                background: #fef3c7;
                color: #f59e0b;
            }

            .priority-medium .notification-icon {
                background: #dbeafe;
                color: #3b82f6;
            }

            .notification-content {
                flex: 1;
                min-width: 0;
            }

            .notification-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 0.5rem;
            }

            .notification-header h4 {
                margin: 0;
                font-size: 0.95rem;
                font-weight: 600;
                color: #374151;
            }

            .notification-time {
                font-size: 0.75rem;
                color: #9ca3af;
                white-space: nowrap;
            }

            .notification-message {
                margin: 0;
                font-size: 0.85rem;
                color: #6b7280;
                line-height: 1.5;
            }

            .btn-view-case {
                margin-top: 0.75rem;
                padding: 0.5rem 1rem;
                background: #3b82f6;
                color: white;
                border: none;
                border-radius: 0.5rem;
                font-size: 0.85rem;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                transition: all 0.3s ease;
            }

            .btn-view-case:hover {
                background: #2563eb;
            }

            .notification-actions {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }

            .notification-actions button {
                width: 2rem;
                height: 2rem;
                background: #f3f4f6;
                border: none;
                border-radius: 0.5rem;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #6b7280;
                transition: all 0.3s ease;
            }

            .notification-actions button:hover {
                background: #e5e7eb;
                color: #374151;
            }

            .btn-dismiss:hover {
                background: #fee2e2;
                color: #ef4444;
            }

            .no-notifications {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 3rem;
                color: #9ca3af;
            }

            .no-notifications i {
                font-size: 3rem;
                margin-bottom: 1rem;
            }

            .notification-toast {
                position: fixed;
                bottom: 2rem;
                left: 2rem;
                background: white;
                border-radius: 0.75rem;
                padding: 1rem;
                display: flex;
                gap: 1rem;
                align-items: flex-start;
                max-width: 400px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
                z-index: 10001;
                animation: slideInLeft 0.3s ease;
                border-right: 4px solid #3b82f6;
            }

            @keyframes slideInLeft {
                from {
                    transform: translateX(-100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }

            .notification-toast.fade-out {
                animation: fadeOut 0.3s ease forwards;
            }

            @keyframes fadeOut {
                to {
                    opacity: 0;
                    transform: translateY(20px);
                }
            }

            .notification-toast.priority-critical {
                border-right-color: #ef4444;
            }

            .notification-toast.priority-high {
                border-right-color: #f59e0b;
            }

            .toast-icon {
                width: 2.5rem;
                height: 2.5rem;
                background: #dbeafe;
                color: #3b82f6;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }

            .priority-critical .toast-icon {
                background: #fee2e2;
                color: #ef4444;
            }

            .priority-high .toast-icon {
                background: #fef3c7;
                color: #f59e0b;
            }

            .toast-content {
                flex: 1;
            }

            .toast-content h4 {
                margin: 0 0 0.25rem;
                font-size: 0.95rem;
                font-weight: 600;
                color: #374151;
            }

            .toast-content p {
                margin: 0;
                font-size: 0.85rem;
                color: #6b7280;
            }

            .toast-close {
                background: transparent;
                border: none;
                color: #9ca3af;
                cursor: pointer;
                padding: 0.25rem;
                transition: color 0.3s ease;
            }

            .toast-close:hover {
                color: #374151;
            }

            .simple-toast {
                position: fixed;
                bottom: 2rem;
                right: 2rem;
                background: white;
                padding: 1rem 1.5rem;
                border-radius: 0.75rem;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
                display: flex;
                align-items: center;
                gap: 0.75rem;
                z-index: 10001;
                animation: slideInRight 0.3s ease;
            }

            .simple-toast.fade-out {
                animation: fadeOut 0.3s ease forwards;
            }

            .simple-toast.toast-success {
                color: #10b981;
            }

            .simple-toast.toast-info {
                color: #3b82f6;
            }
        `;

        document.head.appendChild(style);
    }
}

// تهيئة النظام تلقائياً عند تحميل الصفحة
window.addEventListener('DOMContentLoaded', () => {
    window.notificationsSystem = new NotificationsSystem();
    console.log('✅ تم تحميل نظام الإشعارات المتقدم');
});

// تصدير للاستخدام العام
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationsSystem;
}