/**
 * نظام إدارة المستخدمين والصلاحيات المتقدم
 * Auth & Permissions Management System
 * للربط مع تطبيق إدارة الدعاوى القضائية
 */

class AuthManagementSystem {
    constructor() {
        // Firebase Configuration (نفس الإعدادات من التطبيق الرئيسي)
        this.firebaseConfig = {
            apiKey: "AIzaSyDGpAHia_wEmrhnmYjrPf1n1TrAzwEMiAI",
            authDomain: "messageemeapp.firebaseapp.com",
            databaseURL: "https://messageemeapp-default-rtdb.firebaseio.com",
            projectId: "messageemeapp",
            storageBucket: "messageemeapp.appspot.com",
            messagingSenderId: "255034474844",
            appId: "1:255034474844:web:5e3b7a6bc4b2fb94cc4199"
        };

        this.db = null;
        this.currentUser = null;
        this.isInitialized = false;

        // أنواع المستخدمين
        this.userTypes = {
            ADMIN: 'admin',           // المدير - صلاحيات كاملة
            LAWYER: 'lawyer',         // محامي - صلاحيات محدودة حسب دعاواه
            VIEWER: 'viewer',         // مشاهد فقط
            ACCOUNTANT: 'accountant'  // محاسب - صلاحيات مالية فقط
        };

        // الصلاحيات المتاحة
        this.permissions = {
            // صلاحيات الدعاوى
            VIEW_ALL_CASES: 'view_all_cases',           // رؤية جميع الدعاوى
            VIEW_OWN_CASES: 'view_own_cases',           // رؤية دعاواه فقط
            CREATE_CASE: 'create_case',                 // إنشاء دعوى
            EDIT_CASE: 'edit_case',                     // تعديل دعوى
            DELETE_CASE: 'delete_case',                 // حذف دعوى
            CHANGE_CASE_STATUS: 'change_case_status',   // تغيير حالة الدعوى
            
            // صلاحيات الاستقطاعات
            VIEW_DEDUCTIONS: 'view_deductions',         // رؤية الاستقطاعات
            ADD_DEDUCTION: 'add_deduction',             // إضافة استقطاع
            EDIT_DEDUCTION: 'edit_deduction',           // تعديل استقطاع
            DELETE_DEDUCTION: 'delete_deduction',       // حذف استقطاع
            
            // صلاحيات العملاء/المدعى عليهم
            VIEW_CLIENTS: 'view_clients',               // رؤية العملاء
            ADD_CLIENT: 'add_client',                   // إضافة عميل
            EDIT_CLIENT: 'edit_client',                 // تعديل عميل
            DELETE_CLIENT: 'delete_client',             // حذف عميل
            
            // صلاحيات التقارير
            VIEW_REPORTS: 'view_reports',               // رؤية التقارير
            EXPORT_REPORTS: 'export_reports',           // تصدير التقارير
            
            // صلاحيات إدارية
            MANAGE_USERS: 'manage_users',               // إدارة المستخدمين
            MANAGE_SETTINGS: 'manage_settings',         // إدارة الإعدادات
            VIEW_LOGS: 'view_logs'                      // رؤية السجلات
        };

        // الصلاحيات الافتراضية لكل نوع مستخدم
        this.defaultPermissions = {
            admin: Object.values(this.permissions), // جميع الصلاحيات
            lawyer: [
                this.permissions.VIEW_OWN_CASES,
                this.permissions.EDIT_CASE,
                this.permissions.CHANGE_CASE_STATUS,
                this.permissions.VIEW_DEDUCTIONS,
                this.permissions.ADD_DEDUCTION,
                this.permissions.VIEW_CLIENTS,
                this.permissions.VIEW_REPORTS
            ],
            viewer: [
                this.permissions.VIEW_ALL_CASES,
                this.permissions.VIEW_DEDUCTIONS,
                this.permissions.VIEW_CLIENTS,
                this.permissions.VIEW_REPORTS
            ],
            accountant: [
                this.permissions.VIEW_ALL_CASES,
                this.permissions.VIEW_DEDUCTIONS,
                this.permissions.ADD_DEDUCTION,
                this.permissions.EDIT_DEDUCTION,
                this.permissions.VIEW_REPORTS,
                this.permissions.EXPORT_REPORTS
            ]
        };

        this.initializeSystem();
    }

    // تهيئة النظام
    async initializeSystem() {
        try {
            console.log('🔐 جاري تهيئة نظام الحماية والصلاحيات...');
            
            await this.loadFirebaseSDK();
            await this.initializeFirebase();
            await this.loadCurrentUser();
            
            this.isInitialized = true;
            console.log('✅ تم تهيئة نظام الحماية بنجاح');
            
            // إنشاء واجهة المستخدم
            this.createAuthUI();
            
        } catch (error) {
            console.error('❌ خطأ في تهيئة نظام الحماية:', error);
            this.showNotification('خطأ في تهيئة النظام', error.message, 'error');
        }
    }

    // تحميل Firebase SDK
    async loadFirebaseSDK() {
        if (window.firebase) {
            console.log('✅ Firebase SDK موجود مسبقاً');
            return;
        }

        return new Promise((resolve, reject) => {
            // تحميل Firebase App
            const appScript = document.createElement('script');
            appScript.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js';
            appScript.onload = () => {
                // تحميل Firebase Database
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
            throw error;
        }
    }

    // تحميل المستخدم الحالي من localStorage
    async loadCurrentUser() {
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            this.currentUser = JSON.parse(storedUser);
            console.log('✅ تم تحميل بيانات المستخدم:', this.currentUser.username);
            
            // التحقق من صحة الجلسة
            await this.validateSession();
        }
    }

    // التحقق من صحة الجلسة
    async validateSession() {
        if (!this.currentUser) return false;

        try {
            const userRef = this.db.ref(`users/${this.currentUser.id}`);
            const snapshot = await userRef.once('value');
            
            if (!snapshot.exists()) {
                this.logout();
                return false;
            }

            return true;
        } catch (error) {
            console.error('خطأ في التحقق من الجلسة:', error);
            return false;
        }
    }

    // ==================== إدارة المستخدمين ====================

    // إنشاء مستخدم جديد (Admin فقط)
    async createUser(userData) {
        if (!this.hasPermission(this.permissions.MANAGE_USERS)) {
            this.showNotification('خطأ', 'ليس لديك صلاحية لإنشاء مستخدمين', 'error');
            return null;
        }

        try {
            const userId = this.generateUserId();
            const username = this.generateUsername(userData.name);
            const password = this.generatePassword();

            const newUser = {
                id: userId,
                username: username,
                password: this.hashPassword(password), // في الإنتاج، استخدم bcrypt
                name: userData.name,
                type: userData.type || this.userTypes.LAWYER,
                permissions: userData.permissions || this.defaultPermissions[userData.type],
                assignedCases: [], // الدعاوى المخصصة للمحامي
                createdAt: new Date().toISOString(),
                createdBy: this.currentUser.id,
                isActive: true,
                lastLogin: null,
                metadata: {
                    phone: userData.phone || '',
                    email: userData.email || '',
                    licenseNumber: userData.licenseNumber || '',
                    specialization: userData.specialization || ''
                }
            };

            // حفظ في Firebase
            await this.db.ref(`users/${userId}`).set(newUser);

            // حفظ في localStorage للتطبيق الرئيسي
            const users = this.getLocalUsers();
            users.push(newUser);
            localStorage.setItem('users', JSON.stringify(users));

            // إرسال بيانات الدخول للمستخدم
            this.showNotification(
                'تم إنشاء المستخدم بنجاح',
                `اسم المستخدم: ${username}\nكلمة المرور: ${password}\nيرجى حفظ هذه البيانات`,
                'success'
            );

            // تسجيل في السجلات
            await this.logAction('create_user', {
                userId: userId,
                username: username,
                type: userData.type
            });

            return { userId, username, password, user: newUser };

        } catch (error) {
            console.error('خطأ في إنشاء المستخدم:', error);
            this.showNotification('خطأ', 'فشل في إنشاء المستخدم', 'error');
            return null;
        }
    }

    // تسجيل الدخول
    async login(username, password) {
        try {
            // البحث عن المستخدم
            const usersRef = this.db.ref('users');
            const snapshot = await usersRef.orderByChild('username').equalTo(username).once('value');

            if (!snapshot.exists()) {
                this.showNotification('خطأ', 'اسم المستخدم غير موجود', 'error');
                return false;
            }

            const userData = Object.values(snapshot.val())[0];

            // التحقق من كلمة المرور
            if (userData.password !== this.hashPassword(password)) {
                this.showNotification('خطأ', 'كلمة المرور غير صحيحة', 'error');
                return false;
            }

            // التحقق من أن الحساب نشط
            if (!userData.isActive) {
                this.showNotification('خطأ', 'هذا الحساب معطل، يرجى التواصل مع المدير', 'error');
                return false;
            }

            // تحديث آخر تسجيل دخول
            await this.db.ref(`users/${userData.id}/lastLogin`).set(new Date().toISOString());

            // حفظ بيانات المستخدم
            this.currentUser = userData;
            localStorage.setItem('currentUser', JSON.stringify(userData));

            // تسجيل في السجلات
            await this.logAction('login', { userId: userData.id });

            this.showNotification('مرحباً', `أهلاً بك ${userData.name}`, 'success');
            
            // تحديث الواجهة
            this.updateUIAfterLogin();

            return true;

        } catch (error) {
            console.error('خطأ في تسجيل الدخول:', error);
            this.showNotification('خطأ', 'فشل في تسجيل الدخول', 'error');
            return false;
        }
    }

    // تسجيل الخروج
    logout() {
        if (this.currentUser) {
            this.logAction('logout', { userId: this.currentUser.id });
        }

        this.currentUser = null;
        localStorage.removeItem('currentUser');
        
        this.showNotification('تم تسجيل الخروج', 'تم تسجيل خروجك بنجاح', 'info');
        this.updateUIAfterLogout();
    }

    // ==================== إدارة الصلاحيات ====================

    // التحقق من صلاحية
    hasPermission(permission) {
        if (!this.currentUser) return false;
        if (this.currentUser.type === this.userTypes.ADMIN) return true;
        return this.currentUser.permissions.includes(permission);
    }

    // تعيين دعوى لمحامي
    async assignCaseToLawyer(caseId, lawyerId) {
        if (!this.hasPermission(this.permissions.MANAGE_USERS)) {
            this.showNotification('خطأ', 'ليس لديك صلاحية لتعيين الدعاوى', 'error');
            return false;
        }

        try {
            // إضافة الدعوى للمحامي
            const lawyerRef = this.db.ref(`users/${lawyerId}/assignedCases`);
            const snapshot = await lawyerRef.once('value');
            const assignedCases = snapshot.val() || [];
            
            if (!assignedCases.includes(caseId)) {
                assignedCases.push(caseId);
                await lawyerRef.set(assignedCases);

                // تحديث الدعوى
                await this.db.ref(`cases/${caseId}/assignedLawyer`).set(lawyerId);

                // تسجيل في السجلات
                await this.logAction('assign_case', {
                    caseId: caseId,
                    lawyerId: lawyerId
                });

                this.showNotification('نجح', 'تم تعيين الدعوى للمحامي', 'success');
                return true;
            }

            return false;

        } catch (error) {
            console.error('خطأ في تعيين الدعوى:', error);
            this.showNotification('خطأ', 'فشل في تعيين الدعوى', 'error');
            return false;
        }
    }

    // إلغاء تعيين دعوى من محامي
    async unassignCaseFromLawyer(caseId, lawyerId) {
        if (!this.hasPermission(this.permissions.MANAGE_USERS)) {
            this.showNotification('خطأ', 'ليس لديك صلاحية لإلغاء تعيين الدعاوى', 'error');
            return false;
        }

        try {
            const lawyerRef = this.db.ref(`users/${lawyerId}/assignedCases`);
            const snapshot = await lawyerRef.once('value');
            let assignedCases = snapshot.val() || [];
            
            assignedCases = assignedCases.filter(id => id !== caseId);
            await lawyerRef.set(assignedCases);

            await this.db.ref(`cases/${caseId}/assignedLawyer`).remove();

            await this.logAction('unassign_case', {
                caseId: caseId,
                lawyerId: lawyerId
            });

            this.showNotification('نجح', 'تم إلغاء تعيين الدعوى', 'success');
            return true;

        } catch (error) {
            console.error('خطأ في إلغاء التعيين:', error);
            this.showNotification('خطأ', 'فشل في إلغاء تعيين الدعوى', 'error');
            return false;
        }
    }

    // الحصول على دعاوى المحامي
    async getLawyerCases(lawyerId) {
        try {
            const userRef = this.db.ref(`users/${lawyerId || this.currentUser.id}`);
            const snapshot = await userRef.once('value');
            const userData = snapshot.val();

            if (!userData || !userData.assignedCases) {
                return [];
            }

            // جلب تفاصيل كل دعوى
            const cases = [];
            for (const caseId of userData.assignedCases) {
                const caseSnapshot = await this.db.ref(`cases/${caseId}`).once('value');
                if (caseSnapshot.exists()) {
                    cases.push({ id: caseId, ...caseSnapshot.val() });
                }
            }

            return cases;

        } catch (error) {
            console.error('خطأ في جلب دعاوى المحامي:', error);
            return [];
        }
    }

    // ==================== إدارة الاستقطاعات للمحامين ====================

    // إضافة استقطاع من قبل المحامي
    async addDeductionByLawyer(caseId, deductionData) {
        // التحقق من الصلاحية
        if (!this.hasPermission(this.permissions.ADD_DEDUCTION)) {
            this.showNotification('خطأ', 'ليس لديك صلاحية لإضافة استقطاعات', 'error');
            return false;
        }

        // التحقق من أن الدعوى مخصصة للمحامي
        if (this.currentUser.type === this.userTypes.LAWYER) {
            if (!this.currentUser.assignedCases.includes(caseId)) {
                this.showNotification('خطأ', 'هذه الدعوى غير مخصصة لك', 'error');
                return false;
            }
        }

        try {
            const deductionId = this.generateDeductionId();
            
            const newDeduction = {
                id: deductionId,
                caseId: caseId,
                amount: parseFloat(deductionData.amount),
                date: deductionData.date || new Date().toISOString(),
                notes: deductionData.notes || '',
                addedBy: this.currentUser.id,
                addedByName: this.currentUser.name,
                createdAt: new Date().toISOString(),
                type: 'court_deduction', // استقطاع من المحكمة
                status: 'pending', // pending, received, processed
                receiptNumber: deductionData.receiptNumber || ''
            };

            // حفظ في Firebase
            await this.db.ref(`deductions/${deductionId}`).set(newDeduction);
            
            // تحديث الدعوى
            const caseRef = this.db.ref(`cases/${caseId}`);
            const caseSnapshot = await caseRef.once('value');
            const caseData = caseSnapshot.val();

            if (caseData) {
                const updatedDeductions = caseData.deductions || [];
                updatedDeductions.push(deductionId);
                
                const totalDeducted = (caseData.totalDeducted || 0) + newDeduction.amount;
                const remainingAmount = caseData.amount - totalDeducted;

                await caseRef.update({
                    deductions: updatedDeductions,
                    totalDeducted: totalDeducted,
                    remainingAmount: remainingAmount,
                    lastDeductionDate: newDeduction.date,
                    lastUpdated: new Date().toISOString(),
                    lastUpdatedBy: this.currentUser.id
                });
            }

            // حفظ في localStorage
            const deductions = JSON.parse(localStorage.getItem('deductions') || '[]');
            deductions.push(newDeduction);
            localStorage.setItem('deductions', JSON.stringify(deductions));

            // تسجيل في السجلات
            await this.logAction('add_deduction', {
                deductionId: deductionId,
                caseId: caseId,
                amount: newDeduction.amount
            });

            // إرسال إشعار للأدمن
            await this.sendNotificationToAdmin('deduction_added', {
                lawyerName: this.currentUser.name,
                caseId: caseId,
                amount: newDeduction.amount
            });

            this.showNotification('نجح', `تم إضافة استقطاع بمبلغ ${newDeduction.amount.toLocaleString()} د.ع`, 'success');
            
            return newDeduction;

        } catch (error) {
            console.error('خطأ في إضافة الاستقطاع:', error);
            this.showNotification('خطأ', 'فشل في إضافة الاستقطاع', 'error');
            return null;
        }
    }

    // تحديث حالة الدعوى من قبل المحامي
    async updateCaseStatusByLawyer(caseId, newStatus, notes = '') {
        if (!this.hasPermission(this.permissions.CHANGE_CASE_STATUS)) {
            this.showNotification('خطأ', 'ليس لديك صلاحية لتغيير حالة الدعوى', 'error');
            return false;
        }

        // التحقق من أن الدعوى مخصصة للمحامي
        if (this.currentUser.type === this.userTypes.LAWYER) {
            if (!this.currentUser.assignedCases.includes(caseId)) {
                this.showNotification('خطأ', 'هذه الدعوى غير مخصصة لك', 'error');
                return false;
            }
        }

        try {
            const updateData = {
                stage: newStatus,
                lastUpdated: new Date().toISOString(),
                lastUpdatedBy: this.currentUser.id,
                lastUpdatedByName: this.currentUser.name
            };

            if (notes) {
                updateData.statusNotes = notes;
            }

            // إضافة حقول خاصة حسب الحالة
            if (newStatus === 'التنفيذ') {
                updateData.executionStartDate = new Date().toISOString();
            } else if (newStatus === 'مكتملة') {
                updateData.completionDate = new Date().toISOString();
            }

            await this.db.ref(`cases/${caseId}`).update(updateData);

            // تحديث localStorage
            const cases = JSON.parse(localStorage.getItem('cases') || '[]');
            const caseIndex = cases.findIndex(c => c.id === caseId);
            if (caseIndex !== -1) {
                cases[caseIndex] = { ...cases[caseIndex], ...updateData };
                localStorage.setItem('cases', JSON.stringify(cases));
            }

            // تسجيل في السجلات
            await this.logAction('update_case_status', {
                caseId: caseId,
                oldStatus: cases[caseIndex]?.stage,
                newStatus: newStatus
            });

            // إرسال إشعار للأدمن
            await this.sendNotificationToAdmin('case_status_updated', {
                lawyerName: this.currentUser.name,
                caseId: caseId,
                newStatus: newStatus
            });

            this.showNotification('نجح', 'تم تحديث حالة الدعوى', 'success');
            return true;

        } catch (error) {
            console.error('خطأ في تحديث حالة الدعوى:', error);
            this.showNotification('خطأ', 'فشل في تحديث حالة الدعوى', 'error');
            return false;
        }
    }

    // ==================== وظائف مساعدة ====================

    // توليد معرف مستخدم
    generateUserId() {
        return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // توليد اسم مستخدم
    generateUsername(name) {
        const cleanName = name.replace(/\s+/g, '').toLowerCase();
        const randomNum = Math.floor(Math.random() * 999);
        return `${cleanName}${randomNum}`;
    }

    // توليد كلمة مرور
    generatePassword() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
        let password = '';
        for (let i = 0; i < 8; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    }

    // تشفير كلمة المرور (بسيط - في الإنتاج استخدم bcrypt)
    hashPassword(password) {
        // هذا تشفير بسيط للتوضيح فقط
        // في الإنتاج، استخدم مكتبة مثل bcrypt
        return btoa(password + 'salt_key_123');
    }

    // توليد معرف استقطاع
    generateDeductionId() {
        return 'ded_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // الحصول على المستخدمين من localStorage
    getLocalUsers() {
        return JSON.parse(localStorage.getItem('users') || '[]');
    }

    // تسجيل الإجراءات
    async logAction(action, details) {
        try {
            const logEntry = {
                action: action,
                userId: this.currentUser?.id,
                username: this.currentUser?.username,
                timestamp: new Date().toISOString(),
                details: details
            };

            await this.db.ref('logs').push(logEntry);
            
            // حفظ في localStorage أيضاً
            const logs = JSON.parse(localStorage.getItem('activityLogs') || '[]');
            logs.push(logEntry);
            // الاحتفاظ بآخر 1000 سجل فقط
            if (logs.length > 1000) {
                logs.splice(0, logs.length - 1000);
            }
            localStorage.setItem('activityLogs', JSON.stringify(logs));

        } catch (error) {
            console.error('خطأ في تسجيل الإجراء:', error);
        }
    }

    // إرسال إشعار للأدمن
    async sendNotificationToAdmin(type, data) {
        try {
            const notification = {
                type: type,
                from: this.currentUser.name,
                data: data,
                timestamp: new Date().toISOString(),
                read: false
            };

            await this.db.ref('admin_notifications').push(notification);

        } catch (error) {
            console.error('خطأ في إرسال الإشعار:', error);
        }
    }

    // ==================== واجهة المستخدم ====================

    // إنشاء واجهة المستخدم
    createAuthUI() {
        // إضافة زر إدارة المستخدمين في الهيدر
        const authButton = document.createElement('div');
        authButton.className = 'auth-management-button';
        authButton.innerHTML = `
            <button class="btn-auth" onclick="window.authSystem.showAuthPanel()">
                <i class="fas fa-users-cog"></i>
                <span>إدارة المستخدمين</span>
            </button>
        `;

        // إضافة الزر للهيدر
        const header = document.querySelector('.header-right');
        if (header) {
            header.insertBefore(authButton, header.firstChild);
        }

        // إضافة أنماط CSS
        this.injectAuthStyles();
    }

    // عرض لوحة إدارة المستخدمين
    showAuthPanel() {
        if (!this.hasPermission(this.permissions.MANAGE_USERS)) {
            this.showNotification('خطأ', 'ليس لديك صلاحية للوصول لهذه الصفحة', 'error');
            return;
        }

        const panel = document.createElement('div');
        panel.className = 'auth-panel-overlay';
        panel.innerHTML = `
            <div class="auth-panel">
                <div class="auth-panel-header">
                    <h2><i class="fas fa-users-cog"></i> إدارة المستخدمين والصلاحيات</h2>
                    <button class="close-btn" onclick="this.closest('.auth-panel-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <div class="auth-panel-tabs">
                    <button class="tab-btn active" data-tab="users">
                        <i class="fas fa-users"></i> المستخدمين
                    </button>
                    <button class="tab-btn" data-tab="create">
                        <i class="fas fa-user-plus"></i> إضافة مستخدم
                    </button>
                    <button class="tab-btn" data-tab="assign">
                        <i class="fas fa-link"></i> تعيين الدعاوى
                    </button>
                    <button class="tab-btn" data-tab="logs">
                        <i class="fas fa-history"></i> السجلات
                    </button>
                </div>

                <div class="auth-panel-content">
                    <div class="tab-content active" id="users-tab">
                        <div class="users-list" id="users-list-container"></div>
                    </div>

                    <div class="tab-content" id="create-tab">
                        <div class="create-user-form">
                            <h3>إنشاء مستخدم جديد</h3>
                            <div class="form-group">
                                <label>الاسم الكامل</label>
                                <input type="text" id="new-user-name" placeholder="أحمد محمد">
                            </div>
                            <div class="form-group">
                                <label>نوع المستخدم</label>
                                <select id="new-user-type">
                                    <option value="lawyer">محامي</option>
                                    <option value="viewer">مشاهد</option>
                                    <option value="accountant">محاسب</option>
                                    <option value="admin">مدير</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>رقم الهاتف</label>
                                <input type="tel" id="new-user-phone" placeholder="07XX XXX XXXX">
                            </div>
                            <div class="form-group">
                                <label>البريد الإلكتروني</label>
                                <input type="email" id="new-user-email" placeholder="example@email.com">
                            </div>
                            <div class="form-group">
                                <label>رقم الإجازة (للمحامين)</label>
                                <input type="text" id="new-user-license">
                            </div>
                            <button class="btn-create-user" onclick="window.authSystem.handleCreateUser()">
                                <i class="fas fa-user-plus"></i> إنشاء المستخدم
                            </button>
                        </div>
                    </div>

                    <div class="tab-content" id="assign-tab">
                        <div class="assign-cases-container" id="assign-cases-container"></div>
                    </div>

                    <div class="tab-content" id="logs-tab">
                        <div class="logs-container" id="logs-container"></div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(panel);

        // تفعيل التبويبات
        this.activateTabs(panel);

        // تحميل البيانات
        this.loadUsersList();
        this.loadAssignmentsList();
        this.loadLogs();
    }

    // تفعيل التبويبات
    activateTabs(panel) {
        const tabButtons = panel.querySelectorAll('.tab-btn');
        const tabContents = panel.querySelectorAll('.tab-content');

        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.dataset.tab;
                
                tabButtons.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));
                
                btn.classList.add('active');
                panel.querySelector(`#${tabName}-tab`).classList.add('active');
            });
        });
    }

    // تحميل قائمة المستخدمين
    async loadUsersList() {
        const container = document.getElementById('users-list-container');
        if (!container) return;

        try {
            const snapshot = await this.db.ref('users').once('value');
            const users = snapshot.val() || {};

            let html = '<div class="users-grid">';
            
            Object.values(users).forEach(user => {
                html += `
                    <div class="user-card">
                        <div class="user-card-header">
                            <div class="user-avatar">${user.name.charAt(0)}</div>
                            <div class="user-info">
                                <h4>${user.name}</h4>
                                <p class="user-username">@${user.username}</p>
                            </div>
                            <span class="user-type-badge ${user.type}">${this.getUserTypeLabel(user.type)}</span>
                        </div>
                        <div class="user-card-body">
                            <div class="user-detail">
                                <i class="fas fa-briefcase"></i>
                                <span>${user.assignedCases?.length || 0} دعوى مخصصة</span>
                            </div>
                            <div class="user-detail">
                                <i class="fas fa-clock"></i>
                                <span>آخر دخول: ${user.lastLogin ? this.formatDate(user.lastLogin) : 'لم يسجل دخول'}</span>
                            </div>
                            <div class="user-status ${user.isActive ? 'active' : 'inactive'}">
                                <i class="fas fa-circle"></i>
                                ${user.isActive ? 'نشط' : 'معطل'}
                            </div>
                        </div>
                        <div class="user-card-actions">
                            <button onclick="window.authSystem.editUser('${user.id}')" class="btn-icon" title="تعديل">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="window.authSystem.toggleUserStatus('${user.id}')" class="btn-icon" title="${user.isActive ? 'تعطيل' : 'تفعيل'}">
                                <i class="fas fa-${user.isActive ? 'ban' : 'check'}"></i>
                            </button>
                            <button onclick="window.authSystem.deleteUser('${user.id}')" class="btn-icon btn-danger" title="حذف">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            });

            html += '</div>';
            container.innerHTML = html;

        } catch (error) {
            console.error('خطأ في تحميل المستخدمين:', error);
        }
    }

    // معالجة إنشاء مستخدم جديد
    async handleCreateUser() {
        const name = document.getElementById('new-user-name').value.trim();
        const type = document.getElementById('new-user-type').value;
        const phone = document.getElementById('new-user-phone').value.trim();
        const email = document.getElementById('new-user-email').value.trim();
        const license = document.getElementById('new-user-license').value.trim();

        if (!name) {
            this.showNotification('خطأ', 'يرجى إدخال اسم المستخدم', 'error');
            return;
        }

        const result = await this.createUser({
            name: name,
            type: type,
            phone: phone,
            email: email,
            licenseNumber: license
        });

        if (result) {
            // مسح النموذج
            document.getElementById('new-user-name').value = '';
            document.getElementById('new-user-phone').value = '';
            document.getElementById('new-user-email').value = '';
            document.getElementById('new-user-license').value = '';
            
            // تحديث القائمة
            this.loadUsersList();

            // عرض بيانات الدخول
            this.showLoginCredentials(result);
        }
    }

    // عرض بيانات الدخول
    showLoginCredentials(data) {
        const modal = document.createElement('div');
        modal.className = 'credentials-modal-overlay';
        modal.innerHTML = `
            <div class="credentials-modal">
                <h3><i class="fas fa-key"></i> بيانات الدخول للمستخدم الجديد</h3>
                <div class="credentials-info">
                    <div class="credential-item">
                        <label>اسم المستخدم:</label>
                        <div class="credential-value">
                            <code>${data.username}</code>
                            <button onclick="navigator.clipboard.writeText('${data.username}')" class="btn-copy">
                                <i class="fas fa-copy"></i>
                            </button>
                        </div>
                    </div>
                    <div class="credential-item">
                        <label>كلمة المرور:</label>
                        <div class="credential-value">
                            <code>${data.password}</code>
                            <button onclick="navigator.clipboard.writeText('${data.password}')" class="btn-copy">
                                <i class="fas fa-copy"></i>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="credentials-warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    يرجى حفظ هذه البيانات في مكان آمن. لن تتمكن من رؤيتها مرة أخرى!
                </div>
                <button class="btn-close-modal" onclick="this.closest('.credentials-modal-overlay').remove()">
                    فهمت، أغلق
                </button>
            </div>
        `;

        document.body.appendChild(modal);
    }

    // تحميل قائمة التعيينات
    async loadAssignmentsList() {
        const container = document.getElementById('assign-cases-container');
        if (!container) return;

        try {
            const usersSnapshot = await this.db.ref('users').once('value');
            const users = usersSnapshot.val() || {};

            const casesSnapshot = await this.db.ref('cases').once('value');
            const cases = casesSnapshot.val() || {};

            let html = '<div class="assign-section">';
            html += '<h3>تعيين دعوى لمحامي</h3>';
            html += '<div class="assign-form">';
            html += '<select id="assign-lawyer-select"><option value="">اختر محامي...</option>';
            
            Object.values(users).forEach(user => {
                if (user.type === this.userTypes.LAWYER) {
                    html += `<option value="${user.id}">${user.name}</option>`;
                }
            });
            
            html += '</select>';
            html += '<select id="assign-case-select"><option value="">اختر دعوى...</option>';
            
            Object.entries(cases).forEach(([id, caseData]) => {
                html += `<option value="${id}">${caseData.caseNumber} - ${caseData.defendantName}</option>`;
            });
            
            html += '</select>';
            html += '<button onclick="window.authSystem.handleAssignCase()" class="btn-assign">تعيين</button>';
            html += '</div></div>';

            container.innerHTML = html;

        } catch (error) {
            console.error('خطأ في تحميل التعيينات:', error);
        }
    }

    // معالجة تعيين دعوى
    async handleAssignCase() {
        const lawyerId = document.getElementById('assign-lawyer-select').value;
        const caseId = document.getElementById('assign-case-select').value;

        if (!lawyerId || !caseId) {
            this.showNotification('خطأ', 'يرجى اختيار المحامي والدعوى', 'error');
            return;
        }

        await this.assignCaseToLawyer(caseId, lawyerId);
        this.loadAssignmentsList();
    }

    // تحميل السجلات
    async loadLogs() {
        const container = document.getElementById('logs-container');
        if (!container) return;

        try {
            const snapshot = await this.db.ref('logs').limitToLast(50).once('value');
            const logs = [];
            
            snapshot.forEach(child => {
                logs.push(child.val());
            });

            logs.reverse();

            let html = '<div class="logs-list">';
            
            logs.forEach(log => {
                html += `
                    <div class="log-item">
                        <div class="log-icon">
                            <i class="fas fa-${this.getLogIcon(log.action)}"></i>
                        </div>
                        <div class="log-details">
                            <div class="log-action">${this.getLogActionLabel(log.action)}</div>
                            <div class="log-user">${log.username}</div>
                            <div class="log-time">${this.formatDate(log.timestamp)}</div>
                        </div>
                    </div>
                `;
            });

            html += '</div>';
            container.innerHTML = html;

        } catch (error) {
            console.error('خطأ في تحميل السجلات:', error);
        }
    }

    // دوال مساعدة للواجهة
    getUserTypeLabel(type) {
        const labels = {
            admin: 'مدير',
            lawyer: 'محامي',
            viewer: 'مشاهد',
            accountant: 'محاسب'
        };
        return labels[type] || type;
    }

    getLogIcon(action) {
        const icons = {
            login: 'sign-in-alt',
            logout: 'sign-out-alt',
            create_user: 'user-plus',
            assign_case: 'link',
            add_deduction: 'dollar-sign',
            update_case_status: 'edit'
        };
        return icons[action] || 'circle';
    }

    getLogActionLabel(action) {
        const labels = {
            login: 'تسجيل دخول',
            logout: 'تسجيل خروج',
            create_user: 'إنشاء مستخدم',
            assign_case: 'تعيين دعوى',
            add_deduction: 'إضافة استقطاع',
            update_case_status: 'تحديث حالة الدعوى'
        };
        return labels[action] || action;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('ar-IQ');
    }

    // تحديث الواجهة بعد تسجيل الدخول
    updateUIAfterLogin() {
        // يمكن إضافة تحديثات على الواجهة هنا
        console.log('تم تحديث الواجهة بعد تسجيل الدخول');
    }

    // تحديث الواجهة بعد تسجيل الخروج
    updateUIAfterLogout() {
        // يمكن إضافة تحديثات على الواجهة هنا
        console.log('تم تحديث الواجهة بعد تسجيل الخروج');
    }

    // إضافة أنماط CSS
    injectAuthStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .auth-management-button {
                margin-left: 1rem;
            }

            .btn-auth {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.75rem 1.5rem;
                background: linear-gradient(135deg, #6366f1, #8b5cf6);
                color: white;
                border: none;
                border-radius: 0.75rem;
                cursor: pointer;
                font-size: 0.9rem;
                font-weight: 600;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
            }

            .btn-auth:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
            }

            .auth-panel-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(5px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                animation: fadeIn 0.3s ease;
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            .auth-panel {
                background: white;
                border-radius: 1rem;
                width: 90%;
                max-width: 1200px;
                max-height: 90vh;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
                animation: slideUp 0.3s ease;
            }

            @keyframes slideUp {
                from {
                    transform: translateY(50px);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }

            .auth-panel-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1.5rem 2rem;
                background: linear-gradient(135deg, #6366f1, #8b5cf6);
                color: white;
            }

            .auth-panel-header h2 {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                font-size: 1.5rem;
                margin: 0;
            }

            .close-btn {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                width: 2.5rem;
                height: 2.5rem;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
            }

            .close-btn:hover {
                background: rgba(255, 255, 255, 0.3);
                transform: rotate(90deg);
            }

            .auth-panel-tabs {
                display: flex;
                gap: 0.5rem;
                padding: 1rem 2rem 0;
                background: #f9fafb;
                border-bottom: 2px solid #e5e7eb;
            }

            .tab-btn {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.75rem 1.5rem;
                background: transparent;
                border: none;
                border-radius: 0.5rem 0.5rem 0 0;
                cursor: pointer;
                font-size: 0.95rem;
                font-weight: 500;
                color: #6b7280;
                transition: all 0.3s ease;
            }

            .tab-btn:hover {
                background: rgba(99, 102, 241, 0.1);
                color: #6366f1;
            }

            .tab-btn.active {
                background: white;
                color: #6366f1;
                font-weight: 600;
            }

            .auth-panel-content {
                flex: 1;
                overflow-y: auto;
                padding: 2rem;
            }

            .tab-content {
                display: none;
            }

            .tab-content.active {
                display: block;
            }

            .users-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
                gap: 1.5rem;
            }

            .user-card {
                background: white;
                border: 1px solid #e5e7eb;
                border-radius: 1rem;
                padding: 1.5rem;
                transition: all 0.3s ease;
            }

            .user-card:hover {
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
                transform: translateY(-5px);
            }

            .user-card-header {
                display: flex;
                align-items: center;
                gap: 1rem;
                margin-bottom: 1rem;
            }

            .user-avatar {
                width: 3rem;
                height: 3rem;
                background: linear-gradient(135deg, #6366f1, #8b5cf6);
                color: white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.25rem;
                font-weight: bold;
            }

            .user-info h4 {
                margin: 0;
                font-size: 1.1rem;
            }

            .user-username {
                color: #6b7280;
                font-size: 0.85rem;
                margin: 0.25rem 0 0;
            }

            .user-type-badge {
                padding: 0.25rem 0.75rem;
                border-radius: 1rem;
                font-size: 0.75rem;
                font-weight: 600;
                margin-right: auto;
            }

            .user-type-badge.admin {
                background: #fee2e2;
                color: #ef4444;
            }

            .user-type-badge.lawyer {
                background: #dbeafe;
                color: #3b82f6;
            }

            .user-type-badge.viewer {
                background: #d1fae5;
                color: #10b981;
            }

            .user-type-badge.accountant {
                background: #fef3c7;
                color: #f59e0b;
            }

            .user-card-body {
                padding: 1rem 0;
                border-top: 1px solid #f3f4f6;
                border-bottom: 1px solid #f3f4f6;
            }

            .user-detail {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                margin: 0.5rem 0;
                font-size: 0.85rem;
                color: #6b7280;
            }

            .user-status {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                margin-top: 0.75rem;
                font-size: 0.85rem;
                font-weight: 600;
            }

            .user-status.active {
                color: #10b981;
            }

            .user-status.inactive {
                color: #ef4444;
            }

            .user-card-actions {
                display: flex;
                gap: 0.5rem;
                margin-top: 1rem;
            }

            .btn-icon {
                flex: 1;
                padding: 0.5rem;
                background: #f3f4f6;
                border: none;
                border-radius: 0.5rem;
                cursor: pointer;
                transition: all 0.3s ease;
                color: #6b7280;
            }

            .btn-icon:hover {
                background: #e5e7eb;
                color: #374151;
            }

            .btn-icon.btn-danger:hover {
                background: #fee2e2;
                color: #ef4444;
            }

            .create-user-form {
                max-width: 600px;
                margin: 0 auto;
            }

            .form-group {
                margin-bottom: 1.5rem;
            }

            .form-group label {
                display: block;
                margin-bottom: 0.5rem;
                font-weight: 600;
                color: #374151;
            }

            .form-group input,
            .form-group select {
                width: 100%;
                padding: 0.75rem;
                border: 1px solid #e5e7eb;
                border-radius: 0.5rem;
                font-size: 1rem;
                transition: all 0.3s ease;
            }

            .form-group input:focus,
            .form-group select:focus {
                outline: none;
                border-color: #6366f1;
                box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
            }

            .btn-create-user {
                width: 100%;
                padding: 1rem;
                background: linear-gradient(135deg, #6366f1, #8b5cf6);
                color: white;
                border: none;
                border-radius: 0.75rem;
                font-size: 1rem;
                font-weight: 600;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.5rem;
                transition: all 0.3s ease;
            }

            .btn-create-user:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 25px rgba(99, 102, 241, 0.3);
            }

            .credentials-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 20000;
            }

            .credentials-modal {
                background: white;
                border-radius: 1rem;
                padding: 2rem;
                max-width: 500px;
                width: 90%;
            }

            .credentials-modal h3 {
                margin: 0 0 1.5rem;
                color: #6366f1;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .credentials-info {
                background: #f9fafb;
                border-radius: 0.75rem;
                padding: 1.5rem;
                margin-bottom: 1.5rem;
            }

            .credential-item {
                margin-bottom: 1rem;
            }

            .credential-item:last-child {
                margin-bottom: 0;
            }

            .credential-item label {
                display: block;
                margin-bottom: 0.5rem;
                font-weight: 600;
                color: #374151;
            }

            .credential-value {
                display: flex;
                gap: 0.5rem;
            }

            .credential-value code {
                flex: 1;
                background: white;
                border: 2px solid #e5e7eb;
                padding: 0.75rem;
                border-radius: 0.5rem;
                font-size: 1.1rem;
                font-weight: 600;
                color: #6366f1;
            }

            .btn-copy {
                padding: 0.75rem;
                background: #6366f1;
                color: white;
                border: none;
                border-radius: 0.5rem;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .btn-copy:hover {
                background: #4f46e5;
            }

            .credentials-warning {
                background: #fef3c7;
                border: 1px solid #f59e0b;
                border-radius: 0.5rem;
                padding: 1rem;
                color: #92400e;
                display: flex;
                align-items: center;
                gap: 0.75rem;
                margin-bottom: 1.5rem;
            }

            .btn-close-modal {
                width: 100%;
                padding: 1rem;
                background: #6366f1;
                color: white;
                border: none;
                border-radius: 0.75rem;
                font-size: 1rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .btn-close-modal:hover {
                background: #4f46e5;
            }

            .logs-list {
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
            }

            .log-item {
                display: flex;
                gap: 1rem;
                padding: 1rem;
                background: white;
                border: 1px solid #e5e7eb;
                border-radius: 0.75rem;
                transition: all 0.3s ease;
            }

            .log-item:hover {
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
            }

            .log-icon {
                width: 2.5rem;
                height: 2.5rem;
                background: #f3f4f6;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #6366f1;
            }

            .log-details {
                flex: 1;
            }

            .log-action {
                font-weight: 600;
                color: #374151;
            }

            .log-user {
                font-size: 0.85rem;
                color: #6b7280;
                margin-top: 0.25rem;
            }

            .log-time {
                font-size: 0.75rem;
                color: #9ca3af;
                margin-top: 0.25rem;
            }

            .assign-section {
                max-width: 800px;
                margin: 0 auto;
            }

            .assign-form {
                display: flex;
                gap: 1rem;
                margin-top: 1rem;
            }

            .assign-form select {
                flex: 1;
                padding: 0.75rem;
                border: 1px solid #e5e7eb;
                border-radius: 0.5rem;
                font-size: 1rem;
            }

            .btn-assign {
                padding: 0.75rem 2rem;
                background: linear-gradient(135deg, #10b981, #059669);
                color: white;
                border: none;
                border-radius: 0.5rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
            }

            .btn-assign:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3);
            }
        `;

        document.head.appendChild(style);
    }

    // عرض الإشعارات
    showNotification(title, message, type = 'info') {
        // يمكن استخدام نظام الإشعارات الموجود في التطبيق
        console.log(`[${type.toUpperCase()}] ${title}: ${message}`);
        
        // أو إنشاء إشعار مخصص
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <strong>${title}</strong>
                <p>${message}</p>
            </div>
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
}

// تهيئة النظام تلقائياً عند تحميل الصفحة
window.addEventListener('DOMContentLoaded', () => {
    window.authSystem = new AuthManagementSystem();
    console.log('✅ تم تحميل نظام إدارة المستخدمين والصلاحيات');
});

// تصدير للاستخدام العام
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManagementSystem;
}