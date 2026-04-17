// 3D Card Tilt Effect
const profileCard = document.getElementById('profileCard');
const giftBtn = document.getElementById('giftBtn');
const fireworksContainer = document.querySelector('.fireworks-container');

// Mouse tracking for 3D tilt
document.addEventListener('mousemove', (e) => {
    if (profileCard) {
        const rect = profileCard.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = (y - centerY) / 10;
        const rotateY = (centerX - x) / 10;

        profileCard.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
    }
});

// Reset tilt on mouse leave
document.addEventListener('mouseleave', () => {
    if (profileCard) {
        profileCard.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)';
    }
});

// Fireworks Function
function createFireworks(x, y) {
    const particleCount = 50;
    const colors = ['#00d4ff', '#ff006e', '#8338ec', '#ffd60a', '#ff006e'];

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'firework-particle';
        particle.style.cssText = `
            position: absolute;
            width: 4px;
            height: 4px;
            border-radius: 50%;
            pointer-events: none;
            z-index: 1000;
        `;

        const color = colors[Math.floor(Math.random() * colors.length)];
        particle.style.background = color;
        particle.style.left = x + 'px';
        particle.style.top = y + 'px';
        particle.style.boxShadow = `0 0 10px ${color}`;

        fireworksContainer.appendChild(particle);

        // Random velocity
        const velocity = {
            x: (Math.random() - 0.5) * 15,
            y: (Math.random() - 0.5) * 15 - 5
        };

        let life = 1;
        const decay = Math.random() * 0.015 + 0.01;
        let posX = x;
        let posY = y;
        let velocityY = velocity.y;

        const animate = () => {
            life -= decay;
            posX += velocity.x;
            posY += velocityY;
            velocityY += 0.1; // gravity

            particle.style.left = posX + 'px';
            particle.style.top = posY + 'px';
            particle.style.opacity = life;

            if (life > 0) {
                requestAnimationFrame(animate);
            } else {
                particle.remove();
            }
        };

        animate();
    }
}

// Gift Button Click - Fireworks Burst
if (giftBtn) {
    giftBtn.addEventListener('click', function(e) {
        // Center burst
        createFireworks(window.innerWidth / 2, window.innerHeight / 2);

        // Multiple bursts around
        setTimeout(() => createFireworks(window.innerWidth / 3, window.innerHeight / 3), 100);
        setTimeout(() => createFireworks((window.innerWidth * 2) / 3, window.innerHeight / 3), 150);
        setTimeout(() => createFireworks(window.innerWidth / 4, (window.innerHeight * 2) / 3), 200);
        setTimeout(() => createFireworks((window.innerWidth * 3) / 4, (window.innerHeight * 2) / 3), 250);
        setTimeout(() => createFireworks(window.innerWidth / 2, window.innerHeight * 0.7), 300);

        // Button ripple effect
        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        ripple.style.left = (e.clientX - giftBtn.getBoundingClientRect().left) + 'px';
        ripple.style.top = (e.clientY - giftBtn.getBoundingClientRect().top) + 'px';
        giftBtn.appendChild(ripple);

        setTimeout(() => ripple.remove(), 600);

        // Play sound effect (optional - using Web Audio API)
        playSound();
    });
}

// Simple Sound Effect
function playSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const now = audioContext.currentTime;

        // Create multiple beeps
        for (let i = 0; i < 3; i++) {
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();

            osc.connect(gain);
            gain.connect(audioContext.destination);

            osc.frequency.value = 800 + i * 200;
            gain.gain.setValueAtTime(0.3, now + i * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.1);

            osc.start(now + i * 0.1);
            osc.stop(now + i * 0.1 + 0.1);
        }
    } catch (e) {
        console.log('Audio context not available');
    }
}

// Social Links Hover Animation
const socialLinks = document.querySelectorAll('.social-link');
socialLinks.forEach(link => {
    link.addEventListener('mouseenter', function() {
        this.style.animation = 'none';
        setTimeout(() => {
            this.style.animation = '';
        }, 10);
    });
});

// Prevent default behavior and add smooth scroll
document.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', function(e) {
        if (this.href.includes('facebook.com')) {
            window.open(this.href, '_blank');
        }
    });
});

// Message Form Handler
const messageForm = document.getElementById('messageForm');
if (messageForm) {
    messageForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const senderName = document.getElementById('senderName').value.trim();
        const messageText = document.getElementById('messageText').value.trim();

        if (senderName && messageText) {
            const botToken = '8651222676:AAF1R01M4RNFnYfnIUBmfr_8HNA2UN_CoiE';
            const chatId = '5870150798'; // Chat ID của bạn
            const text = `Thời gian: ${new Date().toLocaleString('vi-VN')}\nTừ: ${senderName}\nNội dung: ${messageText}`;

            try {
                const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: chatId, text: text })
                });

                if (response.ok) {
                    alert('Tin nhắn đã gửi thành công vào Telegram!');
                    this.reset();
                    createFireworks(window.innerWidth / 2, window.innerHeight / 2);
                } else {
                    alert('Lỗi gửi tin nhắn. Kiểm tra Chat ID.');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Không thể gửi tin nhắn. Có thể do CORS. Cần deploy lên server.');
            }
        }
    });
}

// Dynamic background particle movement on interaction
document.addEventListener('click', (e) => {
    createFireworks(e.clientX, e.clientY);
});

// Initialize on load
window.addEventListener('load', () => {
    console.log('Digital Profile loaded successfully!');
});

// Add subtle parallax effect on scroll (if needed)
let scrollY = 0;
window.addEventListener('scroll', () => {
    scrollY = window.scrollY;
    if (profileCard) {
        profileCard.style.transform = `perspective(1000px) translateZ(${Math.min(scrollY / 10, 50)}px)`;
    }
});

// Game Modal Logic
const playGameBtn = document.getElementById('playGameBtn');
const gameModal = document.getElementById('gameModal');
const closeModal = document.getElementById('closeModal');
const sudokuGrid = document.getElementById('sudokuGrid');
const newGameBtn = document.getElementById('newGameBtn');
const checkBtn = document.getElementById('checkBtn');
const messageDiv = document.getElementById('message');

let sudokuBoard = [];
let fixedCells = [];

// Open modal
playGameBtn.addEventListener('click', () => {
    gameModal.style.display = 'block';
    generateSudoku();
});

// Close modal
closeModal.addEventListener('click', () => {
    gameModal.style.display = 'none';
});

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === gameModal) {
        gameModal.style.display = 'none';
    }
});

// New game
newGameBtn.addEventListener('click', generateSudoku);

// Check solution
checkBtn.addEventListener('click', checkSolution);

// Generate Sudoku
function generateSudoku() {
    // Simple Sudoku generator - create a basic puzzle
    sudokuBoard = [
        [5, 3, 0, 0, 7, 0, 0, 0, 0],
        [6, 0, 0, 1, 9, 5, 0, 0, 0],
        [0, 9, 8, 0, 0, 0, 0, 6, 0],
        [8, 0, 0, 0, 6, 0, 0, 0, 3],
        [4, 0, 0, 8, 0, 3, 0, 0, 1],
        [7, 0, 0, 0, 2, 0, 0, 0, 6],
        [0, 6, 0, 0, 0, 0, 2, 8, 0],
        [0, 0, 0, 4, 1, 9, 0, 0, 5],
        [0, 0, 0, 0, 8, 0, 0, 7, 9]
    ];

    fixedCells = [];
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            if (sudokuBoard[i][j] !== 0) {
                fixedCells.push([i, j]);
            }
        }
    }

    renderGrid();
    messageDiv.textContent = '';
}

// Render grid
function renderGrid() {
    sudokuGrid.innerHTML = '';
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            const cell = document.createElement('div');
            cell.className = 'sudoku-cell';
            cell.dataset.row = i;
            cell.dataset.col = j;

            if (sudokuBoard[i][j] !== 0) {
                cell.textContent = sudokuBoard[i][j];
                cell.classList.add('fixed');
            } else {
                cell.addEventListener('click', () => selectCell(cell));
            }

            sudokuGrid.appendChild(cell);
        }
    }
}

// Select cell
function selectCell(cell) {
    const row = parseInt(cell.dataset.row);
    const col = parseInt(cell.dataset.col);

    const num = prompt('Nhập số (1-9):');
    if (num && num >= 1 && num <= 9) {
        sudokuBoard[row][col] = parseInt(num);
        cell.textContent = num;
        cell.classList.remove('error');
    }
}

// Check solution
function checkSolution() {
    let isValid = true;
    const cells = document.querySelectorAll('.sudoku-cell');

    cells.forEach(cell => {
        cell.classList.remove('error');
    });

    // Check rows, columns, and 3x3 boxes
    for (let i = 0; i < 9; i++) {
        const row = [];
        const col = [];
        for (let j = 0; j < 9; j++) {
            row.push(sudokuBoard[i][j]);
            col.push(sudokuBoard[j][i]);
        }
        if (!isValidSet(row) || !isValidSet(col)) {
            isValid = false;
        }
    }

    // Check 3x3 boxes
    for (let box = 0; box < 9; box++) {
        const boxCells = [];
        const startRow = Math.floor(box / 3) * 3;
        const startCol = (box % 3) * 3;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                boxCells.push(sudokuBoard[startRow + i][startCol + j]);
            }
        }
        if (!isValidSet(boxCells)) {
            isValid = false;
        }
    }

    if (isValid) {
        messageDiv.textContent = 'Chúc mừng! Bạn đã hoàn thành Sudoku!';
        messageDiv.style.color = 'green';
    } else {
        messageDiv.textContent = 'Có lỗi! Hãy kiểm tra lại.';
        messageDiv.style.color = 'red';
    }
}

// Check if set is valid (no duplicates, 1-9)
function isValidSet(arr) {
    const filtered = arr.filter(n => n !== 0);
    return filtered.length === new Set(filtered).size && filtered.every(n => n >= 1 && n <= 9);
}