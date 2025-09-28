/**
 * نظام المزامنة المتقدم بين الأجهزة المتعددة
 * Multi-Device Advanced Sync System v1.0
 * 
 * هذا الملف يوفر نظام مزامنة شامل بين أجهزة مختلفة
 * يعمل مع الملفات الموجودة حالياً دون الحاجة لتعديلها
 */

class MultiDeviceSyncManager {
    constructor() {
        this.currentDeviceId = this.generateDeviceId();
        this.userCredentials = null;
        this.isAuthenticated = false;
        this.syncInProgress = false;
        this.lastSyncTime = null;
        this.deviceInfo = this.getDeviceInfo();
        this.connectedDevices = new Map();
        this.syncConflicts = [];
        this.autoSyncInterval = null;
        this.userPreferences = this.loadUserPreferences();
        
        // إعدادات التشفير
        this.encryptionKey = null;
        this.ivLength = 16;
        
        // ربط مع الملفات الموجودة
        this.dataManager = window.dataManager;
        this.firebaseManager = window.advancedFirebaseManager;
        
        this.initializeUI();
        this.setupEventListeners();
        
        console.log(`✅ تم تحميل نظام المزامنة المتقدم - معرف الجهاز: ${this.currentDeviceId}`);
    }

    // إنشاء معرف فريد للجهاز
    generateDeviceId() {
        let deviceId = localStorage.getItem('deviceId');
        if (!deviceId) {
            deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('deviceId', deviceId);
        }
        return deviceId;
    }

    // جمع معلومات الجهاز
    getDeviceInfo() {
        return {
            id: this.currentDeviceId,
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            screenResolution: `${screen.width}x${screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            lastActive: new Date().toISOString(),
            appVersion: '1.0.0',
            deviceName: this.getDeviceName()
        };
    }

    // تحديد اسم الجهاز
    getDeviceName() {
        const savedName = localStorage.getItem('deviceName');
        if (savedName) return savedName;
        
        const platform = navigator.platform.toLowerCase();
        if (platform.includes('win')) return 'جهاز Windows';
        if (platform.includes('mac')) return 'جهاز Mac';
        if (platform.includes('linux')) return 'جهاز Linux';
        if (platform.includes('android')) return 'جهاز Android';
        if (platform.includes('iphone') || platform.includes('ipad')) return 'جهاز iOS';
        
        return 'جهاز غير معروف';
    }

    // تحميل تفضيلات المستخدم
    loadUserPreferences() {
        return {
            autoSync: localStorage.getItem('autoSync') !== 'false',
            syncInterval: parseInt(localStorage.getItem('syncInterval')) || 300000, // 5 دقائق
            encryptData: localStorage.getItem('encryptData') !== 'false',
            conflictResolution: localStorage.getItem('conflictResolution') || 'manual',
            notifyOnSync: localStorage.getItem('notifyOnSync') !== 'false',
            maxDevices: parseInt(localStorage.getItem('maxDevices')) || 5,
            retainHistory: localStorage.getItem('retainHistory') !== 'false'
        };
    }

    // حفظ تفضيلات المستخدم
    saveUserPreferences() {
        Object.keys(this.userPreferences).forEach(key => {
            localStorage.setItem(key, this.userPreferences[key]);
        });
    }

    // إنشاء واجهة المستخدم
    initializeUI() {
        this.createSyncButton();
        this.createSyncModal();
        this.createDeviceManagementModal();
        this.addSyncStatusToHeader();
    }

    // إنشاء زر المزامنة في الهيدر
    createSyncButton() {
        const headerRight = document.querySelector('.header-right');
        if (!headerRight) return;

        const syncContainer = document.createElement('div');
        syncContainer.className = 'multi-sync-container';
        syncContainer.id = 'multi-sync-container';
        syncContainer.innerHTML = `
            <div class="sync-status-indicator" id="sync-status-indicator">
                <i class="fas fa-sync-alt" id="sync-icon"></i>
                <span class="sync-status-text" id="sync-status-text">غير متصل</span>
                <div class="sync-indicator-dot" id="sync-indicator-dot"></div>
            </div>
            <div class="sync-controls" id="sync-controls">
                <button class="sync-control-btn" onclick="multiDeviceSync.showSyncModal()" title="إعدادات المزامنة">
                    <i class="fas fa-cog"></i>
                </button>
                <button class="sync-control-btn" onclick="multiDeviceSync.showDeviceManager()" title="إدارة الأجهزة">
                    <i class="fas fa-laptop"></i>
                </button>
                <button class="sync-control-btn" onclick="multiDeviceSync.forceSyncAll()" title="مزامنة فورية">
                    <i class="fas fa-cloud-download-alt"></i>
                </button>
            </div>
        `;

        // إضافة الأنماط
        this.addSyncStyles();
        
        // إدراج الزر قبل إشعارات Firebase إن وجدت
        const firebaseContainer = document.getElementById('firebase-advanced-container');
        if (firebaseContainer) {
            headerRight.insertBefore(syncContainer, firebaseContainer);
        } else {
            const notificationBell = headerRight.querySelector('.notification-bell');
            if (notificationBell) {
                headerRight.insertBefore(syncContainer, notificationBell);
            } else {
                headerRight.appendChild(syncContainer);
            }
        }

        console.log('✅ تم إنشاء واجهة المزامنة المتقدمة');
    }

    // إضافة أنماط CSS للمزامنة
    addSyncStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .multi-sync-container {
                display: flex;
                align-items: center;
                margin-left: 1rem;
                position: relative;
                order: 2.5;
            }

            .sync-status-indicator {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                padding: 1rem 1.25rem;
                border-radius: 1rem;
                cursor: pointer;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                position: relative;
                overflow: hidden;
                background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05));
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255,255,255,0.1);
                min-width: 160px;
            }

            .sync-status-indicator:hover {
                transform: scale(1.02);
                box-shadow: 0 8px 32px rgba(0,0,0,0.12);
            }

            .sync-status-indicator:hover .sync-controls {
                opacity: 1;
                transform: translateX(0);
            }

            .sync-status-indicator #sync-icon {
                font-size: 1.25rem;
                transition: all 0.3s ease;
                filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
            }

            .sync-status-text {
                font-size: 0.875rem;
                font-weight: 700;
                transition: all 0.3s ease;
                text-shadow: 0 1px 2px rgba(0,0,0,0.1);
            }

            .sync-indicator-dot {
                position: absolute;
                top: 0.5rem;
                right: 0.5rem;
                width: 10px;
                height: 10px;
                border-radius: 50%;
                transition: all 0.3s ease;
                box-shadow: 0 0 0 2px rgba(255,255,255,0.3);
            }

            .sync-controls {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                margin-right: 0.75rem;
                opacity: 0;
                transform: translateX(20px);
                transition: all 0.3s ease;
                position: absolute;
                right: 0;
                top: 50%;
                transform: translateY(-50%) translateX(20px);
            }

            .sync-control-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 2rem;
                height: 2rem;
                border: none;
                border-radius: 0.5rem;
                background: rgba(255,255,255,0.1);
                color: white;
                cursor: pointer;
                transition: all 0.3s ease;
                font-size: 0.875rem;
                backdrop-filter: blur(5px);
            }

            .sync-control-btn:hover {
                background: rgba(255,255,255,0.2);
                transform: scale(1.1);
            }

            /* حالات المزامنة */
            .sync-status-indicator.disconnected {
                background: linear-gradient(135deg, #fecaca, #fee2e2);
                border: 2px solid #ef4444;
                color: #ef4444;
            }

            .sync-status-indicator.disconnected .sync-indicator-dot {
                background: #ef4444;
                animation: pulse-error 2s infinite;
            }

            .sync-status-indicator.connecting {
                background: linear-gradient(135deg, #fef3c7, #fde68a);
                border: 2px solid #f59e0b;
                color: #f59e0b;
            }

            .sync-status-indicator.connecting .sync-indicator-dot {
                background: #f59e0b;
                animation: spin 1s linear infinite;
            }

            .sync-status-indicator.connected {
                background: linear-gradient(135deg, #d1fae5, #a7f3d0);
                border: 2px solid #10b981;
                color: #10b981;
            }

            .sync-status-indicator.connected .sync-indicator-dot {
                background: #10b981;
                animation: heartbeat 2s infinite;
            }

            .sync-status-indicator.syncing {
                background: linear-gradient(135deg, #ddd6fe, #c4b5fd);
                border: 2px solid #8b5cf6;
                color: #8b5cf6;
            }

            .sync-status-indicator.syncing .sync-indicator-dot {
                background: #8b5cf6;
                animation: sync-pulse 1s infinite;
            }

            .sync-status-indicator.error {
                background: linear-gradient(135deg, #fecaca, #fca5a5);
                border: 2px solid #dc2626;
                color: #dc2626;
            }

            .sync-status-indicator.error .sync-indicator-dot {
                background: #dc2626;
                animation: error-shake 0.5s infinite;
            }

            @keyframes pulse-error {
                0%, 100% { 
                    transform: scale(1); 
                    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
                }
                50% { 
                    transform: scale(1.1); 
                    box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);
                }
            }

            @keyframes heartbeat {
                0%, 100% { transform: scale(1); }
                25% { transform: scale(1.1); }
                50% { transform: scale(1); }
                75% { transform: scale(1.1); }
            }

            @keyframes sync-pulse {
                0%, 100% { 
                    transform: scale(1); 
                    background: #8b5cf6;
                }
                50% { 
                    transform: scale(1.2); 
                    background: #a855f7;
                }
            }

            @keyframes error-shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-2px); }
                75% { transform: translateX(2px); }
            }

            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }

            /* مودال المزامنة */
            .sync-modal {
                max-width: 800px;
                width: 90%;
            }

            .sync-section {
                background: #f9fafb;
                border-radius: 1rem;
                padding: 1.5rem;
                margin-bottom: 1.5rem;
                border: 1px solid #e5e7eb;
            }

            .sync-section h4 {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                margin-bottom: 1rem;
                color: #374151;
                font-size: 1.125rem;
                font-weight: 700;
            }

            .credentials-form {
                display: grid;
                gap: 1rem;
            }

            .form-group {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }

            .form-group label {
                font-weight: 600;
                color: #374151;
                font-size: 0.875rem;
            }

            .form-group input,
            .form-group select {
                padding: 0.75rem;
                border: 2px solid #d1d5db;
                border-radius: 0.5rem;
                font-size: 0.875rem;
                transition: all 0.3s ease;
            }

            .form-group input:focus,
            .form-group select:focus {
                outline: none;
                border-color: #3b82f6;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
            }

            .device-list {
                display: grid;
                gap: 1rem;
                max-height: 300px;
                overflow-y: auto;
            }

            .device-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 1rem;
                background: white;
                border-radius: 0.75rem;
                border: 1px solid #e5e7eb;
                transition: all 0.3s ease;
            }

            .device-item:hover {
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                transform: translateY(-1px);
            }

            .device-item.current {
                border-color: #10b981;
                background: #ecfdf5;
            }

            .device-info {
                display: flex;
                align-items: center;
                gap: 1rem;
            }

            .device-icon {
                width: 3rem;
                height: 3rem;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.25rem;
                color: white;
                background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            }

            .device-details h5 {
                margin: 0 0 0.25rem 0;
                font-weight: 700;
                color: #111827;
            }

            .device-details p {
                margin: 0;
                font-size: 0.75rem;
                color: #6b7280;
            }

            .device-status {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-size: 0.75rem;
                font-weight: 600;
            }

            .device-status.online {
                color: #10b981;
            }

            .device-status.offline {
                color: #6b7280;
            }

            .sync-settings {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 1rem;
            }

            .setting-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1rem;
                background: white;
                border-radius: 0.5rem;
                border: 1px solid #e5e7eb;
            }

            .setting-label {
                font-weight: 600;
                color: #374151;
            }

            .toggle-switch {
                position: relative;
                width: 44px;
                height: 24px;
                background: #d1d5db;
                border-radius: 12px;
                cursor: pointer;
                transition: background 0.3s ease;
            }

            .toggle-switch.active {
                background: #10b981;
            }

            .toggle-switch::after {
                content: '';
                position: absolute;
                top: 2px;
                left: 2px;
                width: 20px;
                height: 20px;
                background: white;
                border-radius: 50%;
                transition: transform 0.3s ease;
            }

            .toggle-switch.active::after {
                transform: translateX(20px);
            }

            .sync-progress {
                background: white;
                border-radius: 0.75rem;
                padding: 1.5rem;
                border: 1px solid #e5e7eb;
                text-align: center;
            }

            .progress-bar {
                width: 100%;
                height: 8px;
                background: #e5e7eb;
                border-radius: 4px;
                overflow: hidden;
                margin: 1rem 0;
            }

            .progress-fill {
                height: 100%;
                background: linear-gradient(135deg, #3b82f6, #1d4ed8);
                width: 0%;
                transition: width 0.3s ease;
                border-radius: 4px;
            }

            .conflict-item {
                padding: 1rem;
                background: #fef3c7;
                border: 1px solid #f59e0b;
                border-radius: 0.75rem;
                margin-bottom: 1rem;
            }

            .conflict-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 0.75rem;
            }

            .conflict-title {
                font-weight: 700;
                color: #92400e;
            }

            .conflict-actions {
                display: flex;
                gap: 0.5rem;
            }

            .conflict-btn {
                padding: 0.5rem 1rem;
                border: none;
                border-radius: 0.375rem;
                font-size: 0.75rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .conflict-btn.local {
                background: #dbeafe;
                color: #1e40af;
            }

            .conflict-btn.remote {
                background: #dcfce7;
                color: #166534;
            }

            .conflict-btn:hover {
                transform: translateY(-1px);
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
        `;
        document.head.appendChild(style);
    }

    // إنشاء مودال المزامنة الرئيسي
    createSyncModal() {
        const modalHTML = `
            <div id="sync-modal" class="modal-overlay">
                <div class="modal sync-modal">
                    <div class="modal-header">
                        <h3 class="modal-title">إعدادات المزامنة المتقدمة</h3>
                        <button class="modal-close" onclick="multiDeviceSync.closeSyncModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="sync-section">
                            <h4>
                                <i class="fas fa-key"></i>
                                بيانات الحساب
                            </h4>
                            <div class="credentials-form">
                                <div class="form-group">
                                    <label>البريد الإلكتروني</label>
                                    <input type="email" id="sync-email" placeholder="your-email@example.com">
                                </div>
                                <div class="form-group">
                                    <label>كلمة المرور</label>
                                    <input type="password" id="sync-password" placeholder="••••••••">
                                </div>
                                <div class="form-group">
                                    <label>مفتاح التشفير (اختياري)</label>
                                    <input type="password" id="sync-encryption-key" placeholder="مفتاح لتشفير البيانات">
                                </div>
                                <button class="btn btn-primary" onclick="multiDeviceSync.authenticateUser()">
                                    <i class="fas fa-sign-in-alt"></i>
                                    تسجيل الدخول والمزامنة
                                </button>
                            </div>
                        </div>

                        <div class="sync-section">
                            <h4>
                                <i class="fas fa-cog"></i>
                                إعدادات المزامنة
                            </h4>
                            <div class="sync-settings">
                                <div class="setting-item">
                                    <span class="setting-label">المزامنة التلقائية</span>
                                    <div class="toggle-switch" onclick="multiDeviceSync.toggleSetting('autoSync')">
                                    </div>
                                </div>
                                <div class="setting-item">
                                    <span class="setting-label">تشفير البيانات</span>
                                    <div class="toggle-switch active" onclick="multiDeviceSync.toggleSetting('encryptData')">
                                    </div>
                                </div>
                                <div class="setting-item">
                                    <span class="setting-label">إشعارات المزامنة</span>
                                    <div class="toggle-switch active" onclick="multiDeviceSync.toggleSetting('notifyOnSync')">
                                    </div>
                                </div>
                                <div class="setting-item">
                                    <span class="setting-label">حفظ السجل</span>
                                    <div class="toggle-switch active" onclick="multiDeviceSync.toggleSetting('retainHistory')">
                                    </div>
                                </div>
                            </div>
                            <div style="margin-top: 1rem;">
                                <div class="form-group">
                                    <label>فترة المزامنة (دقائق)</label>
                                    <select id="sync-interval" onchange="multiDeviceSync.updateSyncInterval()">
                                        <option value="60000">دقيقة واحدة</option>
                                        <option value="300000" selected>5 دقائق</option>
                                        <option value="600000">10 دقائق</option>
                                        <option value="1800000">30 دقيقة</option>
                                        <option value="3600000">ساعة واحدة</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>حل تضارب البيانات</label>
                                    <select id="conflict-resolution" onchange="multiDeviceSync.updateConflictResolution()">
                                        <option value="manual">يدوي</option>
                                        <option value="newest">الأحدث يفوز</option>
                                        <option value="merge">دمج البيانات</option>
                                        <option value="local">الجهاز المحلي يفوز</option>
                                        <option value="remote">الخادم يفوز</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div class="sync-section">
                            <h4>
                                <i class="fas fa-info-circle"></i>
                                معلومات الجهاز الحالي
                            </h4>
                            <div id="current-device-info" class="device-item current">
                                <!-- سيتم ملؤها بـ JavaScript -->
                            </div>
                        </div>

                        <div class="sync-section" id="sync-progress-section" style="display: none;">
                            <h4>
                                <i class="fas fa-sync-alt"></i>
                                حالة المزامنة
                            </h4>
                            <div class="sync-progress">
                                <div id="sync-status-message">جاري المزامنة...</div>
                                <div class="progress-bar">
                                    <div class="progress-fill" id="sync-progress-fill"></div>
                                </div>
                                <div id="sync-details">تحضير البيانات...</div>
                            </div>
                        </div>

                        <div class="sync-section" id="sync-conflicts-section" style="display: none;">
                            <h4>
                                <i class="fas fa-exclamation-triangle"></i>
                                تضارب في البيانات
                            </h4>
                            <div id="sync-conflicts-list">
                                <!-- سيتم ملؤها بـ JavaScript -->
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="multiDeviceSync.closeSyncModal()">إغلاق</button>
                        <button class="btn btn-primary" onclick="multiDeviceSync.forceSyncAll()">
                            <i class="fas fa-cloud-download-alt"></i>
                            مزامنة فورية
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    // إنشاء مودال إدارة الأجهزة
    createDeviceManagementModal() {
        const modalHTML = `
            <div id="device-management-modal" class="modal-overlay">
                <div class="modal sync-modal">
                    <div class="modal-header">
                        <h3 class="modal-title">إدارة الأجهزة المتصلة</h3>
                        <button class="modal-close" onclick="multiDeviceSync.closeDeviceModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div class="sync-section">
                            <h4>
                                <i class="fas fa-laptop"></i>
                                الأجهزة المتصلة (${this.connectedDevices.size + 1} من ${this.userPreferences.maxDevices})
                            </h4>
                            <div class="device-list" id="connected-devices-list">
                                <!-- سيتم ملؤها بـ JavaScript -->
                            </div>
                        </div>

                        <div class="sync-section">
                            <h4>
                                <i class="fas fa-plus"></i>
                                إضافة جهاز جديد
                            </h4>
                            <div class="credentials-form">
                                <div class="form-group">
                                    <label>اسم الجهاز</label>
                                    <input type="text" id="new-device-name" placeholder="مثال: لابتوب المكتب">
                                </div>
                                <div class="form-group">
                                    <label>نوع الجهاز</label>
                                    <select id="new-device-type">
                                        <option value="desktop">جهاز مكتبي</option>
                                        <option value="laptop">لابتوب</option>
                                        <option value="tablet">تابلت</option>
                                        <option value="mobile">هاتف محمول</option>
                                    </select>
                                </div>
                                <button class="btn btn-success" onclick="multiDeviceSync.generateDeviceCode()">
                                    <i class="fas fa-qrcode"></i>
                                    إنشاء رمز الاتصال
                                </button>
                            </div>
                        </div>

                        <div class="sync-section" id="device-code-section" style="display: none;">
                            <h4>
                                <i class="fas fa-qrcode"></i>
                                رمز الاتصال
                            </h4>
                            <div style="text-align: center; padding: 2rem;">
                                <div id="device-qr-code" style="margin-bottom: 1rem;">
                                    <!-- QR Code سيتم إنشاؤه هنا -->
                                </div>
                                <div style="font-size: 1.5rem; font-weight: 700; color: #3b82f6; margin-bottom: 1rem;" id="device-code-text">
                                    <!-- كود الجهاز -->
                                </div>
                                <p style="color: #6b7280;">استخدم هذا الرمز في الجهاز الجديد للاتصال</p>
                                <button class="btn btn-primary" onclick="multiDeviceSync.copyDeviceCode()">
                                    <i class="fas fa-copy"></i>
                                    نسخ الرمز
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="multiDeviceSync.closeDeviceModal()">إغلاق</button>
                        <button class="btn btn-danger" onclick="multiDeviceSync.disconnectAllDevices()">
                            <i class="fas fa-unlink"></i>
                            قطع جميع الاتصالات
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    // إضافة حالة المزامنة للهيدر
    addSyncStatusToHeader() {
        this.updateSyncStatus('disconnected', 'غير متصل');
    }

    // إعداد مستمعي الأحداث
    setupEventListeners() {
        // مراقبة تغييرات البيانات في dataManager
        if (this.dataManager) {
            const originalSaveData = this.dataManager.saveData;
            this.dataManager.saveData = () => {
                const result = originalSaveData.call(this.dataManager);
                if (this.isAuthenticated && this.userPreferences.autoSync) {
                    this.queueSync('data_changed');
                }
                return result;
            };
        }

        // مراقبة الاتصال بالإنترنت
        window.addEventListener('online', () => {
            this.handleNetworkChange(true);
        });

        window.addEventListener('offline', () => {
            this.handleNetworkChange(false);
        });

        // حفظ البيانات عند إغلاق النافذة
        window.addEventListener('beforeunload', () => {
            this.saveState();
        });

        console.log('✅ تم إعداد مستمعي الأحداث للمزامنة');
    }

    // تحديث حالة المزامنة
    updateSyncStatus(status, text) {
        const indicator = document.getElementById('sync-status-indicator');
        const statusText = document.getElementById('sync-status-text');
        const icon = document.getElementById('sync-icon');

        if (indicator && statusText && icon) {
            // إزالة جميع الكلاسات السابقة
            indicator.classList.remove('disconnected', 'connecting', 'connected', 'syncing', 'error');
            indicator.classList.add(status);
            
            statusText.textContent = text;

            // تحديث الأيقونة
            const iconClasses = {
                disconnected: 'fas fa-sync-alt',
                connecting: 'fas fa-wifi',
                connected: 'fas fa-check-circle',
                syncing: 'fas fa-sync-alt fa-spin',
                error: 'fas fa-exclamation-triangle'
            };

            icon.className = iconClasses[status] || 'fas fa-sync-alt';
        }
    }

    // عرض مودال المزامنة
    showSyncModal() {
        const modal = document.getElementById('sync-modal');
        if (modal) {
            modal.classList.add('active');
            this.populateCurrentDeviceInfo();
            this.loadSyncSettings();
        }
    }

    // إغلاق مودال المزامنة
    closeSyncModal() {
        const modal = document.getElementById('sync-modal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    // ملء معلومات الجهاز الحالي
    populateCurrentDeviceInfo() {
        const container = document.getElementById('current-device-info');
        if (container) {
            container.innerHTML = `
                <div class="device-info">
                    <div class="device-icon">
                        <i class="fas fa-${this.getDeviceIcon()}"></i>
                    </div>
                    <div class="device-details">
                        <h5>${this.deviceInfo.deviceName}</h5>
                        <p>معرف: ${this.deviceInfo.id}</p>
                        <p>النظام: ${this.deviceInfo.platform}</p>
                        <p>آخر نشاط: ${this.formatDate(this.deviceInfo.lastActive)}</p>
                    </div>
                </div>
                <div class="device-status online">
                    <i class="fas fa-circle"></i>
                    متصل (الجهاز الحالي)
                </div>
            `;
        }
    }

    // تحديد أيقونة الجهاز
    getDeviceIcon() {
        const platform = this.deviceInfo.platform.toLowerCase();
        if (platform.includes('win') || platform.includes('linux')) return 'desktop';
        if (platform.includes('mac')) return 'laptop';
        if (platform.includes('android') || platform.includes('mobile')) return 'mobile-alt';
        if (platform.includes('tablet') || platform.includes('ipad')) return 'tablet-alt';
        return 'laptop';
    }

    // تحميل إعدادات المزامنة
    loadSyncSettings() {
        // تحديث التبديلات
        document.querySelectorAll('.toggle-switch').forEach((toggle, index) => {
            const settings = ['autoSync', 'encryptData', 'notifyOnSync', 'retainHistory'];
            const isActive = this.userPreferences[settings[index]];
            toggle.classList.toggle('active', isActive);
        });

        // تحديث القوائم المنسدلة
        const intervalSelect = document.getElementById('sync-interval');
        if (intervalSelect) {
            intervalSelect.value = this.userPreferences.syncInterval;
        }

        const conflictSelect = document.getElementById('conflict-resolution');
        if (conflictSelect) {
            conflictSelect.value = this.userPreferences.conflictResolution;
        }
    }

    // تبديل الإعدادات
    toggleSetting(settingName) {
        this.userPreferences[settingName] = !this.userPreferences[settingName];
        this.saveUserPreferences();
        this.loadSyncSettings();

        if (settingName === 'autoSync') {
            if (this.userPreferences.autoSync && this.isAuthenticated) {
                this.startAutoSync();
            } else {
                this.stopAutoSync();
            }
        }

        this.showNotification('تم التحديث', `تم تحديث إعداد ${this.getSettingLabel(settingName)}`, 'success');
    }

    // الحصول على تسمية الإعداد
    getSettingLabel(settingName) {
        const labels = {
            autoSync: 'المزامنة التلقائية',
            encryptData: 'تشفير البيانات',
            notifyOnSync: 'إشعارات المزامنة',
            retainHistory: 'حفظ السجل'
        };
        return labels[settingName] || settingName;
    }

    // تحديث فترة المزامنة
    updateSyncInterval() {
        const interval = document.getElementById('sync-interval').value;
        this.userPreferences.syncInterval = parseInt(interval);
        this.saveUserPreferences();

        if (this.userPreferences.autoSync && this.isAuthenticated) {
            this.stopAutoSync();
            this.startAutoSync();
        }

        this.showNotification('تم التحديث', 'تم تحديث فترة المزامنة', 'success');
    }

    // تحديث حل التضارب
    updateConflictResolution() {
        const resolution = document.getElementById('conflict-resolution').value;
        this.userPreferences.conflictResolution = resolution;
        this.saveUserPreferences();
        this.showNotification('تم التحديث', 'تم تحديث طريقة حل التضارب', 'success');
    }

    // مصادقة المستخدم
    async authenticateUser() {
        const email = document.getElementById('sync-email').value.trim();
        const password = document.getElementById('sync-password').value.trim();
        const encryptionKey = document.getElementById('sync-encryption-key').value.trim();

        if (!email || !password) {
            this.showNotification('خطأ', 'يرجى إدخال البريد الإلكتروني وكلمة المرور', 'error');
            return;
        }

        this.updateSyncStatus('connecting', 'جاري الاتصال...');

        try {
            // حفظ بيانات المصادقة
            this.userCredentials = {
                email,
                password,
                encryptionKey: encryptionKey || null
            };

            // إنشاء مفتاح التشفير
            if (encryptionKey) {
                this.encryptionKey = await this.deriveKey(encryptionKey);
            }

            // محاولة الاتصال بـ Firebase
            await this.connectToFirebase(email, password);

            // تسجيل الجهاز
            await this.registerDevice();

            // مزامنة البيانات
            await this.performInitialSync();

            this.isAuthenticated = true;
            this.updateSyncStatus('connected', 'متصل');

            if (this.userPreferences.autoSync) {
                this.startAutoSync();
            }

            this.showNotification('نجح الاتصال', 'تم الاتصال والمزامنة بنجاح', 'success');
            this.closeSyncModal();

        } catch (error) {
            console.error('خطأ في المصادقة:', error);
            this.updateSyncStatus('error', 'خطأ في الاتصال');
            this.showNotification('خطأ في المصادقة', error.message, 'error');
        }
    }

    // الاتصال بـ Firebase
    async connectToFirebase(email, password) {
        return new Promise((resolve, reject) => {
            // التحقق من وجود Firebase
            if (!window.firebase) {
                reject(new Error('Firebase غير متوفر. يرجى التأكد من تحميل SDK'));
                return;
            }

            // تهيئة Firebase إذا لم يكن مهيئاً
            if (!firebase.apps.length) {
                // استخدام إعدادات Firebase من الملف الموجود
                if (window.advancedFirebaseManager && window.advancedFirebaseManager.firebaseConfig) {
                    firebase.initializeApp(window.advancedFirebaseManager.firebaseConfig);
                } else {
                    reject(new Error('إعدادات Firebase غير متوفرة'));
                    return;
                }
            }

            // المصادقة
            firebase.auth().signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    this.currentUser = userCredential.user;
                    this.db = firebase.database();
                    resolve(userCredential);
                })
                .catch((error) => {
                    reject(new Error(this.getFirebaseErrorMessage(error.code)));
                });
        });
    }

    // ترجمة رسائل خطأ Firebase
    getFirebaseErrorMessage(errorCode) {
        const messages = {
            'auth/user-not-found': 'المستخدم غير موجود',
            'auth/wrong-password': 'كلمة المرور غير صحيحة',
            'auth/invalid-email': 'البريد الإلكتروني غير صحيح',
            'auth/too-many-requests': 'محاولات كثيرة. حاول لاحقاً',
            'auth/network-request-failed': 'مشكلة في الاتصال بالإنترنت'
        };
        return messages[errorCode] || 'خطأ غير معروف في المصادقة';
    }

    // تسجيل الجهاز
    async registerDevice() {
        if (!this.db || !this.currentUser) return;

        const devicePath = `users/${this.currentUser.uid}/devices/${this.currentDeviceId}`;
        
        await this.db.ref(devicePath).set({
            ...this.deviceInfo,
            registeredAt: new Date().toISOString(),
            lastSync: null,
            status: 'active'
        });

        console.log('✅ تم تسجيل الجهاز بنجاح');
    }

    // تنفيذ المزامنة الأولية
    async performInitialSync() {
        this.showSyncProgress(true);
        this.updateSyncProgress(0, 'جاري تحميل البيانات من الخادم...');

        try {
            // تحميل بيانات المستخدم
            const userData = await this.loadUserDataFromFirebase();
            
            this.updateSyncProgress(25, 'جاري معالجة البيانات...');

            // دمج البيانات
            await this.mergeUserData(userData);
            
            this.updateSyncProgress(50, 'جاري رفع البيانات المحلية...');

            // رفع البيانات المحلية الجديدة
            await this.uploadLocalData();
            
            this.updateSyncProgress(75, 'جاري تحديث قائمة الأجهزة...');

            // تحديث قائمة الأجهزة
            await this.updateDevicesList();
            
            this.updateSyncProgress(100, 'تمت المزامنة بنجاح!');
            
            setTimeout(() => {
                this.showSyncProgress(false);
            }, 2000);

            this.lastSyncTime = new Date().toISOString();
            this.recordSyncHistory('initial_sync', 'success');

        } catch (error) {
            this.showSyncProgress(false);
            throw error;
        }
    }

    // تحميل بيانات المستخدم من Firebase
    async loadUserDataFromFirebase() {
        if (!this.db || !this.currentUser) return null;

        const userDataPath = `users/${this.currentUser.uid}/data`;
        const snapshot = await this.db.ref(userDataPath).once('value');
        
        if (snapshot.exists()) {
            let data = snapshot.val();
            
            // فك التشفير إذا كان مفعلاً
            if (this.userPreferences.encryptData && this.encryptionKey) {
                data = await this.decryptData(data);
            }
            
            return data;
        }
        
        return null;
    }

    // دمج البيانات
    async mergeUserData(remoteData) {
        if (!remoteData || !this.dataManager) return;

        const localData = {
            casesData: this.dataManager.casesData || [],
            defendantsData: this.dataManager.defendantsData || [],
            lawyersData: this.dataManager.lawyersData || [],
            deductionsData: this.dataManager.deductionsData || [],
            notificationsData: this.dataManager.notificationsData || [],
            settingsData: this.dataManager.settingsData || {}
        };

        // دمج البيانات حسب استراتيجية حل التضارب
        const mergedData = await this.resolveDataConflicts(localData, remoteData);

        // تحديث البيانات المحلية
        if (mergedData.casesData) this.dataManager.casesData = mergedData.casesData;
        if (mergedData.defendantsData) this.dataManager.defendantsData = mergedData.defendantsData;
        if (mergedData.lawyersData) this.dataManager.lawyersData = mergedData.lawyersData;
        if (mergedData.deductionsData) this.dataManager.deductionsData = mergedData.deductionsData;
        if (mergedData.notificationsData) this.dataManager.notificationsData = mergedData.notificationsData;
        if (mergedData.settingsData) this.dataManager.settingsData = { ...this.dataManager.settingsData, ...mergedData.settingsData };

        // تحديث الفلاتر
        this.dataManager.filteredCases = [...this.dataManager.casesData];
        this.dataManager.filteredDefendants = [...this.dataManager.defendantsData];
        this.dataManager.filteredLawyers = [...this.dataManager.lawyersData];
        this.dataManager.filteredDeductions = [...this.dataManager.deductionsData];

        // حفظ البيانات محلياً
        this.dataManager.saveData();

        console.log('✅ تم دمج البيانات بنجاح');
    }

    // حل تضارب البيانات
    async resolveDataConflicts(localData, remoteData) {
        const mergedData = {};

        for (const dataType of Object.keys(localData)) {
            if (!remoteData[dataType]) {
                mergedData[dataType] = localData[dataType];
                continue;
            }

            switch (this.userPreferences.conflictResolution) {
                case 'newest':
                    mergedData[dataType] = this.mergeByNewest(localData[dataType], remoteData[dataType]);
                    break;
                case 'merge':
                    mergedData[dataType] = this.mergeByUnion(localData[dataType], remoteData[dataType]);
                    break;
                case 'local':
                    mergedData[dataType] = localData[dataType];
                    break;
                case 'remote':
                    mergedData[dataType] = remoteData[dataType];
                    break;
                case 'manual':
                default:
                    mergedData[dataType] = await this.handleManualConflictResolution(dataType, localData[dataType], remoteData[dataType]);
                    break;
            }
        }

        return mergedData;
    }

    // دمج حسب الأحدث
    mergeByNewest(localItems, remoteItems) {
        if (!Array.isArray(localItems) && !Array.isArray(remoteItems)) {
            // للكائنات
            const localTime = localItems.lastUpdate || localItems.createdAt || '1970-01-01';
            const remoteTime = remoteItems.lastUpdate || remoteItems.createdAt || '1970-01-01';
            return new Date(remoteTime) > new Date(localTime) ? remoteItems : localItems;
        }

        // للمصفوفات
        const merged = new Map();
        
        [...(localItems || []), ...(remoteItems || [])].forEach(item => {
            if (!item.id) return;
            
            const existing = merged.get(item.id);
            if (!existing) {
                merged.set(item.id, item);
            } else {
                const existingTime = existing.lastUpdate || existing.createdAt || '1970-01-01';
                const itemTime = item.lastUpdate || item.createdAt || '1970-01-01';
                if (new Date(itemTime) > new Date(existingTime)) {
                    merged.set(item.id, item);
                }
            }
        });
        
        return Array.from(merged.values());
    }

    // دمج بالاتحاد
    mergeByUnion(localItems, remoteItems) {
        if (!Array.isArray(localItems) && !Array.isArray(remoteItems)) {
            return { ...localItems, ...remoteItems };
        }

        const merged = new Map();
        
        [...(localItems || []), ...(remoteItems || [])].forEach(item => {
            if (item.id && !merged.has(item.id)) {
                merged.set(item.id, item);
            }
        });
        
        return Array.from(merged.values());
    }

    // معالجة حل التضارب اليدوي
    async handleManualConflictResolution(dataType, localData, remoteData) {
        // إضافة للقائمة التضارب
        this.syncConflicts.push({
            id: Date.now(),
            dataType,
            localData,
            remoteData,
            resolved: false
        });

        // إرجاع البيانات المحلية مؤقتاً
        return localData;
    }

    // رفع البيانات المحلية
    async uploadLocalData() {
        if (!this.db || !this.currentUser || !this.dataManager) return;

        const userData = {
            casesData: this.dataManager.casesData,
            defendantsData: this.dataManager.defendantsData,
            lawyersData: this.dataManager.lawyersData,
            deductionsData: this.dataManager.deductionsData,
            notificationsData: this.dataManager.notificationsData,
            settingsData: this.dataManager.settingsData,
            lastUpdate: new Date().toISOString(),
            deviceId: this.currentDeviceId
        };

        // تشفير البيانات إذا كان مفعلاً
        let dataToUpload = userData;
        if (this.userPreferences.encryptData && this.encryptionKey) {
            dataToUpload = await this.encryptData(userData);
        }

        const userDataPath = `users/${this.currentUser.uid}/data`;
        await this.db.ref(userDataPath).set(dataToUpload);

        console.log('✅ تم رفع البيانات المحلية');
    }

    // تحديث قائمة الأجهزة
    async updateDevicesList() {
        if (!this.db || !this.currentUser) return;

        const devicesPath = `users/${this.currentUser.uid}/devices`;
        const snapshot = await this.db.ref(devicesPath).once('value');
        
        if (snapshot.exists()) {
            const devices = snapshot.val();
            this.connectedDevices.clear();
            
            Object.entries(devices).forEach(([deviceId, deviceInfo]) => {
                if (deviceId !== this.currentDeviceId) {
                    this.connectedDevices.set(deviceId, deviceInfo);
                }
            });
        }

        console.log(`✅ تم تحديث قائمة الأجهزة (${this.connectedDevices.size} أجهزة)`);
    }

    // بدء المزامنة التلقائية
    startAutoSync() {
        if (this.autoSyncInterval) {
            clearInterval(this.autoSyncInterval);
        }

        this.autoSyncInterval = setInterval(() => {
            if (this.isAuthenticated && navigator.onLine) {
                this.performSync('auto');
            }
        }, this.userPreferences.syncInterval);

        console.log(`✅ تم بدء المزامنة التلقائية كل ${this.userPreferences.syncInterval / 60000} دقيقة`);
    }

    // إيقاف المزامنة التلقائية
    stopAutoSync() {
        if (this.autoSyncInterval) {
            clearInterval(this.autoSyncInterval);
            this.autoSyncInterval = null;
        }
        console.log('⏹️ تم إيقاف المزامنة التلقائية');
    }

    // تنفيذ مزامنة فورية
    async forceSyncAll() {
        if (!this.isAuthenticated) {
            this.showNotification('تنبيه', 'يجب تسجيل الدخول أولاً', 'warning');
            return;
        }

        if (this.syncInProgress) {
            this.showNotification('تنبيه', 'المزامنة قيد التنفيذ بالفعل', 'info');
            return;
        }

        await this.performSync('manual');
    }

    // تنفيذ المزامنة
    async performSync(syncType = 'manual') {
        if (this.syncInProgress) return;
        
        this.syncInProgress = true;
        this.updateSyncStatus('syncing', 'جاري المزامنة...');

        try {
            // تحميل البيانات من الخادم
            const remoteData = await this.loadUserDataFromFirebase();
            
            if (remoteData) {
                // فحص التضارب
                const hasConflicts = await this.checkForConflicts(remoteData);
                
                if (hasConflicts && this.userPreferences.conflictResolution === 'manual') {
                    this.showSyncConflicts();
                } else {
                    // دمج البيانات
                    await this.mergeUserData(remoteData);
                }
            }

            // رفع البيانات المحلية
            await this.uploadLocalData();

            // تحديث معلومات الجهاز
            await this.updateDeviceInfo();

            this.lastSyncTime = new Date().toISOString();
            this.updateSyncStatus('connected', 'مُزامن');
            
            if (this.userPreferences.notifyOnSync) {
                this.showNotification('مزامنة ناجحة', 'تمت المزامنة بنجاح', 'success');
            }

            this.recordSyncHistory(syncType, 'success');

        } catch (error) {
            console.error('خطأ في المزامنة:', error);
            this.updateSyncStatus('error', 'خطأ في المزامنة');
            this.showNotification('خطأ في المزامنة', error.message, 'error');
            this.recordSyncHistory(syncType, 'error', error.message);
        } finally {
            this.syncInProgress = false;
        }
    }

    // فحص التضارب
    async checkForConflicts(remoteData) {
        if (!this.dataManager || !remoteData) return false;

        const localData = {
            casesData: this.dataManager.casesData,
            defendantsData: this.dataManager.defendantsData,
            lawyersData: this.dataManager.lawyersData,
            deductionsData: this.dataManager.deductionsData
        };

        let hasConflicts = false;

        for (const [dataType, localItems] of Object.entries(localData)) {
            const remoteItems = remoteData[dataType];
            if (!remoteItems) continue;

            if (Array.isArray(localItems) && Array.isArray(remoteItems)) {
                // فحص التضارب في العناصر المشتركة
                for (const localItem of localItems) {
                    const remoteItem = remoteItems.find(r => r.id === localItem.id);
                    if (remoteItem) {
                        const localTime = new Date(localItem.lastUpdate || localItem.createdAt || '1970-01-01');
                        const remoteTime = new Date(remoteItem.lastUpdate || remoteItem.createdAt || '1970-01-01');
                        
                        if (Math.abs(localTime - remoteTime) > 1000 && // أكثر من ثانية واحدة
                            JSON.stringify(localItem) !== JSON.stringify(remoteItem)) {
                            hasConflicts = true;
                            break;
                        }
                    }
                }
            }
        }

        return hasConflicts;
    }

    // عرض تضارب المزامنة
    showSyncConflicts() {
        const conflictsSection = document.getElementById('sync-conflicts-section');
        const conflictsList = document.getElementById('sync-conflicts-list');
        
        if (conflictsSection && conflictsList) {
            conflictsSection.style.display = 'block';
            
            conflictsList.innerHTML = this.syncConflicts.map(conflict => `
                <div class="conflict-item" data-conflict-id="${conflict.id}">
                    <div class="conflict-header">
                        <span class="conflict-title">تضارب في ${this.getDataTypeLabel(conflict.dataType)}</span>
                        <div class="conflict-actions">
                            <button class="conflict-btn local" onclick="multiDeviceSync.resolveConflict(${conflict.id}, 'local')">
                                استخدام المحلي
                            </button>
                            <button class="conflict-btn remote" onclick="multiDeviceSync.resolveConflict(${conflict.id}, 'remote')">
                                استخدام الخادم
                            </button>
                        </div>
                    </div>
                    <div style="font-size: 0.875rem; color: #6b7280;">
                        البيانات المحلية: ${Array.isArray(conflict.localData) ? conflict.localData.length : 'كائن'} عنصر
                        | بيانات الخادم: ${Array.isArray(conflict.remoteData) ? conflict.remoteData.length : 'كائن'} عنصر
                    </div>
                </div>
            `).join('');
        }

        this.showSyncModal();
    }

    // حل التضارب
    resolveConflict(conflictId, resolution) {
        const conflict = this.syncConflicts.find(c => c.id === conflictId);
        if (!conflict) return;

        const dataToUse = resolution === 'local' ? conflict.localData : conflict.remoteData;
        
        // تحديث البيانات
        if (this.dataManager[conflict.dataType]) {
            this.dataManager[conflict.dataType] = dataToUse;
            this.dataManager.saveData();
        }

        // وضع علامة على التضارب كمحلول
        conflict.resolved = true;

        // إزالة من القائمة
        const conflictElement = document.querySelector(`[data-conflict-id="${conflictId}"]`);
        if (conflictElement) {
            conflictElement.remove();
        }

        // إخفاء القسم إذا لم تعد هناك تضاربات
        const remainingConflicts = this.syncConflicts.filter(c => !c.resolved);
        if (remainingConflicts.length === 0) {
            const conflictsSection = document.getElementById('sync-conflicts-section');
            if (conflictsSection) {
                conflictsSection.style.display = 'none';
            }
        }

        this.showNotification('تم الحل', 'تم حل التضارب بنجاح', 'success');
    }

    // الحصول على تسمية نوع البيانات
    getDataTypeLabel(dataType) {
        const labels = {
            casesData: 'الدعاوى',
            defendantsData: 'المدعى عليهم',
            lawyersData: 'المحامين',
            deductionsData: 'الاستقطاعات',
            notificationsData: 'الإشعارات',
            settingsData: 'الإعدادات'
        };
        return labels[dataType] || dataType;
    }

    // تحديث معلومات الجهاز
    async updateDeviceInfo() {
        if (!this.db || !this.currentUser) return;

        const devicePath = `users/${this.currentUser.uid}/devices/${this.currentDeviceId}`;
        await this.db.ref(devicePath).update({
            lastActive: new Date().toISOString(),
            lastSync: this.lastSyncTime,
            status: 'active'
        });
    }

    // إدارة الأجهزة
    showDeviceManager() {
        const modal = document.getElementById('device-management-modal');
        if (modal) {
            modal.classList.add('active');
            this.populateDevicesList();
        }
    }

    closeDeviceModal() {
        const modal = document.getElementById('device-management-modal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    // ملء قائمة الأجهزة
    populateDevicesList() {
        const container = document.getElementById('connected-devices-list');
        if (!container) return;

        const devices = Array.from(this.connectedDevices.entries());
        
        container.innerHTML = `
            ${this.createDeviceHTML(this.currentDeviceId, this.deviceInfo, true)}
            ${devices.map(([deviceId, device]) => this.createDeviceHTML(deviceId, device, false)).join('')}
        `;
    }

    // إنشاء HTML للجهاز
    createDeviceHTML(deviceId, device, isCurrent) {
        const isOnline = isCurrent || this.isDeviceOnline(device);
        const lastActive = this.formatDate(device.lastActive);
        
        return `
            <div class="device-item ${isCurrent ? 'current' : ''}">
                <div class="device-info">
                    <div class="device-icon">
                        <i class="fas fa-${this.getDeviceIconFromInfo(device)}"></i>
                    </div>
                    <div class="device-details">
                        <h5>${device.deviceName || device.id}</h5>
                        <p>معرف: ${deviceId}</p>
                        <p>النظام: ${device.platform}</p>
                        <p>آخر نشاط: ${lastActive}</p>
                        ${device.lastSync ? `<p>آخر مزامنة: ${this.formatDate(device.lastSync)}</p>` : ''}
                    </div>
                </div>
                <div class="device-status ${isOnline ? 'online' : 'offline'}">
                    <i class="fas fa-circle"></i>
                    ${isCurrent ? 'الجهاز الحالي' : (isOnline ? 'متصل' : 'غير متصل')}
                </div>
                ${!isCurrent ? `
                    <button class="btn btn-danger btn-sm" onclick="multiDeviceSync.disconnectDevice('${deviceId}')" title="قطع الاتصال">
                        <i class="fas fa-unlink"></i>
                    </button>
                ` : ''}
            </div>
        `;
    }

    // تحديد أيقونة الجهاز من المعلومات
    getDeviceIconFromInfo(device) {
        const platform = (device.platform || '').toLowerCase();
        const userAgent = (device.userAgent || '').toLowerCase();
        
        if (userAgent.includes('mobile') || userAgent.includes('android')) return 'mobile-alt';
        if (userAgent.includes('tablet') || userAgent.includes('ipad')) return 'tablet-alt';
        if (platform.includes('mac')) return 'laptop';
        return 'desktop';
    }

    // فحص ما إذا كان الجهاز متصل
    isDeviceOnline(device) {
        const lastActive = new Date(device.lastActive);
        const now = new Date();
        const diffMinutes = (now - lastActive) / (1000 * 60);
        return diffMinutes < 10; // متصل إذا كان نشطاً خلال آخر 10 دقائق
    }

    // قطع اتصال جهاز
    async disconnectDevice(deviceId) {
        if (!confirm('هل أنت متأكد من قطع اتصال هذا الجهاز؟')) return;

        try {
            if (this.db && this.currentUser) {
                const devicePath = `users/${this.currentUser.uid}/devices/${deviceId}`;
                await this.db.ref(devicePath).update({
                    status: 'disconnected',
                    disconnectedAt: new Date().toISOString()
                });
            }

            this.connectedDevices.delete(deviceId);
            this.populateDevicesList();
            this.showNotification('تم قطع الاتصال', 'تم قطع اتصال الجهاز بنجاح', 'success');

        } catch (error) {
            console.error('خطأ في قطع اتصال الجهاز:', error);
            this.showNotification('خطأ', 'فشل في قطع اتصال الجهاز', 'error');
        }
    }

    // قطع اتصال جميع الأجهزة
    async disconnectAllDevices() {
        if (!confirm('هل أنت متأكد من قطع اتصال جميع الأجهزة؟ سيتم إيقاف المزامنة.')) return;

        try {
            for (const deviceId of this.connectedDevices.keys()) {
                await this.disconnectDevice(deviceId);
            }

            // قطع الاتصال الحالي
            this.isAuthenticated = false;
            this.stopAutoSync();
            this.updateSyncStatus('disconnected', 'غير متصل');
            
            // مسح بيانات المصادقة
            this.userCredentials = null;
            this.encryptionKey = null;

            this.closeDeviceModal();
            this.showNotification('تم قطع الاتصال', 'تم قطع اتصال جميع الأجهزة', 'success');

        } catch (error) {
            console.error('خطأ في قطع اتصال الأجهزة:', error);
            this.showNotification('خطأ', 'فشل في قطع اتصال بعض الأجهزة', 'error');
        }
    }

    // إنشاء رمز الاتصال للجهاز الجديد
    generateDeviceCode() {
        const deviceName = document.getElementById('new-device-name').value.trim();
        const deviceType = document.getElementById('new-device-type').value;

        if (!deviceName) {
            this.showNotification('خطأ', 'يرجى إدخال اسم الجهاز', 'error');
            return;
        }

        if (this.connectedDevices.size >= this.userPreferences.maxDevices - 1) {
            this.showNotification('تحذير', `الحد الأقصى للأجهزة هو ${this.userPreferences.maxDevices}`, 'warning');
            return;
        }

        // إنشاء رمز فريد
        const deviceCode = this.generateSecureCode();
        
        // حفظ معلومات الجهاز الجديد مؤقتاً
        const tempDeviceInfo = {
            name: deviceName,
            type: deviceType,
            code: deviceCode,
            generatedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString() // ينتهي خلال 10 دقائق
        };

        localStorage.setItem('pendingDeviceConnection', JSON.stringify(tempDeviceInfo));

        // عرض الرمز
        document.getElementById('device-code-text').textContent = deviceCode;
        document.getElementById('device-code-section').style.display = 'block';

        // إنشاء QR Code (اختياري)
        this.generateQRCode(deviceCode);

        this.showNotification('تم إنشاء الرمز', 'استخدم هذا الرمز في الجهاز الجديد خلال 10 دقائق', 'info');
    }

    // إنشاء رمز آمن
    generateSecureCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    // إنشاء QR Code
    generateQRCode(code) {
        const container = document.getElementById('device-qr-code');
        if (container) {
            // QR Code بسيط باستخدام SVG
            container.innerHTML = `
                <div style="width: 150px; height: 150px; background: black; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; margin: 0 auto;">
                    QR: ${code}
                </div>
            `;
        }
    }

    // نسخ رمز الجهاز
    copyDeviceCode() {
        const codeText = document.getElementById('device-code-text').textContent;
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(codeText).then(() => {
                this.showNotification('تم النسخ', 'تم نسخ رمز الجهاز', 'success');
            });
        } else {
            // Fallback للمتصفحات القديمة
            const textArea = document.createElement('textarea');
            textArea.value = codeText;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showNotification('تم النسخ', 'تم نسخ رمز الجهاز', 'success');
        }
    }

    // معالجة تغيير الشبكة
    handleNetworkChange(isOnline) {
        if (isOnline) {
            this.showNotification('الشبكة متاحة', 'تم استعادة الاتصال بالإنترنت', 'success');
            if (this.isAuthenticated && this.userPreferences.autoSync) {
                setTimeout(() => this.performSync('network_reconnect'), 2000);
            }
        } else {
            this.updateSyncStatus('error', 'لا يوجد إنترنت');
            this.showNotification('انقطاع الشبكة', 'انقطع الاتصال بالإنترنت', 'warning');
        }
    }

    // إضافة للطابور
    queueSync(reason) {
        if (!this.isAuthenticated) return;
        
        clearTimeout(this.syncTimeout);
        this.syncTimeout = setTimeout(() => {
            this.performSync('queued_' + reason);
        }, 2000); // انتظار ثانيتين قبل المزامنة
    }

    // التشفير وفك التشفير
    async deriveKey(password) {
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            { name: 'PBKDF2' },
            false,
            ['deriveKey']
        );

        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: encoder.encode('legal-case-management-salt'),
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    }

    async encryptData(data) {
        if (!this.encryptionKey) return data;

        const encoder = new TextEncoder();
        const dataString = JSON.stringify(data);
        const iv = crypto.getRandomValues(new Uint8Array(this.ivLength));

        const encryptedData = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            this.encryptionKey,
            encoder.encode(dataString)
        );

        return {
            encrypted: true,
            iv: Array.from(iv),
            data: Array.from(new Uint8Array(encryptedData))
        };
    }

    async decryptData(encryptedObj) {
        if (!encryptedObj.encrypted || !this.encryptionKey) return encryptedObj;

        const iv = new Uint8Array(encryptedObj.iv);
        const data = new Uint8Array(encryptedObj.data);

        const decryptedData = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            this.encryptionKey,
            data
        );

        const decoder = new TextDecoder();
        return JSON.parse(decoder.decode(decryptedData));
    }

    // عرض تقدم المزامنة
    showSyncProgress(show) {
        const section = document.getElementById('sync-progress-section');
        if (section) {
            section.style.display = show ? 'block' : 'none';
        }
    }

    updateSyncProgress(percentage, message, details = '') {
        const fill = document.getElementById('sync-progress-fill');
        const messageEl = document.getElementById('sync-status-message');
        const detailsEl = document.getElementById('sync-details');

        if (fill) fill.style.width = percentage + '%';
        if (messageEl) messageEl.textContent = message;
        if (detailsEl) detailsEl.textContent = details;
    }

    // تسجيل سجل المزامنة
    recordSyncHistory(syncType, status, errorMessage = null) {
        const historyItem = {
            timestamp: new Date().toISOString(),
            syncType,
            status,
            deviceId: this.currentDeviceId,
            errorMessage
        };

        let syncHistory = JSON.parse(localStorage.getItem('syncHistory') || '[]');
        syncHistory.unshift(historyItem);
        
        // الاحتفاظ بآخر 50 عملية مزامنة فقط
        if (syncHistory.length > 50) {
            syncHistory = syncHistory.slice(0, 50);
        }

        localStorage.setItem('syncHistory', JSON.stringify(syncHistory));
    }

    // حفظ الحالة
    saveState() {
        const state = {
            deviceInfo: this.deviceInfo,
            lastSyncTime: this.lastSyncTime,
            isAuthenticated: this.isAuthenticated,
            connectedDevicesCount: this.connectedDevices.size
        };

        localStorage.setItem('multiDeviceSyncState', JSON.stringify(state));
    }

    // تحميل الحالة
    loadState() {
        const savedState = localStorage.getItem('multiDeviceSyncState');
        if (savedState) {
            try {
                const state = JSON.parse(savedState);
                this.lastSyncTime = state.lastSyncTime;
                this.deviceInfo = { ...this.deviceInfo, ...state.deviceInfo };
            } catch (error) {
                console.error('خطأ في تحميل الحالة المحفوظة:', error);
            }
        }
    }

    // الأدوات المساعدة
    formatDate(dateString) {
        if (!dateString) return 'غير محدد';
        const date = new Date(dateString);
        return date.toLocaleDateString('ar-SA') + ' ' + date.toLocaleTimeString('ar-SA', { hour12: false });
    }

    showNotification(title, message, type = 'info') {
        // استخدام نظام الإشعارات الموجود
        if (typeof window.showNotification === 'function') {
            window.showNotification(title, message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${title} - ${message}`);
        }
    }

    // تنظيف الموارد
    cleanup() {
        this.stopAutoSync();
        this.saveState();
        
        if (this.syncTimeout) {
            clearTimeout(this.syncTimeout);
        }

        console.log('🧹 تم تنظيف موارد نظام المزامنة المتقدم');
    }
}

// إنشاء مثيل نظام المزامنة المتقدم
let multiDeviceSync;

// التهيئة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    // انتظار تحميل الملفات الأساسية
    setTimeout(() => {
        try {
            multiDeviceSync = new MultiDeviceSyncManager();
            window.multiDeviceSync = multiDeviceSync;
            
            // تحميل الحالة المحفوظة
            multiDeviceSync.loadState();
            
            console.log('✅ تم تحميل نظام المزامنة المتقدم بنجاح');
            
            // إشعار المستخدم
            if (typeof window.showNotification === 'function') {
                window.showNotification(
                    'نظام المزامنة', 
                    'تم تحميل نظام المزامنة المتقدم بين الأجهزة', 
                    'success'
                );
            }
            
        } catch (error) {
            console.error('❌ خطأ في تحميل نظام المزامنة المتقدم:', error);
        }
    }, 2000); // انتظار ثانيتين لضمان تحميل الملفات الأساسية
});

// تنظيف عند إغلاق النافذة
window.addEventListener('beforeunload', function() {
    if (multiDeviceSync) {
        multiDeviceSync.cleanup();
    }
});

// تصدير للاستخدام في وحدات أخرى
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MultiDeviceSyncManager;
}

console.log('📱 Multi-Device Sync Manager v1.0 - تم تحميل الملف');