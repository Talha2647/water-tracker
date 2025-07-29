class WaterTracker {
    constructor() {
        this.data = this.loadData();
        this.reminderInterval = null;
        this.reminderEnabled = true;
        this.lastReminderTime = null;
        
        this.initializeElements();
        this.bindEvents();
        this.updateDisplay();
        this.generateGlasses();
        this.updateDateTime();
        this.startReminderSystem();
        
        // Update time every second
        setInterval(() => this.updateDateTime(), 1000);
        setInterval(() => this.updateReminderCountdown(), 1000);
    }

    initializeElements() {
        // Goal elements
        this.dailyGoalInput = document.getElementById('dailyGoal');
        this.setGoalButton = document.getElementById('setGoal');
        this.dailyGoalDisplay = document.getElementById('dailyGoalDisplay');

        // Progress elements
        this.glassesConsumedEl = document.getElementById('glassesConsumed');
        this.progressPercentageEl = document.getElementById('progressPercentage');
        this.progressRing = document.querySelector('.progress-ring-circle');

        // Action elements
        this.drinkButton = document.getElementById('drinkButton');
        this.undoButton = document.getElementById('undoButton');

        // Glass visualization
        this.glassesContainer = document.getElementById('glassesContainer');

        // Stats elements
        this.lastDrinkTimeEl = document.getElementById('lastDrinkTime');
        this.streakDaysEl = document.getElementById('streakDays');
        this.weeklyAverageEl = document.getElementById('weeklyAverage');

        // Reminder elements
        this.nextReminderTimeEl = document.getElementById('nextReminderTime');
        this.reminderCountdownEl = document.getElementById('reminderCountdown');
        this.reminderToggle = document.getElementById('reminderToggle');

        // Notification modal
        this.notificationModal = document.getElementById('notificationModal');
        this.drinkNowButton = document.getElementById('drinkNowButton');
        this.snoozeButton = document.getElementById('snoozeButton');

        // Success animation
        this.successAnimation = document.getElementById('successAnimation');

        // Date/time elements
        this.currentDateEl = document.getElementById('currentDate');
        this.currentTimeEl = document.getElementById('currentTime');
    }

    bindEvents() {
        this.setGoalButton.addEventListener('click', () => this.setDailyGoal());
        this.drinkButton.addEventListener('click', () => this.drinkWater());
        this.undoButton.addEventListener('click', () => this.undoLastDrink());
        this.reminderToggle.addEventListener('click', () => this.toggleReminders());
        this.drinkNowButton.addEventListener('click', () => this.handleDrinkNow());
        this.snoozeButton.addEventListener('click', () => this.snoozeReminder());

        // Allow Enter key to set goal
        this.dailyGoalInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.setDailyGoal();
            }
        });

        // Close modal when clicking outside
        this.notificationModal.addEventListener('click', (e) => {
            if (e.target === this.notificationModal) {
                this.closeNotification();
            }
        });
    }

    loadData() {
        const savedData = localStorage.getItem('waterTrackerData');
        const defaultData = {
            dailyGoal: 8,
            todayConsumption: 0,
            lastDrinkTime: null,
            drinkHistory: [],
            streak: 0,
            weeklyData: []
        };

        if (savedData) {
            const data = JSON.parse(savedData);
            // Check if it's a new day
            const today = new Date().toDateString();
            const lastDay = data.lastDay;
            
            if (today !== lastDay) {
                // New day - reset daily consumption but keep history
                data.weeklyData.push({
                    date: lastDay || today,
                    consumption: data.todayConsumption || 0
                });
                
                // Keep only last 7 days
                data.weeklyData = data.weeklyData.slice(-7);
                
                // Update streak
                if (data.todayConsumption >= data.dailyGoal) {
                    data.streak = (data.streak || 0) + 1;
                } else {
                    data.streak = 0;
                }
                
                data.todayConsumption = 0;
                data.lastDrinkTime = null;
                data.drinkHistory = [];
            }
            
            data.lastDay = today;
            return data;
        }

        return { ...defaultData, lastDay: new Date().toDateString() };
    }

    saveData() {
        localStorage.setItem('waterTrackerData', JSON.stringify(this.data));
    }

    setDailyGoal() {
        const newGoal = parseInt(this.dailyGoalInput.value);
        if (newGoal >= 1 && newGoal <= 20) {
            this.data.dailyGoal = newGoal;
            this.saveData();
            this.updateDisplay();
            this.generateGlasses();
            this.showSuccessAnimation('Goal updated!');
        }
    }

    drinkWater() {
        const now = new Date();
        this.data.todayConsumption++;
        this.data.lastDrinkTime = now.getTime();
        this.data.drinkHistory.push(now.getTime());
        
        this.saveData();
        this.updateDisplay();
        this.updateGlasses();
        this.showSuccessAnimation();
        
        // Reset reminder timer
        this.lastReminderTime = now;
        this.updateNextReminderTime();
        
        // Check if goal is reached
        if (this.data.todayConsumption >= this.data.dailyGoal) {
            setTimeout(() => {
                this.showSuccessAnimation('🎉 Daily goal achieved! Great job!');
            }, 1000);
        }
    }

    undoLastDrink() {
        if (this.data.todayConsumption > 0) {
            this.data.todayConsumption--;
            this.data.drinkHistory.pop();
            
            // Update last drink time
            if (this.data.drinkHistory.length > 0) {
                this.data.lastDrinkTime = this.data.drinkHistory[this.data.drinkHistory.length - 1];
            } else {
                this.data.lastDrinkTime = null;
            }
            
            this.saveData();
            this.updateDisplay();
            this.updateGlasses();
        }
    }

    updateDisplay() {
        // Update goal display
        this.dailyGoalDisplay.textContent = this.data.dailyGoal;
        this.dailyGoalInput.value = this.data.dailyGoal;

        // Update progress
        this.glassesConsumedEl.textContent = this.data.todayConsumption;
        
        const percentage = Math.round((this.data.todayConsumption / this.data.dailyGoal) * 100);
        this.progressPercentageEl.textContent = `${Math.min(percentage, 100)}%`;

        // Update progress ring
        const circumference = 2 * Math.PI * 80; // radius = 80
        const strokeDasharray = circumference;
        const strokeDashoffset = circumference - (percentage / 100 * circumference);
        
        this.progressRing.style.strokeDasharray = strokeDasharray;
        this.progressRing.style.strokeDashoffset = strokeDashoffset;
        this.progressRing.style.stroke = percentage >= 100 ? '#4facfe' : '#4facfe';

        // Update stats
        this.updateStats();
    }

    updateStats() {
        // Last drink time
        if (this.data.lastDrinkTime) {
            const lastDrink = new Date(this.data.lastDrinkTime);
            this.lastDrinkTimeEl.textContent = lastDrink.toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        } else {
            this.lastDrinkTimeEl.textContent = '--:--';
        }

        // Streak
        this.streakDaysEl.textContent = this.data.streak || 0;

        // Weekly average
        if (this.data.weeklyData.length > 0) {
            const weeklyAvg = this.data.weeklyData.reduce((sum, day) => sum + day.consumption, 0) / this.data.weeklyData.length;
            this.weeklyAverageEl.textContent = Math.round(weeklyAvg);
        } else {
            this.weeklyAverageEl.textContent = '0';
        }
    }

    generateGlasses() {
        this.glassesContainer.innerHTML = '';
        
        for (let i = 1; i <= this.data.dailyGoal; i++) {
            const glass = document.createElement('div');
            glass.className = 'water-glass';
            glass.innerHTML = `<span class="glass-number">${i}</span>`;
            
            if (i <= this.data.todayConsumption) {
                glass.classList.add('filled');
            }
            
            glass.addEventListener('click', () => {
                if (i === this.data.todayConsumption + 1) {
                    this.drinkWater();
                }
            });
            
            this.glassesContainer.appendChild(glass);
        }
    }

    updateGlasses() {
        const glasses = this.glassesContainer.querySelectorAll('.water-glass');
        glasses.forEach((glass, index) => {
            if (index < this.data.todayConsumption) {
                glass.classList.add('filled');
            } else {
                glass.classList.remove('filled');
            }
        });
    }

    updateDateTime() {
        const now = new Date();
        
        this.currentDateEl.textContent = now.toLocaleDateString([], {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        this.currentTimeEl.textContent = now.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    startReminderSystem() {
        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        this.lastReminderTime = new Date();
        this.updateNextReminderTime();
        
        // Check for reminders every minute
        setInterval(() => {
            this.checkReminder();
        }, 60000);
    }

    checkReminder() {
        if (!this.reminderEnabled) return;
        
        const now = new Date();
        const timeSinceLastReminder = now - this.lastReminderTime;
        const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
        
        if (timeSinceLastReminder >= oneHour) {
            this.showReminder();
            this.lastReminderTime = now;
            this.updateNextReminderTime();
        }
    }

    showReminder() {
        // Show modal
        this.notificationModal.classList.add('show');
        
        // Show browser notification if permission granted
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Hydro Tracker - Time to Hydrate!', {
                body: "It's been an hour since your last drink. Time for some water!",
                icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIj48cGF0aCBmaWxsPSIjNGZhY2ZlIiBkPSJNMzY4IDEyOGMwIDQ0LjM3LTEwMC4yOSAxNzUuNzgtMTEyIDIwMmMtMTEuNzEtMjYuMjItMTEyLTE1Ny42My0xMTItMjAyQzE0NCA1Ny4zOCAyMDAuNDMgMCAyNTYgMFMzNjggNTcuMzggMzY4IDEyOHoiLz48L3N2Zz4='
            });
        }
        
        // Play a gentle sound (optional)
        this.playNotificationSound();
    }

    playNotificationSound() {
        // Create a gentle water drop sound using Web Audio API
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.3);
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (error) {
            console.log('Audio notification not available');
        }
    }

    handleDrinkNow() {
        this.closeNotification();
        this.drinkWater();
    }

    snoozeReminder() {
        this.closeNotification();
        this.lastReminderTime = new Date(Date.now() - (50 * 60 * 1000)); // Snooze for 10 minutes
        this.updateNextReminderTime();
    }

    closeNotification() {
        this.notificationModal.classList.remove('show');
    }

    toggleReminders() {
        this.reminderEnabled = !this.reminderEnabled;
        const icon = this.reminderToggle.querySelector('i');
        
        if (this.reminderEnabled) {
            icon.className = 'fas fa-toggle-on';
            this.reminderToggle.classList.remove('disabled');
            this.lastReminderTime = new Date();
        } else {
            icon.className = 'fas fa-toggle-off';
            this.reminderToggle.classList.add('disabled');
        }
        
        this.updateNextReminderTime();
    }

    updateNextReminderTime() {
        if (!this.reminderEnabled) {
            this.nextReminderTimeEl.textContent = 'Disabled';
            this.reminderCountdownEl.textContent = '';
            return;
        }
        
        const nextReminder = new Date(this.lastReminderTime.getTime() + (60 * 60 * 1000));
        this.nextReminderTimeEl.textContent = nextReminder.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    updateReminderCountdown() {
        if (!this.reminderEnabled) return;
        
        const now = new Date();
        const nextReminder = new Date(this.lastReminderTime.getTime() + (60 * 60 * 1000));
        const timeLeft = nextReminder - now;
        
        if (timeLeft > 0) {
            const minutes = Math.floor(timeLeft / (1000 * 60));
            const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
            this.reminderCountdownEl.textContent = `in ${minutes}m ${seconds}s`;
        } else {
            this.reminderCountdownEl.textContent = 'Due now!';
        }
    }

    showSuccessAnimation(customText = null) {
        const textEl = this.successAnimation.querySelector('.success-text');
        textEl.textContent = customText || 'Great job!';
        
        this.successAnimation.classList.add('show');
        
        setTimeout(() => {
            this.successAnimation.classList.remove('show');
        }, 1000);
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new WaterTracker();
});

// Service Worker registration for PWA functionality (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}
