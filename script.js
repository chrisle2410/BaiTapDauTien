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

// Optimized Fireworks Function
function createFireworks(x, y) {
    const particleCount = 80;
    const colors = [
        '#FF0000', '#FF4500', '#FFD700', '#FFFF00', '#FF1493', '#FF69B4',
        '#00FF7F', '#00CED1', '#1E90FF', '#9370DB', '#FF6347', '#FFA500',
        '#DC143C', '#FF00FF', '#00FFFF', '#ADFF2F', '#FF8C00', '#FF0000'
    ];

    const angleStep = (Math.PI * 2) / particleCount;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'firework-particle';
        const color = colors[Math.floor(Math.random() * colors.length)];
        const size = Math.random() * 8 + 6;
        const angle = i * angleStep + (Math.random() * 0.3 - 0.15);
        const radius = Math.random() * 120 + 80;

        const targetX = x + Math.cos(angle) * radius;
        const targetY = y + Math.sin(angle) * radius;

        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.background = `radial-gradient(circle, ${color}, ${color}80, transparent)`;
        particle.style.boxShadow = `
            0 0 ${size * 2}px ${color},
            0 0 ${size * 3}px ${color}80,
            0 0 ${size * 4}px ${color}40,
            inset 0 0 ${size}px rgba(255, 255, 255, 0.8)
        `;
        particle.style.left = `${x}px`;
        particle.style.top = `${y}px`;
        particle.style.transform = 'translate(0, 0) scale(0.1) rotate(0deg)';
        particle.style.animation = `particle-burst ${0.8 + Math.random() * 0.4}s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`;

        fireworksContainer.appendChild(particle);

        requestAnimationFrame(() => {
            particle.style.transform = `translate(${targetX - x}px, ${targetY - y}px) scale(1) rotate(${Math.random() * 360}deg)`;
        });

        particle.addEventListener('animationend', () => particle.remove());
    }

    // Add sparkle trail effect
    for (let i = 0; i < 15; i++) {
        setTimeout(() => {
            const sparkle = document.createElement('div');
            sparkle.className = 'firework-particle';
            const sparkleColor = colors[Math.floor(Math.random() * colors.length)];
            const sparkleSize = Math.random() * 4 + 2;

            sparkle.style.width = `${sparkleSize}px`;
            sparkle.style.height = `${sparkleSize}px`;
            sparkle.style.background = sparkleColor;
            sparkle.style.boxShadow = `0 0 ${sparkleSize * 3}px ${sparkleColor}`;
            sparkle.style.left = `${x + (Math.random() - 0.5) * 200}px`;
            sparkle.style.top = `${y + (Math.random() - 0.5) * 200}px`;
            sparkle.style.animation = `particle-burst ${0.3 + Math.random() * 0.3}s ease-out forwards`;

            fireworksContainer.appendChild(sparkle);
            sparkle.addEventListener('animationend', () => sparkle.remove());
        }, i * 50);
    }
}

// Gift Button Click - Enhanced Fireworks Burst
if (giftBtn) {
    giftBtn.addEventListener('click', function(e) {
        // Center burst
        createFireworks(window.innerWidth / 2, window.innerHeight / 2);

        // A few bursts around to fill the sky without heavy load
        const positions = [
            { x: window.innerWidth / 3, y: window.innerHeight / 3, time: 80 },
            { x: (window.innerWidth * 2) / 3, y: window.innerHeight / 3, time: 160 },
            { x: window.innerWidth / 2, y: window.innerHeight * 0.7, time: 240 }
        ];

        positions.forEach(pos => {
            setTimeout(() => {
                createFireworks(pos.x, pos.y);
            }, pos.time);
        });

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

// Dynamic background particle movement on interaction - Enhanced
document.addEventListener('click', (e) => {
    // Check if clicking on a button or input
    if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
    }
    
    // Create main burst at click location
    createFireworks(e.clientX, e.clientY);
    
    // Create 3 additional bursts around the click point for more visual impact
    setTimeout(() => {
        createFireworks(e.clientX + 50, e.clientY - 50);
    }, 50);
    
    setTimeout(() => {
        createFireworks(e.clientX - 50, e.clientY + 50);
    }, 100);
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
const memoryGrid = document.getElementById('memoryGrid');
const newGameBtn = document.getElementById('newGameBtn');
const messageDiv = document.getElementById('message');
const movesDisplay = document.getElementById('moves');
const matchedDisplay = document.getElementById('matched');

const animals = ['🐱', '🐶', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼'];
let gameCards = [];
let flipped = [];
let matched = 0;
let moves = 0;
let isChecking = false;

// Open modal
playGameBtn.addEventListener('click', () => {
    gameModal.style.display = 'block';
    initializeGame();
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
newGameBtn.addEventListener('click', initializeGame);

// Initialize game
function initializeGame() {
    gameCards = [];
    flipped = [];
    matched = 0;
    moves = 0;
    isChecking = false;
    messageDiv.textContent = '';
    movesDisplay.textContent = '0';
    matchedDisplay.textContent = '0';

    // Create pairs
    const pairs = [...animals, ...animals];
    pairs.sort(() => Math.random() - 0.5);

    gameCards = pairs.map((animal, index) => ({
        id: index,
        animal: animal,
        flipped: false,
        matched: false
    }));

    renderMemoryGrid();
}

// Render memory grid
function renderMemoryGrid() {
    memoryGrid.innerHTML = '';
    gameCards.forEach(card => {
        const cardEl = document.createElement('div');
        cardEl.className = 'memory-card';
        cardEl.textContent = card.flipped || card.matched ? card.animal : '?';
        cardEl.style.cursor = card.matched ? 'default' : 'pointer';

        if (card.flipped) cardEl.classList.add('flipped');
        if (card.matched) cardEl.classList.add('matched');

        cardEl.addEventListener('click', () => flipCard(card, cardEl));
        memoryGrid.appendChild(cardEl);
    });
}

// Flip card
function flipCard(card, cardEl) {
    if (isChecking || card.flipped || card.matched) return;

    card.flipped = true;
    cardEl.textContent = card.animal;
    cardEl.classList.add('flipped');
    flipped.push(card);

    if (flipped.length === 2) {
        moves++;
        movesDisplay.textContent = moves;
        isChecking = true;
        checkMatch();
    }
}

// Check match
function checkMatch() {
    const [card1, card2] = flipped;

    if (card1.animal === card2.animal) {
        card1.matched = true;
        card2.matched = true;
        matched++;
        matchedDisplay.textContent = matched;
        flipped = [];
        isChecking = false;

        if (matched === 8) {
            messageDiv.textContent = `🎉 Chúc mừng! Bạn thắng trong ${moves} lần lật!`;
            messageDiv.style.color = '#90EE90';
        }
        renderMemoryGrid();
    } else {
        setTimeout(() => {
            card1.flipped = false;
            card2.flipped = false;
            flipped = [];
            isChecking = false;
            renderMemoryGrid();
        }, 1000);
    }
}