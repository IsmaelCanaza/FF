const track = document.querySelector('.carousel-track');
const items = Array.from(track.children);
const indicators = document.querySelectorAll('.indicator');

let currentIndex = 0;

function cloneItems() {
    const firstClone = items[0].cloneNode(true);
    const lastClone = items[items.length - 1].cloneNode(true);
    track.appendChild(firstClone);
    track.insertBefore(lastClone, items[0]);
}

function updateCarousel() {
    const width = items[0].getBoundingClientRect().width;
    track.style.transform = `translateX(-${(currentIndex + 1) * width}px)`;
    indicators.forEach((indicator, index) => {
        indicator.classList.toggle('active', index === currentIndex);
    });
}

function moveToIndex(index) {
    currentIndex = index;
    updateCarousel();
}

indicators.forEach((indicator) => {
    indicator.addEventListener('click', (e) => {
        const index = parseInt(e.target.getAttribute('data-index'), 10);
        moveToIndex(index);
    });
});

function moveCarousel() {
    const width = items[0].getBoundingClientRect().width;
    currentIndex++;
    track.style.transition = 'transform 0.5s ease-in-out';
    track.style.transform = `translateX(-${(currentIndex + 1) * width}px)`;

    if (currentIndex >= items.length) {
        setTimeout(() => {
            track.style.transition = 'none';
            currentIndex = 0;
            track.style.transform = `translateX(-${(currentIndex + 1) * width}px)`;
        }, 500);
    }

    if (currentIndex < 0) {
        setTimeout(() => {
            track.style.transition = 'none';
            currentIndex = items.length - 1;
            track.style.transform = `translateX(-${(currentIndex + 1) * width}px)`;
        }, 500);
    }

    indicators.forEach((indicator, index) => {
        indicator.classList.toggle('active', index === currentIndex);
    });
}

setInterval(moveCarousel, 5000); // Change slide every 3 seconds

window.addEventListener('resize', updateCarousel);

cloneItems();
updateCarousel();