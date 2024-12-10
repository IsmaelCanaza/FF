document.querySelectorAll('.faq-question').forEach(question => {
    question.addEventListener('click', () => {
        const answer = question.nextElementSibling;
        const isOpen = answer.classList.contains('show');
        
        // Cerrar todas las respuestas con transición rápida
        document.querySelectorAll('.faq-answer').forEach(a => {
            if (a.classList.contains('show')) {
                a.style.transition = 'max-height 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1)';
                a.classList.remove('show');
            }
        });
        document.querySelectorAll('.faq-question').forEach(q => {
            q.classList.remove('active');
        });
        
        // Abrir la respuesta clickeada si estaba cerrada
        if (!isOpen) {
            // Restaurar transición lenta para la apertura
            answer.style.transition = 'max-height 0.6s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
            setTimeout(() => {
                answer.classList.add('show');
                question.classList.add('active');
            }, 10);
        }
    });
});