(function() {
    const CONFIG = {
        containerId: 'fluid-slit-container',
        imagePathRoot: 'static/images/dataset/' 
    };

    const container = document.getElementById(CONFIG.containerId);
    let currentOpenDrawer = null;
    let activeGridItem = null;
    
    let modalEl = null;
    let modalCoverImg = null;
    let modalDetailImg = null;

    function init() {
        if (!container) return;
        
        if (typeof gsap === 'undefined') {
            console.error("GSAP not loaded! Attempting auto-load...");
            alert("Error: Animation library GSAP is not loaded. Please check your network or the script tags in index.html.");
            return;
        }

        if (typeof DATASET_MANIFEST === 'undefined') {
            console.error("Configuration not found. Please run: python scan_images.py");
            container.innerHTML = '<p style="text-align:center; padding:50px;">Image index not found. Please run scan_images.py</p>';
            return;
        }

        createModalDOM();

        container.innerHTML = '';
        const folders = Object.keys(DATASET_MANIFEST);
        
        console.log(`Loading ${folders.length} folders...`);

        folders.forEach((folderName, index) => {
            const imageList = DATASET_MANIFEST[folderName];
            if (imageList && imageList.length > 0) {
                createGridItem(folderName, imageList, index);
            }
        });
    }

    function injectModalStyles() {
        if (document.getElementById('modal-auto-style')) return;
        const style = document.createElement('style');
        style.id = 'modal-auto-style';
        style.textContent = `
            .comparison-modal {
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                background: rgba(255, 255, 255, 0.98); z-index: 9999;
                display: none; flex-direction: column; justify-content: center; align-items: center;
                opacity: 0;
            }
            .compare-wrapper {
                display: flex; gap: 20px; width: 90%; max-width: 1600px; height: 80vh;
                justify-content: center; align-items: center;
            }
            .compare-card {
                flex: 1; height: 100%; display: flex; flex-direction: column; gap: 10px;
            }
            .compare-card img {
                width: 100%; height: 100%; object-fit: contain;
                border-radius: 4px; background: #f0f0f0; box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            }
            .compare-label {
                text-align: center; font-size: 14px; color: #999; font-weight: 500; text-transform: uppercase;
            }
            .close-btn {
                position: absolute; top: 30px; right: 40px; font-size: 40px;
                cursor: pointer; color: #333; line-height: 1;
            }
            @media (max-width: 768px) { .compare-wrapper { flex-direction: column; } }
        `;
        document.head.appendChild(style);
    }

    function createModalDOM() {
        if (document.querySelector('.comparison-modal')) {
            modalEl = document.querySelector('.comparison-modal');
            modalCoverImg = modalEl.querySelector('.modal-cover-img');
            modalDetailImg = modalEl.querySelector('.modal-detail-img');
            return;
        }

        injectModalStyles();

        const html = `
            <div class="comparison-modal">
                <div class="close-btn">&times;</div>
                <div class="compare-wrapper">
                    <div class="compare-card">
                        <span class="compare-label">physical scene</span>
                        <img class="modal-cover-img" src="">
                    </div>
                    <div class="compare-card">
                        <span class="compare-label">SAR scene</span>
                        <img class="modal-detail-img" src="">
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);

        modalEl = document.querySelector('.comparison-modal');
        modalCoverImg = modalEl.querySelector('.modal-cover-img');
        modalDetailImg = modalEl.querySelector('.modal-detail-img');

        const closeBtn = modalEl.querySelector('.close-btn');
        const closeModal = () => {
            gsap.to(modalEl, {
                opacity: 0, duration: 0.3, onComplete: () => {
                    modalEl.style.display = 'none';
                    modalCoverImg.src = '';
                }
            });
        };
        closeBtn.onclick = closeModal;
        modalEl.onclick = (e) => {
            if (e.target === modalEl) closeModal();
        };
    }

    function createGridItem(folderName, imageList, index) {
        const item = document.createElement('div');
        item.className = 'grid-item';
        item.dataset.id = index;
        
        const coverSrc = `${CONFIG.imagePathRoot}${folderName}/${imageList[0]}`;
        
        const wrapper = document.createElement('div');
        wrapper.className = 'img-wrapper';
        const imgBase = document.createElement('img');
        imgBase.src = coverSrc; imgBase.style.zIndex = 1;
        const imgFade = document.createElement('img');
        imgFade.src = coverSrc; imgFade.style.zIndex = 2; imgFade.style.opacity = 0;
        wrapper.appendChild(imgBase); wrapper.appendChild(imgFade);
        item.appendChild(wrapper);

        const indicator = document.createElement('div');
        indicator.className = 'scrub-indicator';
        item.appendChild(indicator);

        item.addEventListener('mousemove', (e) => {
            const rect = item.getBoundingClientRect();
            let percent = (e.clientX - rect.left) / rect.width;
            percent = Math.max(0, Math.min(1, percent));
            const imgIndex = Math.floor(percent * imageList.length);
            const safeIndex = Math.min(imgIndex, imageList.length - 1);
            if (item.dataset.lastIndex != safeIndex) {
                const nextSrc = `${CONFIG.imagePathRoot}${folderName}/${imageList[safeIndex]}`;
                imgFade.src = nextSrc;
                gsap.to(imgFade, { opacity: 1, duration: 0.2, overwrite: true, onComplete: () => {
                    imgBase.src = nextSrc; imgFade.style.opacity = 0;
                }});
                item.dataset.lastIndex = safeIndex;
                indicator.style.width = `${percent * 100}%`;
            }
        });

        item.addEventListener('mouseleave', () => {
            imgFade.src = coverSrc;
            gsap.to(imgFade, { opacity: 1, duration: 0.3, onComplete: () => {
                imgBase.src = coverSrc; imgFade.style.opacity = 0;
            }});
            indicator.style.width = '0%';
        });

        item.addEventListener('click', () => toggleDrawer(item, folderName, imageList));
        container.appendChild(item);
    }

    function toggleDrawer(clickedItem, folderName, imageList) {
        
        if (activeGridItem) activeGridItem.classList.remove('is-active');
        if (activeGridItem === clickedItem) { activeGridItem = null; }
        else { clickedItem.classList.add('is-active'); activeGridItem = clickedItem; }

        
        if (currentOpenDrawer) {
            const prev = currentOpenDrawer;
            gsap.to(prev, { height: 0, opacity: 0, duration: 0.4, onComplete: () => prev.remove() });
            currentOpenDrawer = null;
            if (prev.dataset.triggerId === clickedItem.dataset.id) return;
        }

        
        const allItems = Array.from(container.querySelectorAll('.grid-item'));
        let insertAfter = allItems[allItems.length - 1];
        for (let i = 0; i < allItems.length; i++) {
            if (allItems[i].offsetTop > clickedItem.offsetTop) { insertAfter = allItems[i - 1]; break; }
        }

        const drawer = document.createElement('div');
        drawer.className = 'slit-drawer';
        drawer.dataset.triggerId = clickedItem.dataset.id;
        const content = document.createElement('div');
        content.className = 'slit-content';

        
        const detailImages = imageList.slice(1);
        const coverSrc = `${CONFIG.imagePathRoot}${folderName}/${imageList[0]}`;

        detailImages.forEach(fileName => {
            const detailImg = document.createElement('img');
            detailImg.className = 'slit-img';
            const imgSrc = `${CONFIG.imagePathRoot}${folderName}/${fileName}`;
            detailImg.src = imgSrc;
            detailImg.loading = "lazy";
            detailImg.style.cursor = "zoom-in";
            
            detailImg.onclick = function(e) {
                
                e.stopPropagation();
                showComparison(coverSrc, imgSrc);
            };

            content.appendChild(detailImg);
        });

        drawer.appendChild(content);
        if (insertAfter && insertAfter.nextSibling) container.insertBefore(drawer, insertAfter.nextSibling);
        else container.appendChild(drawer);

        currentOpenDrawer = drawer;
        gsap.to(drawer, { height: 340, opacity: 1, duration: 0.6, ease: "expo.out" });
    }

    function showComparison(coverSrc, detailSrc) {
        if (!modalEl) {
            alert("Error: Modal module not initialized. Please refresh the page and try again.");
            return;
        }
        
        console.log("Opening comparison view:", detailSrc);

        modalCoverImg.src = coverSrc;
        modalDetailImg.src = detailSrc;

        modalEl.style.display = 'flex';
        
        gsap.fromTo(modalEl, { opacity: 0 }, { opacity: 1, duration: 0.3 });
        gsap.fromTo([modalCoverImg, modalDetailImg], 
            { scale: 0.95, opacity: 0 }, 
            { scale: 1, opacity: 1, duration: 0.4, delay: 0.1, ease: "back.out(1.2)" }
        );
    }

    setTimeout(init, 50);

})();