document.addEventListener('DOMContentLoaded', () => {
    // Toast Notification System
    function showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
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

        // Animate in
        setTimeout(() => toast.classList.add('active'), 10);

        // Remove after 4 seconds
        setTimeout(() => {
            toast.classList.remove('active');
            setTimeout(() => toast.remove(), 400);
        }, 4000);
    }
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
            profileModal.style.display = 'none';
            editProfileModal.style.display = 'none';
            editIdModal.style.display = 'none';
            securityModal.style.display = 'none';
            editEventModal.style.display = 'none';
            galleryFolderModal.style.display = 'none';
            newUploadModal.style.display = 'none';
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });

    // New Upload Submission
    const newUploadForm = document.getElementById('new-upload-form');
    const eventList = document.getElementById('event-list');

    if (newUploadForm) {
        newUploadForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('new-event-name').value;
            const email = document.getElementById('new-event-email').value;
            const type = document.getElementById('new-event-type').value;

            const newRow = document.createElement('tr');
            newRow.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
            newRow.innerHTML = `
                <td style="padding: 20px 0;">${name}</td>
                <td>${email}</td>
                <td>${type}</td>
                <td><span style="color: #4ade80;">Active</span></td>
                <td>
                    <button class="btn-icon btn-edit" title="Edit Gallery"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon btn-folder" title="Open Gallery Folder"><i class="fas fa-folder-open"></i></button>
                    <button class="btn-icon btn-delete" title="Delete Gallery"><i class="fas fa-trash-alt"></i></button>
                </td>
            `;

            eventList.prepend(newRow);
            
            // Update Stats
            const countEl = document.getElementById('total-events-count');
            if (countEl) {
                countEl.textContent = parseInt(countEl.textContent) + 1;
            }

            showToast('New event gallery folder created successfully!');
            newUploadModal.style.display = 'none';
            newUploadForm.reset();
        });
    }

    // Simulated Photo Sharing Logic
    const uploadToFolderBtn = document.getElementById('upload-to-folder');
    const galleryGrid = document.getElementById('gallery-grid');
    const photoCountEl = document.getElementById('photo-count');
    let photoCount = 0;

    if (uploadToFolderBtn) {
        uploadToFolderBtn.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.accept = 'image/*';
            
            input.onchange = (e) => {
                const files = e.target.files;
                if (files.length > 0) {
                    // Remove empty state
                    const emptyState = galleryGrid.querySelector('.empty-folder-state');
                    if (emptyState) emptyState.remove();

                    for (let i = 0; i < files.length; i++) {
                        const file = files[i];
                        const reader = new FileReader();
                        
                        reader.onload = (event) => {
                            const imgContainer = document.createElement('div');
                            imgContainer.style.cssText = 'position: relative; aspect-ratio: 1; border-radius: 4px; overflow: hidden; background: #000; border: 1px solid rgba(255,255,255,0.1);';
                            
                            const img = document.createElement('img');
                            img.src = event.target.result;
                            img.style.cssText = 'width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity 0.5s ease;';
                            
                            const deleteBtn = document.createElement('button');
                            deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
                            deleteBtn.style.cssText = 'position: absolute; top: 5px; right: 5px; background: rgba(0,0,0,0.5); color: #fff; border: none; width: 20px; height: 20px; border-radius: 50%; cursor: pointer; font-size: 10px; z-index: 10;';
                            deleteBtn.onclick = () => {
                                imgContainer.remove();
                                photoCount--;
                                photoCountEl.textContent = photoCount;
                                if (photoCount === 0) {
                                    galleryGrid.innerHTML = '<div class="empty-folder-state" style="grid-column: 1 / -1; text-align: center; padding: 60px 0; color: var(--text-dim);"><i class="fas fa-images" style="font-size: 50px; opacity: 0.2; margin-bottom: 15px;"></i><p>No photos shared in this folder yet.</p></div>';
                                }
                            };

                            imgContainer.appendChild(img);
                            imgContainer.appendChild(deleteBtn);
                            galleryGrid.appendChild(imgContainer);
                            
                            setTimeout(() => img.style.opacity = '1', 50);
                            photoCount++;
                            photoCountEl.textContent = photoCount;
                        };
                        reader.readAsDataURL(file);
                    }
                }
            };
            input.click();
        });
    }

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
        profileForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const newName = document.getElementById('edit-admin-name').value;
            const newTitle = document.getElementById('edit-admin-title').value;
            const newEmail = document.getElementById('edit-admin-email').value;

            // Update UI elements
            document.querySelector('.user-profile p:first-child').textContent = newName;
            document.querySelector('.user-profile p:last-child').textContent = newTitle;
            document.querySelector('.modal-header h2').textContent = newName;
            document.querySelector('.modal-header p').textContent = newTitle;
            document.querySelector('.profile-info-row:first-child .value').textContent = newEmail;

            showToast('Profile updated successfully!');
            editProfileModal.style.display = 'none';
        });
    }

    const idForm = document.getElementById('edit-id-form');
    if (idForm) {
        idForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const newId = document.getElementById('new-admin-id').value;
            
            // Sync with other UI elements
            const currentIdFields = document.querySelectorAll('.profile-info-row:nth-child(2) .value, .admin-form-group input[value*="master_admin"]');
            currentIdFields.forEach(field => {
                if (field.tagName === 'INPUT') {
                    field.value = newId;
                } else {
                    field.textContent = newId;
                }
            });

            showToast(`Admin ID successfully updated to: ${newId}`);
            editIdModal.style.display = 'none';
            idForm.reset();
            // Ensure the readonly current ID field reflects the change for next time
            idForm.querySelector('input[readonly]').value = newId;
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
        const btn = e.target.closest('.btn-edit, .btn-delete, .btn-folder');
        if (!btn) return;

        const isDelete = btn.classList.contains('btn-delete');
        const isFolder = btn.classList.contains('btn-folder');
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
        } else if (isFolder) {
            const row = btn.closest('tr');
            if (row) {
                document.getElementById('folder-event-name').textContent = row.cells[0].textContent;
                document.getElementById('folder-event-client').textContent = row.cells[1].textContent;
                galleryFolderModal.style.display = 'block';
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
