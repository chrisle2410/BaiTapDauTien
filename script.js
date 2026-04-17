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