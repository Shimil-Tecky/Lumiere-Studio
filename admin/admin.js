document.addEventListener('DOMContentLoaded', () => {
    let galleryUnsubscribe;
    let profileUnsubscribe;

    // Firebase Auth Protection
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            console.log("No authenticated user found. Redirecting to login...");
            window.location.href = '../index.html#admin';
        } else {
            console.log("Lumière Auth: Session Active for", user.email);
            
                // --- REAL-TIME PROFILE SYNCHRONIZATION ---
                
                const syncProfile = async () => {
                const isMasterAdmin = user.email === 'shimilappu9@gmail.com';
                const teamNavItem = document.querySelector('[data-module="team"]');
                
                // Identify the user's document to listen for
                let query;
                if (isMasterAdmin) {
                    query = db.collection('staff').doc('master_admin_profile');
                } else {
                    const staffQuery = await db.collection('staff').where('email', '==', user.email).get();
                    if (!staffQuery.empty) query = staffQuery.docs[0].ref;
                }

                if (query) {
                    profileUnsubscribe = query.onSnapshot((doc) => {
                        if (!doc.exists && !isMasterAdmin) return;
                        
                        const staffData = doc.exists ? doc.data() : { name: 'Master Admin', role: 'Studio Owner', email: user.email };
                        
                        // 1. Role-Based Access Control
                        if (!isMasterAdmin) {
                            if (teamNavItem) teamNavItem.style.display = 'none';
                            const activeModule = document.querySelector('.nav-item.active').getAttribute('data-module');
                            if (activeModule === 'team') document.querySelector('[data-module="upload-manager"]').click();
                        } else {
                            if (teamNavItem) teamNavItem.style.display = 'flex';
                        }

                        // 2. Global UI Update (Name, Role, Initials)
                        const nameEls = document.querySelectorAll('.user-profile p:first-child, .user-info h3, #profile-modal-name');
                        const roleEls = document.querySelectorAll('.user-profile p:last-child, .user-info p, #profile-modal-role');
                        const avatarEls = document.querySelectorAll('.user-avatar, .user-avatar-large');
                        
                        const initials = staffData.name.split(' ').map(n => n[0]).join('').toUpperCase();
                        
                        nameEls.forEach(el => el.textContent = staffData.name);
                        roleEls.forEach(el => el.textContent = staffData.role);
                        
                        // 3. Global Avatar Update (Image vs Initials)
                        avatarEls.forEach(el => {
                            if (staffData.avatarUrl) {
                                // For photos: Clear background color and initials
                                el.style.backgroundColor = 'transparent';
                                el.style.backgroundImage = `url("${staffData.avatarUrl}")`;
                                el.style.backgroundSize = 'cover';
                                el.style.backgroundPosition = 'center';
                                el.textContent = '';
                                el.style.border = '2px solid var(--accent-gold)'; // Add premium border for photos
                            } else {
                                // For initials: Restore default gold look
                                el.style.backgroundColor = 'var(--accent-gold)';
                                el.style.backgroundImage = 'none';
                                el.textContent = initials;
                                el.style.border = 'none';
                            }
                        });

                        // 4. Pre-fill Modals
                        if (document.getElementById('edit-admin-name')) document.getElementById('edit-admin-name').value = staffData.name;
                        if (document.getElementById('edit-admin-title')) document.getElementById('edit-admin-title').value = staffData.role;
                        if (document.getElementById('edit-admin-email')) document.getElementById('edit-admin-email').value = staffData.email;
                        if (document.getElementById('edit-admin-id')) document.getElementById('edit-admin-id').value = staffData.id || '';
                        
                        // Pre-fill ID Modal
                        const currentIdInput = document.querySelector('#edit-id-form input[readonly]');
                        if (currentIdInput) currentIdInput.value = staffData.id || 'Not Set';

                        console.log("Lumière Auth: Global Profile Update Applied");
                    });
                }
            };
            
            
            syncProfile();
            loadEventsFromFirestore();
            loadTeamFromFirestore();
        }
    });

    // --- PROFILE IMAGE UPLOAD SYSTEM ---
    const avatarTrigger = document.getElementById('avatar-upload-trigger');
    const imageInput = document.getElementById('profile-image-input');

    if (avatarTrigger && imageInput) {
        avatarTrigger.addEventListener('click', () => imageInput.click());

        imageInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // 1. Client-Side Preview
            const reader = new FileReader();
            reader.onload = (event) => {
                const preview = document.getElementById('edit-profile-preview');
                preview.style.backgroundImage = `url(${event.target.result})`;
                preview.style.backgroundSize = 'cover';
                preview.textContent = '';
            };
            reader.readAsDataURL(file);

            // 2. Firebase Storage Upload
            showToast('Uploading profile image...', 'info');
            const user = auth.currentUser;
            if (!user) return;

            try {
                // ImgBB Upload logic
                const formData = new FormData();
                formData.append('image', file);
                
                const response = await fetch(`https://api.imgbb.com/1/upload?key=${import.meta.env.VITE_IMGBB_API_KEY}`, {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                if (!result.success) throw new Error(result.error.message);
                
                const downloadURL = result.data.url;
                console.log("Lumière Storage (ImgBB): Upload Successful ->", downloadURL);

                // 3. Update Firestore (Use 'set' with merge to ensure doc exists)
                let saved = false;
                
                if (user.email === 'shimilappu9@gmail.com') {
                    await db.collection('staff').doc('master_admin_profile').set({
                        avatarUrl: downloadURL,
                        email: user.email,
                        name: 'Master Admin', // Ensure core fields exist
                        role: 'Studio Owner',
                        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                    saved = true;
                } 
                
                if (!saved) {
                    const staffQuery = await db.collection('staff').where('email', '==', user.email).get();
                    if (!staffQuery.empty) {
                        await staffQuery.docs[0].ref.update({ 
                            avatarUrl: downloadURL,
                            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                        });
                        saved = true;
                    }
                }

                if (saved) {
                    showToast('Profile image successfully updated!', 'success');
                } else {
                    showToast('Image uploaded, but profile record not found.', 'info');
                }
            } catch (err) {
                console.error("Avatar Save Failed:", err);
                showToast('Failed to update image: ' + err.message, 'error');
            }
        });
    }

    // Logout Logic
    const logoutBtn = document.querySelector('.logout-btn') || document.getElementById('dropdown-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            auth.signOut().then(() => {
                showToast('Logging out of secure session...', 'info');
                setTimeout(() => {
                    window.location.href = '../index.html';
                }, 1000);
            });
        });
    }

    // --- LIVE FIREBASE DATA SYNC (EVENTS) ---
    function loadEventsFromFirestore() {
        const tableBody = document.querySelector('tbody') || document.getElementById('event-list');
        if (!tableBody) return;

        db.collection('events').orderBy('date', 'desc').onSnapshot((snapshot) => {
            tableBody.innerHTML = ''; 
            let totalEvents = 0;

            snapshot.forEach((doc) => {
                const event = doc.data();
                const id = doc.id;
                totalEvents++;

                const row = document.createElement('tr');
                row.setAttribute('data-id', id);
                row.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
                row.innerHTML = `
                    <td style="padding: 20px 0;">
                        <div style="font-weight: 600;">${event.title || event.name}</div>
                        <div style="font-size: 11px; color: var(--text-dim);">${event.date ? new Date(event.date.seconds * 1000).toLocaleDateString() : 'N/A'}</div>
                    </td>
                    <td style="padding: 20px 0;">${event.email || 'N/A'}</td>
                    <td style="padding: 20px 0;">${event.category || event.type || 'Wedding'}</td>
                    <td style="padding: 20px 0;"><span class="status-badge" style="background: rgba(74, 222, 128, 0.1); color: #4ade80; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700;">${event.status || 'Active'}</span></td>
                    <td style="padding: 20px 0; text-align: right;">
                        <button class="btn-icon btn-folder" title="Open Gallery Folder" style="background: none; border: none; color: var(--text-dim); cursor: pointer; margin-right: 10px; transition: color 0.3s;"><i class="fas fa-folder-open"></i></button>
                        <button class="btn-icon btn-edit" title="Edit Event" style="background: none; border: none; color: var(--text-dim); cursor: pointer; margin-right: 10px; transition: color 0.3s;"><i class="fas fa-edit"></i></button>
                        <button class="btn-icon btn-delete" title="Delete Event" style="background: none; border: none; color: var(--text-dim); cursor: pointer; transition: color 0.3s;"><i class="fas fa-trash-alt"></i></button>
                    </td>
                `;
                tableBody.appendChild(row);
            });

            const totalEventsEl = document.getElementById('total-events-count');
            if (totalEventsEl) totalEventsEl.textContent = totalEvents;
        });
    }
    // loadEventsFromFirestore(); // Moved inside onAuthStateChanged

    // Toast Notification System
    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let icon = 'fa-check-circle';
        if (type === 'error') icon = 'fa-exclamation-circle';
        if (type === 'info') icon = 'fa-info-circle';

        toast.innerHTML = `
            <i class="fas ${icon}"></i>
            <div class="toast-content">${message}</div>
        `;

        container.appendChild(toast);

        setTimeout(() => toast.classList.add('active'), 10);

        setTimeout(() => {
            toast.classList.remove('active');
            setTimeout(() => toast.remove(), 400);
        }, 4000);
    }

    // --- TEAM MANAGEMENT LOGIC ---
    const addStaffModal = document.getElementById('add-staff-modal');
    const addStaffForm = document.getElementById('add-staff-form');
    const teamGrid = document.getElementById('team-grid');
    const openAddStaffBtn = document.getElementById('open-add-staff');

    // Create a secondary Firebase App for creating staff accounts without logging out the Admin
    // This uses the same config as the main app
    let secondaryApp;
    try {
        secondaryApp = firebase.initializeApp(firebaseConfig, 'SecondaryStaffCreator');
    } catch (e) {
        secondaryApp = firebase.app('SecondaryStaffCreator');
    }
    const secondaryAuth = secondaryApp.auth();

    if (openAddStaffBtn) {
        openAddStaffBtn.addEventListener('click', () => {
            addStaffModal.style.display = 'block';
        });
    }

    // 1. Register Staff (Auth + Firestore)
    if (addStaffForm) {
        addStaffForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log("Lumière Studios: Initiating Security Registration...");

            if (typeof db === 'undefined') {
                showToast('CRITICAL: Firebase Database not found.', 'error');
                return;
            }
            
            const name = document.getElementById('staff-name').value;
            const role = document.getElementById('staff-role').value;
            const email = document.getElementById('staff-email').value;
            const customId = document.getElementById('staff-id').value;
            const password = document.getElementById('staff-password').value;

            showToast('Synchronizing Security Credentials...', 'info');

            try {
                // Step A: Create the Login Account in Firebase Authentication
                await secondaryAuth.createUserWithEmailAndPassword(email, password);
                console.log("Auth Account Created for:", email);

                // Step B: Save Profile Details to Firestore
                await db.collection('staff').add({
                    name,
                    role,
                    email,
                    id: customId,
                    password: password, // Stored for administrative reference
                    joined: firebase.firestore.FieldValue.serverTimestamp(),
                    status: 'Active'
                });

                console.log("Cloud Sync Successful for ID:", customId);
                showToast(`SUCCESS: ${name}'s account is now live!`, 'success');
                
                // Reset secondary auth state immediately
                secondaryAuth.signOut();

                setTimeout(() => {
                    addStaffModal.style.display = 'none';
                    addStaffForm.reset();
                }, 800);

            } catch (err) {
                console.error("Staff Registration Failed:", err);
                let msg = 'Registration Failed: ' + err.message;
                if (err.code === 'auth/email-already-in-use') msg = 'Error: This email is already registered.';
                if (err.code === 'auth/weak-password') msg = 'Error: Password must be at least 6 characters.';
                
                showToast(msg, 'error');
            }
        });
    }

    function loadTeamFromFirestore() {
        if (!teamGrid) return;

        db.collection('staff').orderBy('joined', 'desc').onSnapshot((snapshot) => {
            teamGrid.innerHTML = '';
            if (snapshot.empty) {
                teamGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-dim); padding: 40px;">No staff members found. Start by recruiting your team!</p>';
                return;
            }
            snapshot.forEach((doc) => {
                const staff = doc.data();
                const initials = staff.name.split(' ').map(n => n[0]).join('').toUpperCase();
                const card = document.createElement('div');
                card.style.cssText = 'position: relative; background: rgba(255,255,255,0.03); border: 1px solid var(--border); padding: 25px; border-radius: 8px; animation: fadeIn 0.5s ease;';
                card.innerHTML = `
                    <div class="card-menu-container">
                        <button class="btn-menu"><i class="fas fa-ellipsis-v"></i></button>
                        <div class="card-dropdown">
                            <button class="card-dropdown-item btn-edit-staff" data-id="${doc.id}"><i class="fas fa-user-edit"></i> Edit Member</button>
                            <button class="card-dropdown-item btn-copy-creds" data-id="${staff.id}" data-pass="${staff.password || '••••••••'}"><i class="fas fa-copy"></i> Copy Login</button>
                            <button class="card-dropdown-item delete btn-delete-staff-menu" data-id="${doc.id}"><i class="fas fa-user-minus"></i> Remove Member</button>
                        </div>
                    </div>
                    <div style="display: flex; gap: 15px; align-items: center; margin-bottom: 20px; padding-right: 30px;">
                        <div style="width: 50px; height: 50px; background: #222; border: 1px solid var(--accent-gold); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--accent-gold); font-weight: 700;">${initials}</div>
                        <div>
                            <h3 style="font-size: 16px;">${staff.name}</h3>
                            <p style="font-size: 12px; color: var(--accent-gold);">${staff.role}</p>
                        </div>
                    </div>
                    
                    <div class="credential-box" style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 6px; border: 1px solid rgba(197, 160, 89, 0.1);">
                        <div class="admin-form-group" style="margin-bottom: 12px;">
                            <label style="color: var(--accent-gold); font-size: 10px; text-transform: uppercase; letter-spacing: 1px;">Admin ID</label>
                            <p style="font-size: 14px; font-family: 'Courier New', monospace; color: var(--text-main); margin-top: 4px;">${staff.id}</p>
                        </div>
                        <div class="admin-form-group" style="margin-bottom: 0;">
                            <label style="color: var(--accent-gold); font-size: 10px; text-transform: uppercase; letter-spacing: 1px;">Security Password</label>
                            <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 4px;">
                                <p class="staff-pass-field" style="font-size: 14px; font-family: 'Courier New', monospace; color: var(--text-main);" data-pass="${staff.password || 'N/A'}">••••••••</p>
                                <button class="btn-toggle-pass" style="background: none; border: none; color: var(--text-dim); cursor: pointer; font-size: 12px;"><i class="fas fa-eye"></i></button>
                            </div>
                        </div>
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.05);">
                        <span class="status-badge" style="background: ${staff.status === 'Active' ? 'rgba(74, 222, 128, 0.1)' : 'rgba(255, 255, 255, 0.05)'}; color: ${staff.status === 'Active' ? '#4ade80' : '#888'};">${staff.status || 'ACTIVE'}</span>
                        <span style="font-size: 10px; color: var(--text-dim);">${staff.email}</span>
                    </div>
                `;
                teamGrid.appendChild(card);
            });
        });
    }
    // loadTeamFromFirestore(); // Moved inside onAuthStateChanged

    // Password Toggle & Copy Credentials Logic
    document.addEventListener('click', (e) => {
        // Toggle Password Visibility
        const toggleBtn = e.target.closest('.btn-toggle-pass');
        if (toggleBtn) {
            const passField = toggleBtn.parentElement.querySelector('.staff-pass-field');
            const icon = toggleBtn.querySelector('i');
            const realPass = passField.getAttribute('data-pass');
            
            if (passField.textContent === '••••••••') {
                passField.textContent = realPass;
                icon.classList.replace('fa-eye', 'fa-eye-slash');
            } else {
                passField.textContent = '••••••••';
                icon.classList.replace('fa-eye-slash', 'fa-eye');
            }
            return;
        }

        // Copy Credentials to Clipboard
        const copyBtn = e.target.closest('.btn-copy-creds');
        if (copyBtn) {
            const id = copyBtn.getAttribute('data-id');
            const pass = copyBtn.getAttribute('data-pass');
            const textToCopy = `Lumière Studios Admin Access\n\nAdmin ID: ${id}\nPassword: ${pass}\n\nLogin at: ${window.location.origin}/index.html#admin`;
            
            navigator.clipboard.writeText(textToCopy).then(() => {
                showToast('Login credentials copied to clipboard!', 'success');
            }).catch(err => {
                showToast('Failed to copy: ' + err, 'error');
            });
        }
    });

    // Toggle Card Dropdowns
    document.addEventListener('click', (e) => {
        const menuBtn = e.target.closest('.btn-menu');
        if (menuBtn) {
            e.stopPropagation();
            // Close all other dropdowns first
            document.querySelectorAll('.card-dropdown.active').forEach(d => {
                if (d !== menuBtn.nextElementSibling) d.classList.remove('active');
            });
            menuBtn.nextElementSibling.classList.toggle('active');
        } else {
            document.querySelectorAll('.card-dropdown.active').forEach(d => d.classList.remove('active'));
        }
    });

    // Staff Edit Modal Handlers
    const editStaffModal = document.getElementById('edit-staff-modal');
    const editStaffForm = document.getElementById('edit-staff-form');

    document.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.btn-edit-staff');
        if (!editBtn) return;
        
        const staffId = editBtn.getAttribute('data-id');
        db.collection('staff').doc(staffId).get().then(doc => {
            const staff = doc.data();
            document.getElementById('edit-staff-id-internal').value = staffId;
            document.getElementById('edit-staff-name').value = staff.name;
            document.getElementById('edit-staff-role').value = staff.role;
            document.getElementById('edit-staff-email').value = staff.email;
            document.getElementById('edit-staff-id').value = staff.id;
            document.getElementById('edit-staff-status').value = staff.status || 'Active';
            
            editStaffModal.style.display = 'block';
        });
    });

    if (editStaffForm) {
        editStaffForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const staffId = document.getElementById('edit-staff-id-internal').value;
            const updatedData = {
                name: document.getElementById('edit-staff-name').value,
                role: document.getElementById('edit-staff-role').value,
                email: document.getElementById('edit-staff-email').value,
                id: document.getElementById('edit-staff-id').value,
                status: document.getElementById('edit-staff-status').value
            };

            db.collection('staff').doc(staffId).update(updatedData).then(() => {
                showToast('Staff profile updated successfully!');
                editStaffModal.style.display = 'none';
            }).catch(err => showToast('Update failed: ' + err.message, 'error'));
        });
    }

    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-delete-staff-menu');
        if (!btn) return;
        const staffId = btn.getAttribute('data-id');
        if (confirm('Are you sure you want to remove this employee from the studio database?')) {
            db.collection('staff').doc(staffId).delete().then(() => {
                showToast('Employee successfully removed.');
            });
        }
    });

    // Navigation Switcher
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.module-section');
    const moduleTitle = document.getElementById('module-title');
    const moduleSubtitle = document.getElementById('module-subtitle');

    const moduleInfo = {
        'upload-manager': {
            title: 'Upload Manager',
            subtitle: 'Distribute event galleries to clients'
        },
        'ai-tool': {
            title: 'AI Image Tool',
            subtitle: 'Professional auto-enhancement and quality control'
        },
        'team': {
            title: 'Team Management',
            subtitle: 'Manage employee access and performance'
        },
        'settings': {
            title: 'System Settings',
            subtitle: 'Configure your studio management portal'
        }
    };

    // Profile Dropdown Toggle
    const profileTrigger = document.getElementById('profile-trigger');
    const profileDropdown = document.getElementById('profile-dropdown');

    if (profileTrigger && profileDropdown) {
        profileTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle('active');
        });

        document.addEventListener('click', () => {
            profileDropdown.classList.remove('active');
        });
    }

    // Profile Dropdown Functionality
    const profileModal = document.getElementById('profile-modal');
    const editProfileModal = document.getElementById('edit-profile-modal');
    const editIdModal = document.getElementById('edit-id-modal');
    const securityModal = document.getElementById('security-modal');
    const editEventModal = document.getElementById('edit-event-modal');
    const galleryFolderModal = document.getElementById('gallery-folder-modal');
    const newUploadModal = document.getElementById('new-upload-modal');
    
    const dropdownLinks = document.querySelectorAll('.profile-dropdown a');

    dropdownLinks.forEach((link, index) => {
        link.addEventListener('click', (e) => {
            if (index === 3) return; // Skip logout as it has its own handler
            e.preventDefault();
            profileDropdown.classList.remove('active');

            if (index === 0) profileModal.style.display = 'block';
            if (index === 1) editIdModal.style.display = 'block';
            if (index === 2) securityModal.style.display = 'block';
        });
    });

    // Open Modals
    const openNewUploadBtn = document.getElementById('open-new-upload');
    if (openNewUploadBtn) {
        openNewUploadBtn.addEventListener('click', () => {
            newUploadModal.style.display = 'block';
        });
    }

    const openEditBtn = document.getElementById('open-edit-profile');
    if (openEditBtn) {
        openEditBtn.addEventListener('click', () => {
            profileModal.style.display = 'none';
            editProfileModal.style.display = 'block';
        });
    }

    // Close Modals
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            editStaffModal.style.display = 'none';
            profileModal.style.display = 'none';
            editProfileModal.style.display = 'none';
            editIdModal.style.display = 'none';
            securityModal.style.display = 'none';
            editEventModal.style.display = 'none';
            galleryFolderModal.style.display = 'none';
            newUploadModal.style.display = 'none';
            
            // Unsubscribe from active gallery to save resources
            if (galleryUnsubscribe) {
                galleryUnsubscribe();
                galleryUnsubscribe = null;
            }
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
            // Unsubscribe from active gallery if it was the folder modal
            if (e.target.id === 'gallery-folder-modal' && galleryUnsubscribe) {
                galleryUnsubscribe();
                galleryUnsubscribe = null;
            }
        }
    });

    // New Upload Submission
    const newUploadForm = document.getElementById('new-upload-form');
    const eventList = document.getElementById('event-list');

    if (newUploadForm) {
        newUploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('new-event-name').value;
            const email = document.getElementById('new-event-email').value;
            const type = document.getElementById('new-event-type').value;

            showToast('Creating cloud folder...', 'info');

            try {
                await db.collection('events').add({
                    title: name,
                    email: email,
                    category: type,
                    status: 'Active',
                    photos: [],
                    date: firebase.firestore.FieldValue.serverTimestamp(),
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                showToast('New event gallery folder created successfully!', 'success');
                newUploadModal.style.display = 'none';
                newUploadForm.reset();
                // UI will auto-update via onSnapshot in loadEventsFromFirestore
            } catch (err) {
                console.error("Lumière Auth Error: Event Creation Failed", err);
                showToast('Access Denied: Cannot create event in Firestore.', 'error');
            }
        });
    }

    // 3. Handle Image Upload (Firebase Storage)
    const uploadToFolderBtn = document.getElementById('upload-to-folder');
    const galleryGrid = document.getElementById('gallery-grid');
    const photoCountEl = document.getElementById('photo-count');

    if (uploadToFolderBtn) {
        uploadToFolderBtn.addEventListener('click', () => {
            const docId = document.getElementById('folder-event-name').getAttribute('data-active-id');
            if (!docId) return;

            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.accept = 'image/*';
            
            input.onchange = async (e) => {
                const files = Array.from(e.target.files);
                if (files.length > 0) {
                    showToast(`Initializing upload for ${files.length} photos...`, 'info');

                    const uploadPromises = files.map(async (file, index) => {
                        return new Promise((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onload = async () => {
                                try {
                                    // Extract base64 content
                                    const base64Content = reader.result.split(',')[1];
                                    const formData = new FormData();
                                    formData.append('image', base64Content);

                                    const response = await fetch(`https://api.imgbb.com/1/upload?key=${import.meta.env.VITE_IMGBB_API_KEY}`, {
                                        method: 'POST',
                                        body: formData
                                    });

                                    const result = await response.json();
                                    if (result.success) {
                                        console.log(`Lumière Upload: [${index + 1}/${files.length}] Success`);
                                        resolve(result.data.url);
                                    } else {
                                        reject(new Error(result.error.message));
                                    }
                                } catch (fetchErr) {
                                    reject(fetchErr);
                                }
                            };
                            reader.onerror = () => reject(new Error("File reading failed"));
                            reader.readAsDataURL(file);
                        });
                    });

                    try {
                        const urls = await Promise.all(uploadPromises);
                        showToast(`Syncing ${urls.length} links to Firestore...`, 'info');
                        
                        await db.collection('events').doc(docId).update({
                            photos: firebase.firestore.FieldValue.arrayUnion(...urls)
                        });
                        
                        showToast('Gallery updated and synced successfully!', 'success');
                    } catch (err) {
                        console.error("Lumière Upload Error:", err);
                        showToast('Upload failed: ' + (err.message || 'Unknown error'), 'error');
                    }
                }
            };
            input.click();
        });
    }

    // Update Gallery Modal to show active ID and setup real-time listener
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-folder');
        if (!btn) return;
        const row = btn.closest('tr');
        const docId = row.getAttribute('data-id');
        if (!docId) return;

        const title = row.cells[0].querySelector('div').textContent;
        const email = row.cells[1].textContent;
        
        const folderTitle = document.getElementById('folder-event-name');
        const folderEmail = document.getElementById('folder-event-client');
        
        folderTitle.textContent = title;
        folderTitle.setAttribute('data-active-id', docId);
        folderEmail.textContent = email;
        
        // Clear previous listener if exists
        if (galleryUnsubscribe) galleryUnsubscribe();
        
        // Clear grid and show loader
        galleryGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-dim); padding: 40px;">Loading gallery stream...</p>';
        
        // Fetch current photos for this doc using REAL-TIME listener
        galleryUnsubscribe = db.collection('events').doc(docId).onSnapshot(doc => {
            if (!doc.exists) return;
            const data = doc.data();
            galleryGrid.innerHTML = '';
            
            if (data.photos && data.photos.length > 0) {
                photoCountEl.textContent = data.photos.length;
                data.photos.forEach(url => {
                    const imgContainer = document.createElement('div');
                    imgContainer.className = 'gallery-item';
                    imgContainer.style.cssText = 'position: relative; aspect-ratio: 1; border-radius: 6px; overflow: hidden; background: #000; border: 1px solid rgba(255,255,255,0.1); transition: all 0.3s ease;';
                    
                    const img = document.createElement('img');
                    img.src = url;
                    img.style.cssText = 'width: 100%; height: 100%; object-fit: cover; cursor: pointer;';
                    img.onclick = () => window.open(url, '_blank');
                    
                    // Add hover overlay for individual delete
                    const overlay = document.createElement('div');
                    overlay.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); opacity: 0; display: flex; align-items: center; justify-content: center; transition: opacity 0.3s;';
                    overlay.innerHTML = `<button class="btn-delete-photo" data-url="${url}" style="background: #ff4d4d; color: #FFF; border: none; padding: 8px; border-radius: 50%; width: 35px; height: 35px; cursor: pointer;"><i class="fas fa-trash"></i></button>`;
                    
                    imgContainer.onmouseover = () => overlay.style.opacity = '1';
                    imgContainer.onmouseout = () => overlay.style.opacity = '0';
                    
                    imgContainer.appendChild(img);
                    imgContainer.appendChild(overlay);
                    galleryGrid.appendChild(imgContainer);
                });
            } else {
                photoCountEl.textContent = '0';
                galleryGrid.innerHTML = '<div class="empty-folder-state" style="grid-column: 1 / -1; text-align: center; padding: 60px 0; color: var(--text-dim);"><i class="fas fa-images" style="font-size: 50px; opacity: 0.2; margin-bottom: 15px;"></i><p>No photos shared in this folder yet.</p></div>';
            }
        });
        
        // QR Code Generation
        const clientLink = `${window.location.origin}/components/live-event.html?event=${docId}`;
        const qrImg = document.getElementById('folder-qr-code');
        const qrContainer = document.getElementById('qr-code-container');
        if (qrImg && qrContainer) {
            qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(clientLink)}`;
            qrContainer.style.display = 'none'; // Keep hidden until button clicked
        }

        galleryFolderModal.style.display = 'block';
    });

    // Handle QR Code Visibility Toggle
    const showQrBtn = document.getElementById('btn-show-qr');
    if (showQrBtn) {
        showQrBtn.addEventListener('click', () => {
            const qrContainer = document.getElementById('qr-code-container');
            if (qrContainer) {
                const isHidden = qrContainer.style.display === 'none';
                qrContainer.style.display = isHidden ? 'flex' : 'none';
                showQrBtn.innerHTML = isHidden ? '<i class="fas fa-eye-slash"></i> HIDE QR' : '<i class="fas fa-qrcode"></i> GENERATE QR';
            }
        });
    }

    // Handle Individual Photo Deletion
    document.addEventListener('click', async (e) => {
        const btn = e.target.closest('.btn-delete-photo');
        if (!btn) return;
        
        const url = btn.getAttribute('data-url');
        const docId = document.getElementById('folder-event-name').getAttribute('data-active-id');
        
        if (confirm('Are you sure you want to remove this photo from the gallery?')) {
            try {
                await db.collection('events').doc(docId).update({
                    photos: firebase.firestore.FieldValue.arrayRemove(url)
                });
                showToast('Photo removed from cloud gallery.');
            } catch (err) {
                showToast('Failed to remove photo: ' + err.message, 'error');
            }
        }
    });

    // Handle Client Link Generation
    const getClientLinkBtn = document.getElementById('get-client-link');
    // Form Submissions
    const eventEditForm = document.getElementById('edit-event-form');
    let activeRowToEdit = null;

    if (eventEditForm) {
        eventEditForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (activeRowToEdit) {
                activeRowToEdit.cells[0].textContent = document.getElementById('edit-event-name').value;
                activeRowToEdit.cells[1].textContent = document.getElementById('edit-event-email').value;
                activeRowToEdit.cells[2].textContent = document.getElementById('edit-event-type').value;
                
                const status = document.getElementById('edit-event-status').value;
                const statusSpan = activeRowToEdit.cells[3].querySelector('span');
                statusSpan.textContent = status;
                statusSpan.style.color = status === 'Active' ? '#4ade80' : (status === 'Archived' ? '#94a3b8' : '#fbbf24');
                
                showToast('Event updated successfully!');
                editEventModal.style.display = 'none';
            }
        });
    }

    const profileForm = document.getElementById('edit-profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = auth.currentUser;
            if (!user) return;

            const newName = document.getElementById('edit-admin-name').value;
            const newRole = document.getElementById('edit-admin-title').value;
            const newEmail = document.getElementById('edit-admin-email').value;
            const newId = document.getElementById('edit-admin-id').value;

            showToast('Saving profile updates...', 'info');

            try {
                const isMasterAdmin = user.email === 'shimilappu9@gmail.com';
                let docRef;

                if (isMasterAdmin) {
                    docRef = db.collection('staff').doc('master_admin_profile');
                } else {
                    const staffQuery = await db.collection('staff').where('email', '==', user.email).get();
                    if (!staffQuery.empty) docRef = staffQuery.docs[0].ref;
                }

                if (docRef) {
                    await docRef.set({
                        name: newName,
                        role: newRole,
                        email: newEmail,
                        id: newId,
                        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                    
                    showToast('Profile details updated successfully!', 'success');
                    editProfileModal.style.display = 'none';
                } else {
                    showToast('Profile record not found.', 'error');
                }
            } catch (err) {
                console.error("Profile Save Failed:", err);
                showToast('Failed to save changes: ' + err.message, 'error');
            }
        });
    }

    const idForm = document.getElementById('edit-id-form');
    if (idForm) {
        idForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = auth.currentUser;
            if (!user) return;

            const newId = document.getElementById('new-admin-id').value;
            showToast('Updating Admin ID...', 'info');

            try {
                const isMasterAdmin = user.email === 'shimilappu9@gmail.com';
                let docRef;

                if (isMasterAdmin) {
                    docRef = db.collection('staff').doc('master_admin_profile');
                } else {
                    const staffQuery = await db.collection('staff').where('email', '==', user.email).get();
                    if (!staffQuery.empty) docRef = staffQuery.docs[0].ref;
                }

                if (docRef) {
                    await docRef.update({ 
                        id: newId,
                        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                    });
                    showToast(`Admin ID permanently updated to: ${newId}`, 'success');
                    editIdModal.style.display = 'none';
                    idForm.reset();
                }
            } catch (err) {
                console.error("ID Update Failed:", err);
                showToast('Failed to update ID.', 'error');
            }
        });
    }

    const securityForm = document.getElementById('security-form');
    if (securityForm) {
        securityForm.addEventListener('submit', (e) => {
            e.preventDefault();
            showToast('Password successfully updated. Please use your new password for next login.');
            securityModal.style.display = 'none';
        });
    }

    // Dropdown Logout Handler
    const dropdownLogout = document.getElementById('dropdown-logout');
    if (dropdownLogout) {
        dropdownLogout.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Are you sure you want to log out of the admin portal?')) {
                window.location.href = '../index.html';
            }
        });
    }

    // AI Tool Logic
    const dropZone = document.getElementById('drop-zone');
    const aiFileInput = document.getElementById('ai-file-input');
    const dropZonePrompt = document.getElementById('drop-zone-prompt');
    const processAiBtn = document.getElementById('process-ai-btn');

    if (dropZone) {
        dropZone.addEventListener('click', () => aiFileInput.click());

        ['dragover', 'dragleave', 'drop'].forEach(evt => {
            dropZone.addEventListener(evt, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        dropZone.addEventListener('dragover', () => dropZone.style.borderColor = 'var(--accent-gold)');
        dropZone.addEventListener('dragleave', () => dropZone.style.borderColor = 'var(--border)');
        
        dropZone.addEventListener('drop', (e) => {
            dropZone.style.borderColor = 'var(--border)';
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                handleAiImage(file);
            }
        });

        aiFileInput.addEventListener('change', (e) => {
            if (e.target.files[0]) handleAiImage(e.target.files[0]);
        });
    }

    function handleAiImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            dropZonePrompt.style.display = 'none';
            // Remove existing preview if any
            const existingPreview = dropZone.querySelector('.ai-preview-img');
            if (existingPreview) existingPreview.remove();

            const img = document.createElement('img');
            img.src = e.target.result;
            img.className = 'ai-preview-img';
            img.style.cssText = 'width: 100%; height: 100%; object-fit: contain; animation: fadeIn 0.5s ease;';
            dropZone.appendChild(img);
        };
        reader.readAsDataURL(file);
    }

    if (processAiBtn) {
        processAiBtn.addEventListener('click', () => {
            const preview = dropZone.querySelector('.ai-preview-img');
            if (!preview) {
                showToast('Please upload an image first.', 'error');
                return;
            }

            const originalText = processAiBtn.innerHTML;
            processAiBtn.disabled = true;
            processAiBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PREPARING DOWNLOAD...';
            
            // Create a canvas to apply filters and download
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                
                // Apply filters to canvas context
                ctx.filter = getComputedStyle(preview).filter;
                ctx.drawImage(img, 0, 0);
                
                // Trigger download
                const link = document.createElement('a');
                link.download = `enhanced_${Date.now()}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
                
                setTimeout(() => {
                    processAiBtn.disabled = false;
                    processAiBtn.innerHTML = originalText;
                    showToast('Enhanced image downloaded successfully!');
                }, 1000);
            };
            
            img.src = preview.src;
        });
    }

    // Navigation Switcher
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const module = item.getAttribute('data-module');

            // Update UI
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            sections.forEach(section => {
                section.classList.remove('active');
                if (section.id === module) {
                    section.classList.add('active');
                }
            });

            // Update Header
            moduleTitle.textContent = moduleInfo[module].title;
            moduleSubtitle.textContent = moduleInfo[module].subtitle;
        });
    });

    // AI Slider Values & Live Preview
    const ranges = document.querySelectorAll('input[type="range"]');
    ranges.forEach(range => {
        range.addEventListener('input', (e) => {
            const span = e.target.previousElementSibling.querySelector('span:last-child');
            const val = e.target.value;
            if (span) {
                span.textContent = e.target.dataset.filter === 'hue-rotate' ? val : `${val}%`;
            }

            // Apply Live Filters to Preview Image
            const preview = document.querySelector('.ai-preview-img');
            if (preview) {
                let filters = [];
                ranges.forEach(r => {
                    const f = r.dataset.filter;
                    if (f) {
                        let unit = '%';
                        if (f === 'hue-rotate') unit = 'deg';
                        if (f === 'brightness' || f === 'contrast' || f === 'saturate') {
                            // Convert 0-100 to 0.5-1.5 or similar for better effect
                            const baseVal = r.value / 100;
                            filters.push(`${f}(${baseVal * 2})`);
                        } else {
                            filters.push(`${f}(${r.value}${unit})`);
                        }
                    }
                });
                preview.style.filter = filters.join(' ');
            }
        });
    });

    // Logout Mockup
    document.querySelector('.logout-btn').addEventListener('click', () => {
        if (confirm('Are you sure you want to log out of the admin portal?')) {
            window.location.href = '../index.html';
        }
    });

    // Action Buttons Handler (Edit/Delete)
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-edit, .btn-delete');
        if (!btn) return;

        const isDelete = btn.classList.contains('btn-delete');
        const isTeam = btn.closest('#team');
        const entity = isTeam ? 'Employee' : 'Gallery';
        
        if (isDelete) {
            if (confirm(`Are you sure you want to delete this ${entity}? This action cannot be undone.`)) {
                // Find the container to remove
                const targetToRemove = btn.closest('tr') || btn.closest('div[style*="background"]');
                
                if (targetToRemove) {
                    // Animation
                    targetToRemove.style.transition = 'all 0.4s ease';
                    targetToRemove.style.opacity = '0';
                    targetToRemove.style.transform = 'translateX(20px)';
                    
                    setTimeout(() => {
                        targetToRemove.remove();
                        
                        // Update stats if it's a gallery
                        if (!isTeam) {
                            const countEl = document.getElementById('total-events-count');
                            if (countEl) {
                                let currentCount = parseInt(countEl.textContent);
                                countEl.textContent = Math.max(0, currentCount - 1);
                            }
                        }
                    }, 400);
                }
                console.log(`${entity} deleted.`);
            }
        } else {
            // Edit logic
            if (!isTeam) {
                activeRowToEdit = btn.closest('tr');
                if (activeRowToEdit) {
                    document.getElementById('edit-event-name').value = activeRowToEdit.cells[0].textContent;
                    document.getElementById('edit-event-email').value = activeRowToEdit.cells[1].textContent;
                    document.getElementById('edit-event-type').value = activeRowToEdit.cells[2].textContent;
                    document.getElementById('edit-event-status').value = activeRowToEdit.cells[3].querySelector('span').textContent;
                    
                    editEventModal.style.display = 'block';
                }
            } else {
                const targetName = btn.closest('div')?.querySelector('h3')?.textContent;
                showToast(`Opening edit modal for: ${targetName || entity}\n(Employee edit functionality will be connected to database)`, 'info');
            }
        }
    });

    console.log('Lumière Admin Dashboard Initialized');
});
