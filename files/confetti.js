// https://www.npmjs.com/package/js-confetti?activeTab=readme
const jsConfetti = new JSConfetti()

function startConfetti() {
    jsConfetti.addConfetti({
        // emojis: ['👍', '😎', '😉'],
        confettiNumber: 800,
        confettiColors: [
            '#ff99c8', '#fcf6bd', '#d0f4de', '#a9def9', '#e4c1f9',
        ],
    })
}

function stopConfetti() {
    // js-confetti stoppt sich automatisch
}
